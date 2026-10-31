// Package resources lists Kubernetes resources (Namespaces, Pods) inside an
// already-registered Cluster, reusing its existing connection.
package resources

import (
	"time"

	corev1 "k8s.io/api/core/v1"
)

// NamespaceSummary is a curated view of a Namespace — a Cluster-scoped
// Resource — never the raw Kubernetes object. Status reuses Kubernetes' own
// typed phase enum rather than a plain string, per "prefer Kubernetes API
// types over custom representations."
type NamespaceSummary struct {
	Name      string
	Status    corev1.NamespacePhase
	CreatedAt time.Time
}

// PodSummary is a curated view of a Pod — a Namespace-scoped Resource.
// Deliberately narrower than the raw Kubernetes object: a Pod's full spec
// can carry a plaintext value in a container's env (an anti-pattern, but a
// real one), and nothing beyond what's needed to triage should leave the
// backend.
type PodSummary struct {
	Name      string
	Namespace string
	Phase     corev1.PodPhase
	// Ready is "ready/total" container count, e.g. "2/2".
	Ready     string
	Restarts  int32
	Node      string
	CreatedAt time.Time
}
