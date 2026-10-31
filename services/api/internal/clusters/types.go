// Package clusters manages registered Kubernetes cluster connections.
package clusters

import "time"

// ConnectionStatus reflects whether Klyro can currently reach a Cluster's API
// server, independent of what's happening inside the cluster. A list call
// failing (e.g. an RBAC-denied list) does not make a Cluster unreachable —
// only a failed reachability probe (server version) does; see probe() in
// service.go.
type ConnectionStatus string

const (
	ConnectionStatusConnected   ConnectionStatus = "connected"
	ConnectionStatusUnreachable ConnectionStatus = "unreachable"
)

// Health is the three-color aggregate signal of what's happening inside a
// reachable Cluster. An unreachable Cluster is always HealthRed.
type Health string

const (
	HealthGreen Health = "green"
	HealthAmber Health = "amber"
	HealthRed   Health = "red"
)

// Cluster is a Klyro-managed record for one Kubernetes API server connection.
// Its identity is Klyro-generated and independent of the kubeconfig Context
// name; Klyro never stores or exposes the kubeconfig's own contents.
type Cluster struct {
	ID                string
	DisplayName       string
	Context           string
	KubernetesVersion string
	ConnectionStatus  ConnectionStatus
	Health            Health
	NodeCount         int
	PodCount          int
	// LastSeen is the time of the last successful reachability probe. It is
	// nil until the Cluster has been reachable at least once, and is never
	// cleared just because the Cluster has since gone unreachable.
	LastSeen *time.Time
	Metadata map[string]string
}

// RegisterRequest is the input to registering a new Cluster.
type RegisterRequest struct {
	Kubeconfig  string
	Context     string
	DisplayName string
	Metadata    map[string]string
}
