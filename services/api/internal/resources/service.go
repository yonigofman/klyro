package resources

import (
	"context"
	"errors"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/util/validation"

	kube "github.com/yonigofman/klyro/services/api/internal/kubernetes"
)

// ErrClusterNotFound is returned when the given Cluster ID has no live
// connection — either it was never registered or it was removed.
var ErrClusterNotFound = errors.New("cluster not found")

// ErrResourceNotFound is returned when the Cluster is known but the
// requested resource doesn't exist in it — distinct from ErrClusterNotFound
// so callers can tell "wrong cluster" from "resource no longer exists"
// apart.
var ErrResourceNotFound = errors.New("resource not found")

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

// GetPod returns one Pod's Detail, or ErrResourceNotFound if it doesn't exist.
func (s *Service) GetPod(ctx context.Context, clusterID, namespace, name string) (PodDetail, error) {
	if err := validateNamespace(namespace); err != nil {
		return PodDetail{}, err
	}

	client, err := s.clientFor(clusterID)
	if err != nil {
		return PodDetail{}, err
	}

	pod, err := client.GetPod(ctx, namespace, name)
	if err != nil {
		return PodDetail{}, mapGetError(err, "getting pod")
	}

	containers := make([]ContainerDetail, 0, len(pod.Spec.Containers))
	for _, c := range pod.Spec.Containers {
		status := containerStatusFor(c.Name, pod.Status.ContainerStatuses)
		containers = append(containers, ContainerDetail{
			Name:          c.Name,
			Image:         c.Image,
			Ready:         status.Ready,
			RestartCount:  status.RestartCount,
			CPURequest:    quantityString(c.Resources.Requests, corev1.ResourceCPU),
			CPULimit:      quantityString(c.Resources.Limits, corev1.ResourceCPU),
			MemoryRequest: quantityString(c.Resources.Requests, corev1.ResourceMemory),
			MemoryLimit:   quantityString(c.Resources.Limits, corev1.ResourceMemory),
		})
	}

	conditions := make([]ConditionSummary, 0, len(pod.Status.Conditions))
	for _, cond := range pod.Status.Conditions {
		conditions = append(conditions, ConditionSummary{Type: string(cond.Type), Status: string(cond.Status)})
	}

	return PodDetail{
		PodSummary: PodSummary{
			Name:      pod.Name,
			Namespace: pod.Namespace,
			Phase:     pod.Status.Phase,
			Ready:     readyCount(pod.Status.ContainerStatuses),
			Restarts:  restartCount(pod.Status.ContainerStatuses),
			Node:      pod.Spec.NodeName,
			CreatedAt: pod.CreationTimestamp.Time,
		},
		Containers: containers,
		Conditions: conditions,
	}, nil
}

