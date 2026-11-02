// Package agentserver implements AgentService: the gRPC endpoint cluster
// agents connect to. Agents dial out to this server over mTLS (see
// AGENTS.md §5, Cluster connectivity) — this package never dials an agent.
package agentserver

import (
	"errors"
	"io"
	"log/slog"

	agentv1 "github.com/yonigofman/klyro/packages/protocol/agent/v1"
	"github.com/yonigofman/klyro/services/api/internal/clusters"
)

type Server struct {
	agentv1.UnimplementedAgentServiceServer

	store *clusters.Store
	log   *slog.Logger
}

func New(store *clusters.Store, log *slog.Logger) *Server {
	return &Server{store: store, log: log}
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

	if err := stream.Send(&agentv1.ServerMessage{
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

		hb := msg.GetHeartbeat()
		if hb == nil {
			continue
		}

		status := clusters.HealthStatus(hb.GetStatus())
		caps := clusters.Capabilities{
			KubernetesVersion:  hb.GetCapabilities().GetKubernetesVersion(),
			NodeCount:          hb.GetCapabilities().GetNodeCount(),
			DiscoveryAvailable: hb.GetCapabilities().GetDiscoveryAvailable(),
		}

		updated, ok := s.store.Heartbeat(hb.GetClusterId(), status, caps)
		if !ok {
			s.log.Warn("heartbeat for unknown cluster", "cluster_id", hb.GetClusterId())
			continue
		}
		s.log.Info("heartbeat", "cluster_id", updated.ID, "k8s_version", caps.KubernetesVersion, "nodes", caps.NodeCount)

		if err := stream.Send(&agentv1.ServerMessage{
			Payload: &agentv1.ServerMessage_HeartbeatAck{
				HeartbeatAck: &agentv1.HeartbeatAck{ServerTimeUnix: updated.LastSeenAt.Unix()},
			},
		}); err != nil {
			return err
		}
	}
}
