// Package testsupport holds Kubernetes object fixtures and fake-Dialer
// wiring shared by every handler-level test package (internal/clusters,
// internal/resources, ...), so each one isn't maintaining its own near-
// identical copy.
package testsupport

import (
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/version"
	discoveryfake "k8s.io/client-go/discovery/fake"
	kubeclient "k8s.io/client-go/kubernetes"
	fakeclient "k8s.io/client-go/kubernetes/fake"

	kube "github.com/yonigofman/klyro/services/api/internal/kubernetes"
)

// FakeDialer returns a Dialer whose NewClientset always hands back
// clientset, regardless of what kubeconfig bytes are sent in — this
// exercises the real Dial() parsing/context logic while substituting a
// deterministic clientset for the network call client-go would otherwise
// make.
func FakeDialer(clientset kubeclient.Interface) *kube.Dialer {
	return &kube.Dialer{
		NewClientset: func(_ []byte, _ string) (kubeclient.Interface, error) {
			return clientset, nil
		},
	}
}

// SetFakedServerVersion pins the version client-go's fake Discovery() client
// reports, so a successful probe produces a deterministic KubernetesVersion.
func SetFakedServerVersion(cs *fakeclient.Clientset, gitVersion string) {
	cs.Discovery().(*discoveryfake.FakeDiscovery).FakedServerVersion = &version.Info{GitVersion: gitVersion}
}

// Node builds a fake Node with a single Ready condition.
func Node(name string, ready bool) *corev1.Node {
	status := corev1.ConditionFalse
	if ready {
		status = corev1.ConditionTrue
	}
	return &corev1.Node{
		ObjectMeta: metav1.ObjectMeta{Name: name},
		Status: corev1.NodeStatus{
			Conditions: []corev1.NodeCondition{{Type: corev1.NodeReady, Status: status}},
		},
	}
}

// Deployment builds a fake Deployment with the given desired/ready replicas.
func Deployment(name, namespace string, desired, ready int32) *appsv1.Deployment {
	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Spec:       appsv1.DeploymentSpec{Replicas: &desired},
		Status:     appsv1.DeploymentStatus{ReadyReplicas: ready},
	}
}

// StatefulSet builds a fake StatefulSet with the given desired/ready replicas.
func StatefulSet(name, namespace string, desired, ready int32) *appsv1.StatefulSet {
	return &appsv1.StatefulSet{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Spec:       appsv1.StatefulSetSpec{Replicas: &desired},
		Status:     appsv1.StatefulSetStatus{ReadyReplicas: ready},
	}
}

// DaemonSet builds a fake DaemonSet with the given desired/ready counts.
func DaemonSet(name, namespace string, desired, ready int32) *appsv1.DaemonSet {
	return &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Status: appsv1.DaemonSetStatus{
			DesiredNumberScheduled: desired,
			NumberReady:            ready,
		},
	}
}

// Service builds a fake Service with the given type, cluster IP, and ports.
func Service(name, namespace string, svcType corev1.ServiceType, clusterIP string, ports ...int32) *corev1.Service {
	svcPorts := make([]corev1.ServicePort, len(ports))
	for i, p := range ports {
		svcPorts[i] = corev1.ServicePort{Port: p, Protocol: corev1.ProtocolTCP}
	}
	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Spec:       corev1.ServiceSpec{Type: svcType, ClusterIP: clusterIP, Ports: svcPorts},
	}
}

// Ingress builds a fake Ingress routing the given hosts.
func Ingress(name, namespace string, hosts ...string) *networkingv1.Ingress {
	rules := make([]networkingv1.IngressRule, len(hosts))
	for i, host := range hosts {
		rules[i] = networkingv1.IngressRule{Host: host}
	}
	return &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Spec:       networkingv1.IngressSpec{Rules: rules},
	}
}

// Event builds a fake Event about the given involved object.
func Event(name, namespace, eventType, reason, message, involvedKind, involvedName string, count int32) *corev1.Event {
	return &corev1.Event{
		ObjectMeta:     metav1.ObjectMeta{Name: name, Namespace: namespace},
		Type:           eventType,
		Reason:         reason,
		Message:        message,
		Count:          count,
		InvolvedObject: corev1.ObjectReference{Kind: involvedKind, Name: involvedName},
		LastTimestamp:  metav1.Now(),
	}
}

// Namespace builds a fake Namespace with the given phase.
func Namespace(name string, phase corev1.NamespacePhase) *corev1.Namespace {
	return &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: name},
		Status:     corev1.NamespaceStatus{Phase: phase},
	}
}

// Pod builds a fake Pod with totalContainers container statuses, the first
// readyContainers of them Ready, each with restartsPerContainer restarts.
func Pod(name, namespace, node string, readyContainers, totalContainers int, restartsPerContainer int32) *corev1.Pod {
	statuses := make([]corev1.ContainerStatus, totalContainers)
	for i := range statuses {
		statuses[i] = corev1.ContainerStatus{Ready: i < readyContainers, RestartCount: restartsPerContainer}
	}
	return &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Spec:       corev1.PodSpec{NodeName: node},
		Status:     corev1.PodStatus{Phase: corev1.PodRunning, ContainerStatuses: statuses},
	}
}

// SingleContextKubeconfig returns a minimal valid kubeconfig with exactly
// one context, set as current-context.
func SingleContextKubeconfig(contextName string) string {
	return fmt.Sprintf(`apiVersion: v1
kind: Config
current-context: %[1]s
clusters:
- name: test-cluster
  cluster:
    server: https://example.invalid
contexts:
- name: %[1]s
  context:
    cluster: test-cluster
    user: test-user
users:
- name: test-user
  user:
    token: fake-token-do-not-leak
`, contextName)
}

// MultiContextKubeconfig returns a minimal valid kubeconfig with two
// contexts and no current-context set.
func MultiContextKubeconfig(contextA, contextB string) string {
	return fmt.Sprintf(`apiVersion: v1
kind: Config
clusters:
- name: test-cluster
  cluster:
    server: https://example.invalid
contexts:
- name: %[1]s
  context:
    cluster: test-cluster
    user: test-user
- name: %[2]s
  context:
    cluster: test-cluster
    user: test-user
users:
- name: test-user
  user:
    token: fake-token-do-not-leak
`, contextA, contextB)
}