// GetWorkload returns one Workload's Detail by kind and name, or
// ErrResourceNotFound if it doesn't exist.
func (s *Service) GetWorkload(ctx context.Context, clusterID, namespace string, kind WorkloadKind, name string) (WorkloadDetail, error) {
	if err := validateNamespace(namespace); err != nil {
		return WorkloadDetail{}, err
	}

	client, err := s.clientFor(clusterID)
	if err != nil {
		return WorkloadDetail{}, err
	}

	var (
		summary  WorkloadSummary
		strategy string
		selector map[string]string
	)

	switch kind {
	case WorkloadKindDeployment:
		d, err := client.GetDeployment(ctx, namespace, name)
		if err != nil {
			return WorkloadDetail{}, mapGetError(err, "getting deployment")
		}
		desired := int32(1)
		if d.Spec.Replicas != nil {
			desired = *d.Spec.Replicas
		}
		summary = WorkloadSummary{Kind: kind, Name: d.Name, Namespace: d.Namespace, Desired: desired, Ready: d.Status.ReadyReplicas, CreatedAt: d.CreationTimestamp.Time}
		strategy = string(d.Spec.Strategy.Type)
		if d.Spec.Selector != nil {
			selector = d.Spec.Selector.MatchLabels
		}
	case WorkloadKindStatefulSet:
		ss, err := client.GetStatefulSet(ctx, namespace, name)
		if err != nil {
			return WorkloadDetail{}, mapGetError(err, "getting statefulset")
		}
		desired := int32(1)
		if ss.Spec.Replicas != nil {
			desired = *ss.Spec.Replicas
		}
		summary = WorkloadSummary{Kind: kind, Name: ss.Name, Namespace: ss.Namespace, Desired: desired, Ready: ss.Status.ReadyReplicas, CreatedAt: ss.CreationTimestamp.Time}
		strategy = string(ss.Spec.UpdateStrategy.Type)
		if ss.Spec.Selector != nil {
			selector = ss.Spec.Selector.MatchLabels
		}
	case WorkloadKindDaemonSet:
		ds, err := client.GetDaemonSet(ctx, namespace, name)
		if err != nil {
			return WorkloadDetail{}, mapGetError(err, "getting daemonset")
		}
		summary = WorkloadSummary{Kind: kind, Name: ds.Name, Namespace: ds.Namespace, Desired: ds.Status.DesiredNumberScheduled, Ready: ds.Status.NumberReady, CreatedAt: ds.CreationTimestamp.Time}
		strategy = string(ds.Spec.UpdateStrategy.Type)
		if ds.Spec.Selector != nil {
			selector = ds.Spec.Selector.MatchLabels
		}
	default:
		return WorkloadDetail{}, fmt.Errorf("unknown workload kind %q", kind)
	}

	podNames := []string{}
	if len(selector) > 0 {
		pods, err := client.ListPodsMatchingLabels(ctx, namespace, selector)
		if err != nil {
			return WorkloadDetail{}, fmt.Errorf("listing owned pods: %w", err)
		}
		for _, pod := range pods {
			podNames = append(podNames, pod.Name)
		}
	}

	return WorkloadDetail{WorkloadSummary: summary, UpdateStrategy: strategy, PodNames: podNames}, nil
}

// GetService returns one Service's Detail, or ErrResourceNotFound if it
// doesn't exist.
func (s *Service) GetService(ctx context.Context, clusterID, namespace, name string) (ServiceDetail, error) {
	if err := validateNamespace(namespace); err != nil {
		return ServiceDetail{}, err
	}

	client, err := s.clientFor(clusterID)
	if err != nil {
		return ServiceDetail{}, err
	}

	svc, err := client.GetService(ctx, namespace, name)
	if err != nil {
		return ServiceDetail{}, mapGetError(err, "getting service")
	}

	ports := make([]string, 0, len(svc.Spec.Ports))
	for _, p := range svc.Spec.Ports {
		ports = append(ports, fmt.Sprintf("%d/%s", p.Port, p.Protocol))
	}

	endpoints := []string{}
	if len(svc.Spec.Selector) > 0 {
		pods, err := client.ListPodsMatchingLabels(ctx, namespace, svc.Spec.Selector)
		if err != nil {
			return ServiceDetail{}, fmt.Errorf("listing endpoint pods: %w", err)
		}
		for _, pod := range pods {
			if pod.Status.PodIP != "" && podIsReady(pod) {
				endpoints = append(endpoints, pod.Status.PodIP)
			}
		}
	}

	return ServiceDetail{
		ServiceSummary: ServiceSummary{
			Name: svc.Name, Namespace: svc.Namespace, Type: svc.Spec.Type,
			ClusterIP: svc.Spec.ClusterIP, Ports: ports, CreatedAt: svc.CreationTimestamp.Time,
		},
		Selector:  svc.Spec.Selector,
		Endpoints: endpoints,
	}, nil
}

