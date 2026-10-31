package resources

import (
	"context"
	"errors"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/util/validation"

	kube "github.com/yonigofman/klyro/services/api/internal/kubernetes"
)

// ErrClusterNotFound is returned when the given Cluster ID has no live
// connection — either it was never registered or it was removed.
var ErrClusterNotFound = errors.New("cluster not found")

// ErrInvalidNamespace is returned when a namespace filter isn't a
// well-formed Kubernetes namespace name.
var ErrInvalidNamespace = errors.New("invalid namespace")

// ClusterClients is the narrow slice of internal/clusters.Service this
// package depends on — just enough to reuse a Cluster's existing connection,
// without internal/resources needing to know how Clusters are stored.
type ClusterClients interface {
	ClientFor(clusterID string) (*kube.Client, error)
}

// Service lists Namespaces and Pods inside an already-registered Cluster.
// It never calls client-go directly — all Kubernetes access goes through
// the kube.Client obtained from ClusterClients.
type Service struct {
	clients ClusterClients
}

// NewService builds a Service against an existing Cluster registry.
func NewService(clients ClusterClients) *Service {
	return &Service{clients: clients}
}

// ListNamespaces returns every Namespace in the given Cluster.
func (s *Service) ListNamespaces(ctx context.Context, clusterID string) ([]NamespaceSummary, error) {
	client, err := s.clientFor(clusterID)
	if err != nil {
		return nil, err
	}

	namespaces, err := client.ListNamespaces(ctx)
	if err != nil {
		return nil, fmt.Errorf("listing namespaces: %w", err)
	}

	summaries := make([]NamespaceSummary, 0, len(namespaces))
	for _, ns := range namespaces {
		summaries = append(summaries, NamespaceSummary{
			Name:      ns.Name,
			Status:    ns.Status.Phase,
			CreatedAt: ns.CreationTimestamp.Time,
		})
	}
	return summaries, nil
}

// ListPods returns every Pod in the given Cluster, scoped to namespace when
// it's non-empty, or across all namespaces when it's "".
func (s *Service) ListPods(ctx context.Context, clusterID, namespace string) ([]PodSummary, error) {
	if err := validateNamespace(namespace); err != nil {
		return nil, err
	}

	client, err := s.clientFor(clusterID)
	if err != nil {
		return nil, err
	}

	pods, err := client.ListPods(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("listing pods: %w", err)
	}

	summaries := make([]PodSummary, 0, len(pods))
	for _, pod := range pods {
		summaries = append(summaries, PodSummary{
			Name:      pod.Name,
			Namespace: pod.Namespace,
			Phase:     pod.Status.Phase,
			Ready:     readyCount(pod.Status.ContainerStatuses),
			Restarts:  restartCount(pod.Status.ContainerStatuses),
			Node:      pod.Spec.NodeName,
			CreatedAt: pod.CreationTimestamp.Time,
		})
	}
	return summaries, nil
}

// ListWorkloads returns every Deployment, StatefulSet, and DaemonSet in the
// given Cluster as one unified list — Workload is one domain concept (see
// CONTEXT.md) spanning all three Kubernetes kinds.
func (s *Service) ListWorkloads(ctx context.Context, clusterID, namespace string) ([]WorkloadSummary, error) {
	if err := validateNamespace(namespace); err != nil {
		return nil, err
	}

	client, err := s.clientFor(clusterID)
	if err != nil {
		return nil, err
	}

	deployments, err := client.ListDeployments(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("listing deployments: %w", err)
	}
	statefulSets, err := client.ListStatefulSets(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("listing statefulsets: %w", err)
	}
	daemonSets, err := client.ListDaemonSets(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("listing daemonsets: %w", err)
	}

	summaries := make([]WorkloadSummary, 0, len(deployments)+len(statefulSets)+len(daemonSets))
	for _, d := range deployments {
		desired := int32(1)
		if d.Spec.Replicas != nil {
			desired = *d.Spec.Replicas
		}
		summaries = append(summaries, WorkloadSummary{
			Kind: WorkloadKindDeployment, Name: d.Name, Namespace: d.Namespace,
			Desired: desired, Ready: d.Status.ReadyReplicas, CreatedAt: d.CreationTimestamp.Time,
		})
	}
	for _, ss := range statefulSets {
		desired := int32(1)
		if ss.Spec.Replicas != nil {
			desired = *ss.Spec.Replicas
		}
		summaries = append(summaries, WorkloadSummary{
			Kind: WorkloadKindStatefulSet, Name: ss.Name, Namespace: ss.Namespace,
			Desired: desired, Ready: ss.Status.ReadyReplicas, CreatedAt: ss.CreationTimestamp.Time,
		})
	}
	for _, ds := range daemonSets {
		summaries = append(summaries, WorkloadSummary{
			Kind: WorkloadKindDaemonSet, Name: ds.Name, Namespace: ds.Namespace,
			Desired: ds.Status.DesiredNumberScheduled, Ready: ds.Status.NumberReady, CreatedAt: ds.CreationTimestamp.Time,
		})
	}
	return summaries, nil
}

