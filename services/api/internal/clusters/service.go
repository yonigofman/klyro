package clusters

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	kube "github.com/yonigofman/klyro/services/api/internal/kubernetes"
)

// ErrNotFound is returned when a Cluster ID has no matching record.
var ErrNotFound = errors.New("cluster not found")

// Service owns Cluster registration and lifecycle. It never calls client-go
// directly — all Kubernetes access goes through the injected Dialer and the
// kube.Client it returns.
type Service struct {
	store  *store
	dialer *kube.Dialer
}

// NewService builds a Service with an empty in-memory registry.
func NewService(dialer *kube.Dialer) *Service {
	return &Service{store: newStore(), dialer: dialer}
}

// Register parses and validates req.Kubeconfig, then probes the resulting
// cluster once before storing it. A parse/context error rejects registration
// outright; a runtime connection failure still creates the Cluster record,
// marked unreachable, so it can recover on the next periodic refresh.
func (s *Service) Register(ctx context.Context, req RegisterRequest) (Cluster, error) {
	if req.Kubeconfig == "" {
		return Cluster{}, fmt.Errorf("kubeconfig is required")
	}

	client, resolvedContext, err := s.dialer.Dial([]byte(req.Kubeconfig), req.Context)
	if err != nil {
		return Cluster{}, err
	}

	displayName := req.DisplayName
	if displayName == "" {
		displayName = resolvedContext
	}

	cluster := Cluster{
		ID:          generateID(),
		DisplayName: displayName,
		Context:     resolvedContext,
		Metadata:    req.Metadata,
	}
	applyProbe(&cluster, probe(ctx, client))

	s.store.put(cluster, client)
	return cluster, nil
}

// List returns every registered Cluster.
func (s *Service) List() []Cluster {
	return s.store.list()
}

// Get returns a single Cluster by ID, or ErrNotFound.
func (s *Service) Get(id string) (Cluster, error) {
	c, ok := s.store.get(id)
	if !ok {
		return Cluster{}, ErrNotFound
	}
	return c, nil
}

// ClientFor returns the live kube.Client a Cluster was registered with, so
// other packages (e.g. internal/resources) can read from it without
// re-dialing or re-parsing a kubeconfig. Returns ErrNotFound for an unknown
// Cluster ID.
func (s *Service) ClientFor(id string) (*kube.Client, error) {
	client, ok := s.store.getClient(id)
	if !ok {
		return nil, ErrNotFound
	}
	return client, nil
}

// Remove unregisters a Cluster by ID, or returns ErrNotFound.
func (s *Service) Remove(id string) error {
	if !s.store.delete(id) {
		return ErrNotFound
	}
	return nil
}

// RefreshAll re-probes every registered Cluster's Connection Status and
// Health. Intended to be called on a periodic interval by the caller.
func (s *Service) RefreshAll(ctx context.Context) {
	for _, r := range s.store.all() {
		applyProbe(&r.cluster, probe(ctx, r.client))
		s.store.updateCluster(r.cluster)
	}
}

// probeResult is everything a single probe can learn about a Cluster.
type probeResult struct {
	connectionStatus  ConnectionStatus
	health            Health
	kubernetesVersion string
	nodeCount         int
	podCount          int
	seenNow           bool
}

// applyProbe writes a probeResult onto cluster, preserving LastSeen when the
// probe didn't reach the cluster this time (LastSeen means "last seen", not
// "currently seen" — it's never cleared just because a probe failed).
func applyProbe(cluster *Cluster, result probeResult) {
	cluster.ConnectionStatus = result.connectionStatus
	cluster.Health = result.health
	if result.kubernetesVersion != "" {
		cluster.KubernetesVersion = result.kubernetesVersion
	}
	cluster.NodeCount = result.nodeCount
	cluster.PodCount = result.podCount
	if result.seenNow {
		now := time.Now().UTC()
		cluster.LastSeen = &now
	}
}

// probe determines Connection Status from reachability alone (can Klyro talk
// to the API server at all) — a list call failing afterward (e.g. an
// RBAC-denied list) does not make the Cluster unreachable, it just means
// Health can't be trusted, so it's reported red without downgrading
// Connection Status.
func probe(ctx context.Context, client *kube.Client) probeResult {
	version, err := client.ServerVersion()
	if err != nil {
		return probeResult{connectionStatus: ConnectionStatusUnreachable, health: HealthRed}
	}

	nodes, err := client.ListNodes(ctx)
	if err != nil {
		return probeResult{connectionStatus: ConnectionStatusConnected, health: HealthRed, kubernetesVersion: version, seenNow: true}
	}
	deployments, err := client.ListDeployments(ctx)
	if err != nil {
		return probeResult{connectionStatus: ConnectionStatusConnected, health: HealthRed, kubernetesVersion: version, nodeCount: len(nodes), seenNow: true}
	}
	statefulSets, err := client.ListStatefulSets(ctx)
	if err != nil {
		return probeResult{connectionStatus: ConnectionStatusConnected, health: HealthRed, kubernetesVersion: version, nodeCount: len(nodes), seenNow: true}
	}
	daemonSets, err := client.ListDaemonSets(ctx)
	if err != nil {
		return probeResult{connectionStatus: ConnectionStatusConnected, health: HealthRed, kubernetesVersion: version, nodeCount: len(nodes), seenNow: true}
	}
	pods, err := client.ListPods(ctx, "")
	if err != nil {
		return probeResult{connectionStatus: ConnectionStatusConnected, health: HealthRed, kubernetesVersion: version, nodeCount: len(nodes), seenNow: true}
	}

	health := computeHealth(snapshot{nodes: nodes, deployments: deployments, statefulSets: statefulSets, daemonSets: daemonSets})
	return probeResult{
		connectionStatus:  ConnectionStatusConnected,
		health:            health,
		kubernetesVersion: version,
		nodeCount:         len(nodes),
		podCount:          len(pods),
		seenNow:           true,
	}
}

func generateID() string {
	buf := make([]byte, 16)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}
