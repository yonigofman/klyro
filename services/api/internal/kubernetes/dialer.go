// Package kubernetes is the dedicated integration layer over client-go that all
// Kubernetes API access must go through.
package kubernetes

import (
	"fmt"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

// Dialer turns raw kubeconfig bytes into a client-go clientset. NewClientset is
// swappable so tests can substitute a fake clientset without a real API server.
type Dialer struct {
	NewClientset func(restConfigBytes []byte, contextName string) (kubernetes.Interface, error)
}

// NewDialer returns a Dialer that builds real client-go clientsets.
func NewDialer() *Dialer {
	return &Dialer{NewClientset: newRealClientset}
}

// Dial parses kubeconfigYAML and resolves contextName (or the kubeconfig's
// current-context, or its sole context, when contextName is empty) into a
// Client. It only fails for parsing/context problems — it never makes a
// network call, so a cluster that's unreachable at runtime still dials
// successfully here.
func (d *Dialer) Dial(kubeconfigYAML []byte, contextName string) (*Client, string, error) {
	rawConfig, err := clientcmd.Load(kubeconfigYAML)
	if err != nil {
		return nil, "", fmt.Errorf("invalid kubeconfig: %w", err)
	}

	resolvedContext := contextName
	if resolvedContext == "" {
		resolvedContext = rawConfig.CurrentContext
	}
	if resolvedContext == "" {
		if len(rawConfig.Contexts) != 1 {
			return nil, "", fmt.Errorf("context name is required: kubeconfig defines %d contexts and no current-context is set", len(rawConfig.Contexts))
		}
		for name := range rawConfig.Contexts {
			resolvedContext = name
		}
	}
	if _, ok := rawConfig.Contexts[resolvedContext]; !ok {
		return nil, "", fmt.Errorf("context %q not found in kubeconfig", resolvedContext)
	}

	clientset, err := d.NewClientset(kubeconfigYAML, resolvedContext)
	if err != nil {
		return nil, "", fmt.Errorf("building client for context %q: %w", resolvedContext, err)
	}

	return &Client{clientset: clientset}, resolvedContext, nil
}

func newRealClientset(kubeconfigYAML []byte, contextName string) (kubernetes.Interface, error) {
	rawConfig, err := clientcmd.Load(kubeconfigYAML)
	if err != nil {
		return nil, err
	}
	restConfig, err := clientcmd.NewNonInteractiveClientConfig(
		*rawConfig, contextName, &clientcmd.ConfigOverrides{CurrentContext: contextName}, nil,
	).ClientConfig()
	if err != nil {
		return nil, err
	}
	return kubernetes.NewForConfig(restConfig)
}