// ListServices returns every Service in the given Cluster, scoped to
// namespace when it's non-empty, or across all namespaces when it's "".
func (s *Service) ListServices(ctx context.Context, clusterID, namespace string) ([]ServiceSummary, error) {
	if err := validateNamespace(namespace); err != nil {
		return nil, err
	}

	client, err := s.clientFor(clusterID)
	if err != nil {
		return nil, err
	}

	services, err := client.ListServices(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("listing services: %w", err)
	}

	summaries := make([]ServiceSummary, 0, len(services))
	for _, svc := range services {
		ports := make([]string, 0, len(svc.Spec.Ports))
		for _, p := range svc.Spec.Ports {
			ports = append(ports, fmt.Sprintf("%d/%s", p.Port, p.Protocol))
		}
		summaries = append(summaries, ServiceSummary{
			Name:      svc.Name,
			Namespace: svc.Namespace,
			Type:      svc.Spec.Type,
			ClusterIP: svc.Spec.ClusterIP,
			Ports:     ports,
			CreatedAt: svc.CreationTimestamp.Time,
		})
	}
	return summaries, nil
}

// ListIngresses returns every Ingress in the given Cluster, scoped to
// namespace when it's non-empty, or across all namespaces when it's "".
func (s *Service) ListIngresses(ctx context.Context, clusterID, namespace string) ([]IngressSummary, error) {
	if err := validateNamespace(namespace); err != nil {
		return nil, err
	}

	client, err := s.clientFor(clusterID)
	if err != nil {
		return nil, err
	}

	ingresses, err := client.ListIngresses(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("listing ingresses: %w", err)
	}

	summaries := make([]IngressSummary, 0, len(ingresses))
	for _, ing := range ingresses {
		hosts := make([]string, 0, len(ing.Spec.Rules))
		for _, rule := range ing.Spec.Rules {
			if rule.Host != "" {
				hosts = append(hosts, rule.Host)
			}
		}
		summaries = append(summaries, IngressSummary{
			Name:      ing.Name,
			Namespace: ing.Namespace,
			Hosts:     hosts,
			CreatedAt: ing.CreationTimestamp.Time,
		})
	}
	return summaries, nil
}

// ListNodes returns every Node in the given Cluster. Nodes are a
// Cluster-scoped Resource — there is no namespace to filter by.
func (s *Service) ListNodes(ctx context.Context, clusterID string) ([]NodeSummary, error) {
	client, err := s.clientFor(clusterID)
	if err != nil {
		return nil, err
	}

	nodes, err := client.ListNodes(ctx)
	if err != nil {
		return nil, fmt.Errorf("listing nodes: %w", err)
	}

	summaries := make([]NodeSummary, 0, len(nodes))
	for _, node := range nodes {
		summaries = append(summaries, NodeSummary{
			Name:              node.Name,
			Ready:             nodeIsReady(node),
			KubernetesVersion: node.Status.NodeInfo.KubeletVersion,
			CreatedAt:         node.CreationTimestamp.Time,
		})
	}
	return summaries, nil
}

// ListEvents returns every Event in the given Cluster, scoped to namespace
// when it's non-empty, or across all namespaces when it's "".
func (s *Service) ListEvents(ctx context.Context, clusterID, namespace string) ([]EventSummary, error) {
	if err := validateNamespace(namespace); err != nil {
		return nil, err
	}

	client, err := s.clientFor(clusterID)
	if err != nil {
		return nil, err
	}

	events, err := client.ListEvents(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("listing events: %w", err)
	}

	summaries := make([]EventSummary, 0, len(events))
	for _, event := range events {
		lastSeen := event.LastTimestamp.Time
		if lastSeen.IsZero() {
			lastSeen = event.EventTime.Time
		}
		summaries = append(summaries, EventSummary{
			Type:               event.Type,
			Reason:             event.Reason,
			Message:            event.Message,
			InvolvedObjectKind: event.InvolvedObject.Kind,
			InvolvedObjectName: event.InvolvedObject.Name,
			Namespace:          event.Namespace,
			Count:              event.Count,
			LastSeen:           lastSeen,
		})
	}
	return summaries, nil
}

func validateNamespace(namespace string) error {
	if namespace == "" {
		return nil
	}
	if errs := validation.IsDNS1123Label(namespace); len(errs) > 0 {
		return ErrInvalidNamespace
	}
	return nil
}

func nodeIsReady(node corev1.Node) bool {
	for _, condition := range node.Status.Conditions {
		if condition.Type == corev1.NodeReady {
			return condition.Status == corev1.ConditionTrue
		}
	}
	return false
}

func (s *Service) clientFor(clusterID string) (*kube.Client, error) {
	client, err := s.clients.ClientFor(clusterID)
	if err != nil {
		return nil, ErrClusterNotFound
	}
	return client, nil
}

func readyCount(statuses []corev1.ContainerStatus) string {
	ready := 0
	for _, status := range statuses {
		if status.Ready {
			ready++
		}
	}
	return fmt.Sprintf("%d/%d", ready, len(statuses))
}

func restartCount(statuses []corev1.ContainerStatus) int32 {
	var total int32
	for _, status := range statuses {
		total += status.RestartCount
	}
	return total
}
