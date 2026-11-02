// Package httpapi is the backend's REST surface. The browser only ever
// talks to this — never to a cluster or the agent directly (AGENTS.md §2).
package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/yonigofman/klyro/services/api/internal/agentserver"
)

type ResourceJSON struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace,omitempty"`
	Status    string            `json:"status"`
	CreatedAt string            `json:"createdAt"`
	Extra     map[string]string `json:"extra,omitempty"`
}

type ListResourcesResult struct {
	Kind      string         `json:"kind"`
	Resources []ResourceJSON `json:"resources"`
	Error     string         `json:"error,omitempty"`
}

func NewMux(agents *agentserver.Server, log *slog.Logger) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/clusters", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, agents.ListClusters())
	})

	mux.HandleFunc("GET /api/clusters/{id}/resources", func(w http.ResponseWriter, r *http.Request) {
		clusterID := r.PathValue("id")
		kind := r.URL.Query().Get("kind")
		namespace := r.URL.Query().Get("namespace")

		if kind == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "kind query parameter is required"})
			return
		}

		resp, err := agents.ListResources(r.Context(), clusterID, kind, namespace)
		if err != nil {
			if errors.Is(err, agentserver.ErrClusterNotConnected) {
				writeJSON(w, http.StatusNotFound, map[string]string{"error": "cluster is not connected"})
				return
			}
			log.Error("list resources failed", "cluster_id", clusterID, "kind", kind, "error", err)
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": "the agent did not respond"})
			return
		}

		resources := make([]ResourceJSON, 0, len(resp.GetResources()))
		for _, res := range resp.GetResources() {
			resources = append(resources, ResourceJSON{
				Name:      res.GetName(),
				Namespace: res.GetNamespace(),
				Status:    res.GetStatus(),
				CreatedAt: res.GetCreatedAt(),
				Extra:     res.GetExtra(),
			})
		}

		writeJSON(w, http.StatusOK, ListResourcesResult{
			Kind:      resp.GetKind(),
			Resources: resources,
			Error:     resp.GetError(),
		})
	})

	return withCORS(mux)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// withCORS allows the local web dev server to call this API. Phase 10
// (air-gap production readiness) is where a real, configurable origin
// allowlist belongs — this is a dev convenience, not a security boundary.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
