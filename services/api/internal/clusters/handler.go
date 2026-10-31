package clusters

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"
)

// Handler exposes Service over HTTP. It holds no business logic itself —
// every request is a thin translation to and from Service.
type Handler struct {
	service *Service
}

// NewHandler wraps service for HTTP use.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Register registers the HTTP routes this Handler serves onto mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/clusters", h.create)
	mux.HandleFunc("GET /api/v1/clusters", h.list)
	mux.HandleFunc("GET /api/v1/clusters/{id}", h.get)
	mux.HandleFunc("DELETE /api/v1/clusters/{id}", h.delete)
}

type registerRequestBody struct {
	Kubeconfig  string            `json:"kubeconfig"`
	Context     string            `json:"context,omitempty"`
	DisplayName string            `json:"displayName,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

type clusterResponseBody struct {
	ID                string            `json:"id"`
	DisplayName       string            `json:"displayName"`
	Context           string            `json:"context"`
	KubernetesVersion string            `json:"kubernetesVersion"`
	ConnectionStatus  ConnectionStatus  `json:"connectionStatus"`
	Health            Health            `json:"health"`
	NodeCount         int               `json:"nodeCount"`
	PodCount          int               `json:"podCount"`
	LastSeen          *time.Time        `json:"lastSeen"`
	Metadata          map[string]string `json:"metadata,omitempty"`
}

func toResponseBody(c Cluster) clusterResponseBody {
	return clusterResponseBody{
		ID:                c.ID,
		DisplayName:       c.DisplayName,
		Context:           c.Context,
		KubernetesVersion: c.KubernetesVersion,
		ConnectionStatus:  c.ConnectionStatus,
		Health:            c.Health,
		NodeCount:         c.NodeCount,
		PodCount:          c.PodCount,
		LastSeen:          c.LastSeen,
		Metadata:          c.Metadata,
	}
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var body registerRequestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	cluster, err := h.service.Register(r.Context(), RegisterRequest{
		Kubeconfig:  body.Kubeconfig,
		Context:     body.Context,
		DisplayName: body.DisplayName,
		Metadata:    body.Metadata,
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, toResponseBody(cluster))
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	clusters := h.service.List()
	out := make([]clusterResponseBody, 0, len(clusters))
	for _, c := range clusters {
		out = append(out, toResponseBody(c))
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	cluster, err := h.service.Get(r.PathValue("id"))
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, "cluster not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, toResponseBody(cluster))
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	err := h.service.Remove(r.PathValue("id"))
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, "cluster not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
