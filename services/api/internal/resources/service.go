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
	if namespace != "" {
		if errs := validation.IsDNS1123Label(namespace); len(errs) > 0 {
			return nil, ErrInvalidNamespace
		}
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
