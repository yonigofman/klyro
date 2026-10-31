package kubernetes

import (
	"context"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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

// ListDeployments returns every Deployment across all namespaces.
func (c *Client) ListDeployments(ctx context.Context) ([]appsv1.Deployment, error) {
	list, err := c.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

// ListStatefulSets returns every StatefulSet across all namespaces.
func (c *Client) ListStatefulSets(ctx context.Context) ([]appsv1.StatefulSet, error) {
	list, err := c.clientset.AppsV1().StatefulSets("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

// ListDaemonSets returns every DaemonSet across all namespaces.
func (c *Client) ListDaemonSets(ctx context.Context) ([]appsv1.DaemonSet, error) {
	list, err := c.clientset.AppsV1().DaemonSets("").List(ctx, metav1.ListOptions{})
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