// GetIngress returns one Ingress's Detail, or ErrResourceNotFound if it
// doesn't exist.
func (s *Service) GetIngress(ctx context.Context, clusterID, namespace, name string) (IngressDetail, error) {
	if err := validateNamespace(namespace); err != nil {
		return IngressDetail{}, err
	}

	client, err := s.clientFor(clusterID)
	if err != nil {
		return IngressDetail{}, err
	}

	ing, err := client.GetIngress(ctx, namespace, name)
	if err != nil {
		return IngressDetail{}, mapGetError(err, "getting ingress")
	}

	hosts := make([]string, 0, len(ing.Spec.Rules))
	rules := []IngressRuleDetail{}
	for _, rule := range ing.Spec.Rules {
		if rule.Host != "" {
			hosts = append(hosts, rule.Host)
		}
		if rule.HTTP == nil {
			continue
		}
		for _, path := range rule.HTTP.Paths {
			rules = append(rules, IngressRuleDetail{
				Host:        rule.Host,
				Path:        path.Path,
				ServiceName: path.Backend.Service.Name,
				ServicePort: fmt.Sprintf("%d", path.Backend.Service.Port.Number),
			})
		}
	}

	tlsHosts := []string{}
	for _, tls := range ing.Spec.TLS {
		tlsHosts = append(tlsHosts, tls.Hosts...)
	}

	return IngressDetail{
		IngressSummary: IngressSummary{Name: ing.Name, Namespace: ing.Namespace, Hosts: hosts, CreatedAt: ing.CreationTimestamp.Time},
		Rules:          rules,
		TLSHosts:       tlsHosts,
	}, nil
}

// GetNode returns one Node's Detail, or ErrResourceNotFound if it doesn't
// exist. Nodes are Cluster-scoped — there is no namespace to filter by.
func (s *Service) GetNode(ctx context.Context, clusterID, name string) (NodeDetail, error) {
	client, err := s.clientFor(clusterID)
	if err != nil {
		return NodeDetail{}, err
	}

	node, err := client.GetNode(ctx, name)
	if err != nil {
		return NodeDetail{}, mapGetError(err, "getting node")
	}

	capacity := map[string]string{}
	for k, v := range node.Status.Capacity {
		capacity[string(k)] = v.String()
	}
	allocatable := map[string]string{}
	for k, v := range node.Status.Allocatable {
		allocatable[string(k)] = v.String()
	}

	conditions := make([]ConditionSummary, 0, len(node.Status.Conditions))
	for _, cond := range node.Status.Conditions {
		conditions = append(conditions, ConditionSummary{Type: string(cond.Type), Status: string(cond.Status)})
	}

	taints := make([]TaintSummary, 0, len(node.Spec.Taints))
	for _, t := range node.Spec.Taints {
		taints = append(taints, TaintSummary{Key: t.Key, Value: t.Value, Effect: string(t.Effect)})
	}

	return NodeDetail{
		NodeSummary: NodeSummary{
			Name: node.Name, Ready: nodeIsReady(*node), KubernetesVersion: node.Status.NodeInfo.KubeletVersion,
			CreatedAt: node.CreationTimestamp.Time,
		},
		Capacity:    capacity,
		Allocatable: allocatable,
		Conditions:  conditions,
		Taints:      taints,
	}, nil
}

func mapGetError(err error, context string) error {
	if k8serrors.IsNotFound(err) {
		return ErrResourceNotFound
	}
	return fmt.Errorf("%s: %w", context, err)
}

func containerStatusFor(name string, statuses []corev1.ContainerStatus) corev1.ContainerStatus {
	for _, status := range statuses {
		if status.Name == name {
			return status
		}
	}
	return corev1.ContainerStatus{}
}

func quantityString(list corev1.ResourceList, name corev1.ResourceName) string {
	if q, ok := list[name]; ok {
		return q.String()
	}
	return ""
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

func podIsReady(pod corev1.Pod) bool {
	for _, condition := range pod.Status.Conditions {
		if condition.Type == corev1.PodReady {
			return condition.Status == corev1.ConditionTrue
		}
	}
	return false
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
