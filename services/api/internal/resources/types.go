// Package resources lists Kubernetes resources (Namespaces, Pods, Workloads,
// Services, Ingresses, Nodes, Events) inside an already-registered Cluster,
// reusing its existing connection.
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

// WorkloadKind names which of the three Kubernetes kinds a WorkloadSummary
// came from. Workload (Deployment, StatefulSet, or DaemonSet) is one domain
// concept — see CONTEXT.md — exposed as one list, not three.
type WorkloadKind string

const (
	WorkloadKindDeployment  WorkloadKind = "Deployment"
	WorkloadKindStatefulSet WorkloadKind = "StatefulSet"
	WorkloadKindDaemonSet   WorkloadKind = "DaemonSet"
)

// WorkloadSummary is a curated view of a Deployment, StatefulSet, or
// DaemonSet — a Namespace-scoped Resource — never the raw Kubernetes object.
type WorkloadSummary struct {
	Kind      WorkloadKind
	Name      string
	Namespace string
	Desired   int32
	Ready     int32
	CreatedAt time.Time
}

// ServiceSummary is a curated view of a Service — a Namespace-scoped
// Resource.
type ServiceSummary struct {
	Name      string
	Namespace string
	Type      corev1.ServiceType
	ClusterIP string
	// Ports is a short human-readable form, e.g. "80/TCP".
	Ports     []string
	CreatedAt time.Time
}

// IngressSummary is a curated view of an Ingress — a Namespace-scoped
// Resource. "Route" (per CONTEXT.md) is informal phrasing for the same
// object; genuine OpenShift Route support is out of scope.
type IngressSummary struct {
	Name      string
	Namespace string
	Hosts     []string
	CreatedAt time.Time
}

// NodeSummary is a curated view of a Node — a Cluster-scoped Resource, with
// no Namespace to filter by.
type NodeSummary struct {
	Name              string
	Ready             bool
	KubernetesVersion string
	CreatedAt         time.Time
}

// EventSummary is a curated view of an Event — a Namespace-scoped Resource,
// never to be confused with a Resource Update (the watch-driven SSE push
// notification CONTEXT.md defines separately).
type EventSummary struct {
	Type               string
	Reason             string
	Message            string
	InvolvedObjectKind string
	InvolvedObjectName string
	Namespace          string
	Count              int32
	LastSeen           time.Time
}

// ConditionSummary is a curated view of a Kubernetes condition (shared by
// Pod and Node detail — both have a Conditions list of the same shape).
type ConditionSummary struct {
	Type   string
	Status string
}

// ContainerDetail is a curated view of one container in a Pod.
type ContainerDetail struct {
	Name          string
	Image         string
	Ready         bool
	RestartCount  int32
	CPURequest    string
	CPULimit      string
	MemoryRequest string
	MemoryLimit   string
}

// PodDetail is PodSummary plus the fields only a single-resource view needs.
// Still curated — never the raw Pod object — per CONTEXT.md's Detail entry.
type PodDetail struct {
	PodSummary
	Containers []ContainerDetail
	Conditions []ConditionSummary
}

// WorkloadDetail is WorkloadSummary plus its update strategy and the names
// of the Pods it owns (matched by label selector).
type WorkloadDetail struct {
	WorkloadSummary
	UpdateStrategy string
	PodNames       []string
}

// ServiceEndpoint is one Pod backing a Service — a Pod matched by the
// Service's selector and reported Ready, paired with its name so the
// frontend can link straight to that Pod's Detail page.
type ServiceEndpoint struct {
	PodName string
	IP      string
}

// ServiceDetail is ServiceSummary plus its selector and the Pods backing it.
type ServiceDetail struct {
	ServiceSummary
	Selector  map[string]string
	Endpoints []ServiceEndpoint
}

// IngressRuleDetail is one host/path routing rule on an Ingress.
type IngressRuleDetail struct {
	Host        string
	Path        string
	ServiceName string
	ServicePort string
}

// IngressDetail is IngressSummary plus its backend rules and TLS hosts.
type IngressDetail struct {
	IngressSummary
	Rules    []IngressRuleDetail
	TLSHosts []string
}

// TaintSummary is a curated view of a Node taint.
type TaintSummary struct {
	Key    string
	Value  string
	Effect string
}

// NodeDetail is NodeSummary plus capacity, allocatable resources,
// conditions, and taints.
type NodeDetail struct {
	NodeSummary
	Capacity    map[string]string
	Allocatable map[string]string
	Conditions  []ConditionSummary
	Taints      []TaintSummary
}
