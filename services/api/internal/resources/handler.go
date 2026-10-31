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
	mux.HandleFunc("GET /api/v1/clusters/{clusterId}/workloads", h.listWorkloads)
	mux.HandleFunc("GET /api/v1/clusters/{clusterId}/services", h.listServices)
	mux.HandleFunc("GET /api/v1/clusters/{clusterId}/ingresses", h.listIngresses)
	mux.HandleFunc("GET /api/v1/clusters/{clusterId}/nodes", h.listNodes)
	mux.HandleFunc("GET /api/v1/clusters/{clusterId}/events", h.listEvents)
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

type workloadResponseBody struct {
	Kind      WorkloadKind `json:"kind"`
	Name      string       `json:"name"`
	Namespace string       `json:"namespace"`
	Desired   int32        `json:"desired"`
	Ready     int32        `json:"ready"`
	CreatedAt time.Time    `json:"createdAt"`
}

type serviceResponseBody struct {
	Name      string             `json:"name"`
	Namespace string             `json:"namespace"`
	Type      corev1.ServiceType `json:"type"`
	ClusterIP string             `json:"clusterIP"`
	Ports     []string           `json:"ports"`
	CreatedAt time.Time          `json:"createdAt"`
}

type ingressResponseBody struct {
	Name      string    `json:"name"`
	Namespace string    `json:"namespace"`
	Hosts     []string  `json:"hosts"`
	CreatedAt time.Time `json:"createdAt"`
}

type nodeResponseBody struct {
	Name              string    `json:"name"`
	Ready             bool      `json:"ready"`
	KubernetesVersion string    `json:"kubernetesVersion"`
	CreatedAt         time.Time `json:"createdAt"`
}

type eventResponseBody struct {
	Type               string    `json:"type"`
	Reason             string    `json:"reason"`
	Message            string    `json:"message"`
	InvolvedObjectKind string    `json:"involvedObjectKind"`
	InvolvedObjectName string    `json:"involvedObjectName"`
	Namespace          string    `json:"namespace"`
	Count              int32     `json:"count"`
	LastSeen           time.Time `json:"lastSeen"`
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

func (h *Handler) listWorkloads(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	workloads, err := h.service.ListWorkloads(r.Context(), r.PathValue("clusterId"), namespace)
	if writeServiceError(w, err) {
		return
	}

	out := make([]workloadResponseBody, 0, len(workloads))
	for _, wl := range workloads {
		out = append(out, workloadResponseBody{
			Kind:      wl.Kind,
			Name:      wl.Name,
			Namespace: wl.Namespace,
			Desired:   wl.Desired,
			Ready:     wl.Ready,
			CreatedAt: wl.CreatedAt,
		})
	}
	httputil.WriteJSON(w, http.StatusOK, out)
}

func (h *Handler) listServices(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	services, err := h.service.ListServices(r.Context(), r.PathValue("clusterId"), namespace)
	if writeServiceError(w, err) {
		return
	}

	out := make([]serviceResponseBody, 0, len(services))
	for _, svc := range services {
		out = append(out, serviceResponseBody{
			Name:      svc.Name,
			Namespace: svc.Namespace,
			Type:      svc.Type,
			ClusterIP: svc.ClusterIP,
			Ports:     svc.Ports,
			CreatedAt: svc.CreatedAt,
		})
	}
	httputil.WriteJSON(w, http.StatusOK, out)
}

func (h *Handler) listIngresses(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	ingresses, err := h.service.ListIngresses(r.Context(), r.PathValue("clusterId"), namespace)
	if writeServiceError(w, err) {
		return
	}

	out := make([]ingressResponseBody, 0, len(ingresses))
	for _, ing := range ingresses {
		out = append(out, ingressResponseBody{
			Name:      ing.Name,
			Namespace: ing.Namespace,
			Hosts:     ing.Hosts,
			CreatedAt: ing.CreatedAt,
		})
	}
	httputil.WriteJSON(w, http.StatusOK, out)
}

func (h *Handler) listNodes(w http.ResponseWriter, r *http.Request) {
	nodes, err := h.service.ListNodes(r.Context(), r.PathValue("clusterId"))
	if writeServiceError(w, err) {
		return
	}

	out := make([]nodeResponseBody, 0, len(nodes))
	for _, node := range nodes {
		out = append(out, nodeResponseBody{
			Name:              node.Name,
			Ready:             node.Ready,
			KubernetesVersion: node.KubernetesVersion,
			CreatedAt:         node.CreatedAt,
		})
	}
	httputil.WriteJSON(w, http.StatusOK, out)
}

func (h *Handler) listEvents(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	events, err := h.service.ListEvents(r.Context(), r.PathValue("clusterId"), namespace)
	if writeServiceError(w, err) {
		return
	}

	out := make([]eventResponseBody, 0, len(events))
	for _, event := range events {
		out = append(out, eventResponseBody{
			Type:               event.Type,
			Reason:             event.Reason,
			Message:            event.Message,
			InvolvedObjectKind: event.InvolvedObjectKind,
			InvolvedObjectName: event.InvolvedObjectName,
			Namespace:          event.Namespace,
			Count:              event.Count,
			LastSeen:           event.LastSeen,
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
