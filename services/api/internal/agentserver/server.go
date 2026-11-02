// Package agentserver implements AgentService: the gRPC endpoint cluster
// agents connect to. Agents dial out to this server over mTLS (see
// AGENTS.md §5, Cluster connectivity) — this package never dials an agent.
package agentserver

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"sync"

	agentv1 "github.com/yonigofman/klyro/packages/protocol/agent/v1"
	"github.com/yonigofman/klyro/services/api/internal/clusters"
)

var ErrClusterNotConnected = errors.New("cluster has no live agent connection")

type Server struct {
	agentv1.UnimplementedAgentServiceServer

	store *clusters.Store
	log   *slog.Logger

	connsMu sync.RWMutex
	conns   map[string]*conn // clusterID -> live stream handle
}

func New(store *clusters.Store, log *slog.Logger) *Server {
	return &Server{store: store, log: log, conns: make(map[string]*conn)}
}

// ClusterSummary is the REST-facing view of a registered cluster.
type ClusterSummary struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Connected bool   `json:"connected"`
}

func (s *Server) ListClusters() []ClusterSummary {
	s.connsMu.RLock()
	defer s.connsMu.RUnlock()

	out := make([]ClusterSummary, 0)
	for _, c := range s.store.List() {
		_, connected := s.conns[c.ID]
		out = append(out, ClusterSummary{ID: c.ID, Name: c.Name, Connected: connected})
	}
	return out
}

// ListResources asks the connected agent for clusterID to list one kind of
// resource, and waits for its reply. Returns ErrClusterNotConnected if no
// agent is currently connected for that cluster.
func (s *Server) ListResources(ctx context.Context, clusterID, kind, namespace string) (*agentv1.ListResourcesResponse, error) {
	s.connsMu.RLock()
	c, ok := s.conns[clusterID]
	s.connsMu.RUnlock()
	if !ok {
		return nil, ErrClusterNotConnected
	}
	return c.ListResources(ctx, kind, namespace)
}

func (s *Server) Connect(stream agentv1.AgentService_ConnectServer) error {
	first, err := stream.Recv()
	if err != nil {
		return err
	}

	register := first.GetRegister()
	if register == nil {
		return errors.New("first message on an agent connection must be a RegisterRequest")
	}

	cluster := s.store.Register(register.GetClusterName(), register.GetAgentVersion())
	s.log.Info("cluster registered", "cluster_id", cluster.ID, "name", cluster.Name)

	c := newConn(stream)
	s.connsMu.Lock()
	s.conns[cluster.ID] = c
	s.connsMu.Unlock()
	defer func() {
		s.connsMu.Lock()
		delete(s.conns, cluster.ID)
		s.connsMu.Unlock()
	}()

	if err := c.send(&agentv1.ServerMessage{
		Payload: &agentv1.ServerMessage_RegisterAck{
			RegisterAck: &agentv1.RegisterAck{ClusterId: cluster.ID},
		},
	}); err != nil {
		return err
	}

	for {
		msg, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			s.log.Info("agent disconnected", "cluster_id", cluster.ID)
			return nil
		}
		if err != nil {
			return err
		}

		switch {
		case msg.GetHeartbeat() != nil:
			s.handleHeartbeat(c, msg.GetHeartbeat())
		case msg.GetListResourcesResponse() != nil:
			c.resolve(msg.GetListResourcesResponse())
		}
	}
}

func (s *Server) handleHeartbeat(c *conn, hb *agentv1.Heartbeat) {
	status := clusters.HealthStatus(hb.GetStatus())
	caps := clusters.Capabilities{
		KubernetesVersion:  hb.GetCapabilities().GetKubernetesVersion(),
		NodeCount:          hb.GetCapabilities().GetNodeCount(),
		DiscoveryAvailable: hb.GetCapabilities().GetDiscoveryAvailable(),
	}

	updated, ok := s.store.Heartbeat(hb.GetClusterId(), status, caps)
	if !ok {
		s.log.Warn("heartbeat for unknown cluster", "cluster_id", hb.GetClusterId())
		return
	}
	s.log.Info("heartbeat", "cluster_id", updated.ID, "k8s_version", caps.KubernetesVersion, "nodes", caps.NodeCount)

	if err := c.send(&agentv1.ServerMessage{
		Payload: &agentv1.ServerMessage_HeartbeatAck{
			HeartbeatAck: &agentv1.HeartbeatAck{ServerTimeUnix: updated.LastSeenAt.Unix()},
		},
	}); err != nil {
		s.log.Warn("failed to send heartbeat ack", "cluster_id", updated.ID, "error", err)
	}
}
