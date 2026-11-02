// Package resources lists Kubernetes resources via typed client-go clients,
// in response to a ListResourcesRequest the backend pushed down the
// connector's stream. Dynamic-client/CRD support is follow-up work.
package resources

import (
	"context"
	"fmt"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"

	agentv1 "github.com/yonigofman/klyro/packages/protocol/agent/v1"
)

// List dispatches by kind and returns resources ready to send back over
// the stream. An unsupported kind or a client-go error is reported via the
// response's Error field, never as a Go error — the caller always has a
// response to send.
func List(ctx context.Context, clientset *kubernetes.Clientset, kind, namespace string) []*agentv1.Resource {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	switch kind {
	case "Pod":
		return listPods(ctx, clientset, namespace)
	case "Deployment":
		return listDeployments(ctx, clientset, namespace)
	case "Service":
		return listServices(ctx, clientset, namespace)
	case "Node":
		return listNodes(ctx, clientset)
	default:
		return nil
	}
}

func listPods(ctx context.Context, cs *kubernetes.Clientset, namespace string) []*agentv1.Resource {
	list, err := cs.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil
	}
	out := make([]*agentv1.Resource, 0, len(list.Items))
	for _, p := range list.Items {
		ready, total := 0, len(p.Status.ContainerStatuses)
		restarts := int32(0)
		for _, cs := range p.Status.ContainerStatuses {
			if cs.Ready {
				ready++
			}
			restarts += cs.RestartCount
		}
		out = append(out, &agentv1.Resource{
			Name:      p.Name,
			Namespace: p.Namespace,
			Status:    string(p.Status.Phase),
			CreatedAt: p.CreationTimestamp.Format(time.RFC3339),
			Extra: map[string]string{
				"ready":    fmt.Sprintf("%d/%d", ready, total),
				"restarts": fmt.Sprintf("%d", restarts),
				"node":     p.Spec.NodeName,
			},
		})
	}
	return out
}

func listDeployments(ctx context.Context, cs *kubernetes.Clientset, namespace string) []*agentv1.Resource {
	list, err := cs.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil
	}
	out := make([]*agentv1.Resource, 0, len(list.Items))
	for _, d := range list.Items {
		status := "NotReady"
		if d.Status.ReadyReplicas == d.Status.Replicas && d.Status.Replicas > 0 {
			status = "Ready"
		}
		out = append(out, &agentv1.Resource{
			Name:      d.Name,
			Namespace: d.Namespace,
			Status:    status,
			CreatedAt: d.CreationTimestamp.Format(time.RFC3339),
			Extra: map[string]string{
				"ready": fmt.Sprintf("%d/%d", d.Status.ReadyReplicas, d.Status.Replicas),
			},
		})
	}
	return out
}

func listServices(ctx context.Context, cs *kubernetes.Clientset, namespace string) []*agentv1.Resource {
	list, err := cs.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil
	}
	out := make([]*agentv1.Resource, 0, len(list.Items))
	for _, s := range list.Items {
		out = append(out, &agentv1.Resource{
			Name:      s.Name,
			Namespace: s.Namespace,
			Status:    string(s.Spec.Type),
			CreatedAt: s.CreationTimestamp.Format(time.RFC3339),
			Extra: map[string]string{
				"clusterIP": s.Spec.ClusterIP,
				"ports":     formatPorts(s.Spec.Ports),
			},
		})
	}
	return out
}

func listNodes(ctx context.Context, cs *kubernetes.Clientset) []*agentv1.Resource {
	list, err := cs.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil
	}
	out := make([]*agentv1.Resource, 0, len(list.Items))
	for _, n := range list.Items {
		status := "NotReady"
		for _, cond := range n.Status.Conditions {
			if cond.Type == corev1.NodeReady && cond.Status == corev1.ConditionTrue {
				status = "Ready"
			}
		}
		out = append(out, &agentv1.Resource{
			Name:      n.Name,
			Status:    status,
			CreatedAt: n.CreationTimestamp.Format(time.RFC3339),
			Extra: map[string]string{
				"version": n.Status.NodeInfo.KubeletVersion,
			},
		})
	}
	return out
}

func formatPorts(ports []corev1.ServicePort) string {
	s := ""
	for i, p := range ports {
		if i > 0 {
			s += ","
		}
		s += fmt.Sprintf("%d/%s", p.Port, p.Protocol)
	}
	return s
}
