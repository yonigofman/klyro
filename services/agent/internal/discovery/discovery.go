// Package discovery gathers Capabilities info the agent reports in its
// Heartbeat: Kubernetes version and node count, via client-go. Real
// resource discovery (pods, workloads, ...) is Phase 6's job — this is
// just enough to prove the agent can see the cluster it runs against.
package discovery

import (
	"context"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

type Info struct {
	KubernetesVersion string
	NodeCount         int32
	Available         bool
}

// NewClientset connects to the cluster named by kubeconfigPath (empty
// string uses client-go's default loading rules: $KUBECONFIG, then
// ~/.kube/config). Callers reuse the returned clientset for both
// Capabilities gathering and resource listing rather than reconnecting
// each time.
func NewClientset(kubeconfigPath string) (*kubernetes.Clientset, error) {
	cfg, err := loadConfig(kubeconfigPath)
	if err != nil {
		return nil, err
	}
	return kubernetes.NewForConfig(cfg)
}

// Gather connects to the cluster named by kubeconfigPath and returns what
// it can discover. On any failure it returns a zero-value Info with
// Available=false rather than erroring — a cluster not being reachable yet
// is a normal state to report, not a crash.
func Gather(ctx context.Context, kubeconfigPath string) Info {
	clientset, err := NewClientset(kubeconfigPath)
	if err != nil {
		return Info{}
	}
	return GatherWith(ctx, clientset)
}

// GatherWith is Gather for a clientset the caller already built, so a
// long-lived agent doesn't reconnect on every heartbeat.
func GatherWith(ctx context.Context, clientset *kubernetes.Clientset) Info {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	version, err := clientset.Discovery().ServerVersion()
	if err != nil {
		return Info{}
	}

	var nodeCount int32
	if nodes, err := clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{}); err == nil {
		nodeCount = int32(len(nodes.Items))
	}

	return Info{
		KubernetesVersion: version.GitVersion,
		NodeCount:         nodeCount,
		Available:         true,
	}
}

func loadConfig(kubeconfigPath string) (*rest.Config, error) {
	if kubeconfigPath != "" {
		return clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	}
	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	return clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, &clientcmd.ConfigOverrides{}).ClientConfig()
}
