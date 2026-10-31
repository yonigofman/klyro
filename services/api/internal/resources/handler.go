package resources

import (
	"errors"
	"net/http"
	"time"

	corev1 "k8s.io/api/core/v1"

	"github.com/yonigofman/klyro/services/api/internal/httputil"
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
	mux.HandleFunc("GET /api/v1/clusters/{clusterId}/namespaces", h.listNamespaces)
	mux.HandleFunc("GET /api/v1/clusters/{clusterId}/pods", h.listPods)
}

type namespaceResponseBody struct {
	Name      string                `json:"name"`
	Status    corev1.NamespacePhase `json:"status"`
	CreatedAt time.Time             `json:"createdAt"`
}

type podResponseBody struct {
	Name      string          `json:"name"`
	Namespace string          `json:"namespace"`
	Phase     corev1.PodPhase `json:"phase"`
	Ready     string          `json:"ready"`
	Restarts  int32           `json:"restarts"`
	Node      string          `json:"node"`
	CreatedAt time.Time       `json:"createdAt"`
}

func (h *Handler) listNamespaces(w http.ResponseWriter, r *http.Request) {
	namespaces, err := h.service.ListNamespaces(r.Context(), r.PathValue("clusterId"))
	if writeServiceError(w, err) {
		return
	}

	out := make([]namespaceResponseBody, 0, len(namespaces))
	for _, ns := range namespaces {
		out = append(out, namespaceResponseBody{Name: ns.Name, Status: ns.Status, CreatedAt: ns.CreatedAt})
	}
	httputil.WriteJSON(w, http.StatusOK, out)
}

func (h *Handler) listPods(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	pods, err := h.service.ListPods(r.Context(), r.PathValue("clusterId"), namespace)
	if writeServiceError(w, err) {
		return
	}

	out := make([]podResponseBody, 0, len(pods))
	for _, pod := range pods {
		out = append(out, podResponseBody{
			Name:      pod.Name,
			Namespace: pod.Namespace,
			Phase:     pod.Phase,
			Ready:     pod.Ready,
			Restarts:  pod.Restarts,
			Node:      pod.Node,
			CreatedAt: pod.CreatedAt,
		})
	}
	httputil.WriteJSON(w, http.StatusOK, out)
}

// writeServiceError writes the appropriate response for a Service error and
// reports whether it did — the caller should return immediately if so.
func writeServiceError(w http.ResponseWriter, err error) bool {
	switch {
	case err == nil:
		return false
	case errors.Is(err, ErrClusterNotFound):
		httputil.WriteError(w, http.StatusNotFound, "cluster not found")
	case errors.Is(err, ErrInvalidNamespace):
		httputil.WriteError(w, http.StatusBadRequest, "invalid namespace")
	default:
		httputil.WriteError(w, http.StatusBadGateway, err.Error())
	}
	return true
}
