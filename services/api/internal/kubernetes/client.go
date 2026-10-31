package kubernetes

import (
	"context"
	"io"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/kubernetes"
)

// Client is the only way outside this package to read from a Cluster's API
// server. Callers get Kubernetes API types back — never a client-go client —
// so "all Kubernetes interactions go through the integration layer" holds for
// reads as well as the initial dial.
type Client struct {
	clientset kubernetes.Interface
}

// ServerVersion returns the Cluster's Kubernetes version string.
func (c *Client) ServerVersion() (string, error) {
	version, err := c.clientset.Discovery().ServerVersion()
	if err != nil {
		return "", err
	}
	return version.GitVersion, nil
}

// ListNodes returns every Node (a Cluster-scoped Resource) in the Cluster.
func (c *Client) ListNodes(ctx context.Context) ([]corev1.Node, error) {
	list, err := c.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

// ListDeployments returns every Deployment in namespace, or across all
// namespaces when namespace is "".
func (c *Client) ListDeployments(ctx context.Context, namespace string) ([]appsv1.Deployment, error) {
	list, err := c.clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

// ListStatefulSets returns every StatefulSet in namespace, or across all
// namespaces when namespace is "".
func (c *Client) ListStatefulSets(ctx context.Context, namespace string) ([]appsv1.StatefulSet, error) {
	list, err := c.clientset.AppsV1().StatefulSets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

// ListDaemonSets returns every DaemonSet in namespace, or across all
// namespaces when namespace is "".
func (c *Client) ListDaemonSets(ctx context.Context, namespace string) ([]appsv1.DaemonSet, error) {
	list, err := c.clientset.AppsV1().DaemonSets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

// ListPods returns every Pod in namespace, or across all namespaces when
// namespace is "".
func (c *Client) ListPods(ctx context.Context, namespace string) ([]corev1.Pod, error) {
	list, err := c.clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

// ListNamespaces returns every Namespace (a Cluster-scoped Resource) in the
// Cluster.
func (c *Client) ListNamespaces(ctx context.Context) ([]corev1.Namespace, error) {
	list, err := c.clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

// ListServices returns every Service in namespace, or across all
// namespaces when namespace is "".
func (c *Client) ListServices(ctx context.Context, namespace string) ([]corev1.Service, error) {
	list, err := c.clientset.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

// ListIngresses returns every Ingress (networking.k8s.io/v1 — the standard
// Kubernetes API, not a vendor-specific Route) in namespace, or across all
// namespaces when namespace is "".
func (c *Client) ListIngresses(ctx context.Context, namespace string) ([]networkingv1.Ingress, error) {
	list, err := c.clientset.NetworkingV1().Ingresses(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

// ListEvents returns every Event in namespace, or across all namespaces
// when namespace is "".
func (c *Client) ListEvents(ctx context.Context, namespace string) ([]corev1.Event, error) {
	list, err := c.clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

// GetPod returns one Pod by name, or a Kubernetes not-found error.
func (c *Client) GetPod(ctx context.Context, namespace, name string) (*corev1.Pod, error) {
	return c.clientset.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
}

// StreamPodLogs returns a live, following stream of one container's log
// output. The caller must Close the returned stream. tailLines of 0 means
// no backlog cap is sent to the API server.
func (c *Client) StreamPodLogs(ctx context.Context, namespace, name, container string, tailLines int64) (io.ReadCloser, error) {
	opts := &corev1.PodLogOptions{Container: container, Follow: true}
	if tailLines > 0 {
		opts.TailLines = &tailLines
	}
	return c.clientset.CoreV1().Pods(namespace).GetLogs(name, opts).Stream(ctx)
}

// GetDeployment returns one Deployment by name, or a Kubernetes not-found error.
func (c *Client) GetDeployment(ctx context.Context, namespace, name string) (*appsv1.Deployment, error) {
	return c.clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
}

// GetStatefulSet returns one StatefulSet by name, or a Kubernetes not-found error.
func (c *Client) GetStatefulSet(ctx context.Context, namespace, name string) (*appsv1.StatefulSet, error) {
	return c.clientset.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
}

// GetDaemonSet returns one DaemonSet by name, or a Kubernetes not-found error.
func (c *Client) GetDaemonSet(ctx context.Context, namespace, name string) (*appsv1.DaemonSet, error) {
	return c.clientset.AppsV1().DaemonSets(namespace).Get(ctx, name, metav1.GetOptions{})
}

// GetService returns one Service by name, or a Kubernetes not-found error.
func (c *Client) GetService(ctx context.Context, namespace, name string) (*corev1.Service, error) {
	return c.clientset.CoreV1().Services(namespace).Get(ctx, name, metav1.GetOptions{})
}

// GetIngress returns one Ingress by name, or a Kubernetes not-found error.
func (c *Client) GetIngress(ctx context.Context, namespace, name string) (*networkingv1.Ingress, error) {
	return c.clientset.NetworkingV1().Ingresses(namespace).Get(ctx, name, metav1.GetOptions{})
}

// GetNode returns one Node by name, or a Kubernetes not-found error.
func (c *Client) GetNode(ctx context.Context, name string) (*corev1.Node, error) {
	return c.clientset.CoreV1().Nodes().Get(ctx, name, metav1.GetOptions{})
}

// ListPodsMatchingLabels returns every Pod in namespace whose labels match
// selector — used to find the Pods a Workload owns without leaking
// label-selector matching (a client-go concern) outside this package.
func (c *Client) ListPodsMatchingLabels(ctx context.Context, namespace string, selector map[string]string) ([]corev1.Pod, error) {
	pods, err := c.ListPods(ctx, namespace)
	if err != nil {
		return nil, err
	}
	set := labels.SelectorFromSet(selector)
	matched := make([]corev1.Pod, 0, len(pods))
	for _, pod := range pods {
		if set.Matches(labels.Set(pod.Labels)) {
			matched = append(matched, pod)
		}
	}
	return matched, nil
}
