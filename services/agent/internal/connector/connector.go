// Package connector is the agent's gRPC client: it dials out to
// services/api over mTLS, registers, and streams periodic heartbeats. The
// agent never accepts inbound connections (see AGENTS.md §5).
package connector

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	agentv1 "github.com/yonigofman/klyro/packages/protocol/agent/v1"
	"github.com/yonigofman/klyro/services/agent/internal/discovery"
)

type Config struct {
	ClusterName    string
	AgentVersion   string
	KubeconfigPath string
	HeartbeatEvery time.Duration
}

// Run connects once, registers, and streams heartbeats until ctx is
// canceled or the stream breaks. Callers that want reconnection should
// call Run in a retry loop.
func Run(ctx context.Context, client agentv1.AgentServiceClient, cfg Config, log *slog.Logger) error {
	stream, err := client.Connect(ctx)
	if err != nil {
		return fmt.Errorf("connect: %w", err)
	}

	if err := stream.Send(&agentv1.AgentMessage{
		Payload: &agentv1.AgentMessage_Register{
			Register: &agentv1.RegisterRequest{
				ClusterName:  cfg.ClusterName,
				AgentVersion: cfg.AgentVersion,
			},
		},
	}); err != nil {
		return fmt.Errorf("send register: %w", err)
	}

	ackMsg, err := stream.Recv()
	if err != nil {
		return fmt.Errorf("recv register ack: %w", err)
	}
	ack := ackMsg.GetRegisterAck()
	if ack == nil {
		return fmt.Errorf("expected RegisterAck, got %T", ackMsg.GetPayload())
	}
	log.Info("registered", "cluster_id", ack.GetClusterId(), "cluster_name", cfg.ClusterName)

	interval := cfg.HeartbeatEvery
	if interval <= 0 {
		interval = 10 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Receive acks on a separate goroutine so a slow/absent server
	// response never blocks the heartbeat send loop.
	go func() {
		for {
			msg, err := stream.Recv()
			if err != nil {
				return
			}
			if hbAck := msg.GetHeartbeatAck(); hbAck != nil {
				log.Debug("heartbeat acked", "server_time", hbAck.GetServerTimeUnix())
			}
		}
	}()

	if err := sendHeartbeat(ctx, stream, ack.GetClusterId(), cfg, log); err != nil {
		return err
	}

	for {
		select {
		case <-ctx.Done():
			return stream.CloseSend()
		case <-ticker.C:
			if err := sendHeartbeat(ctx, stream, ack.GetClusterId(), cfg, log); err != nil {
				return err
			}
		}
	}
}

func sendHeartbeat(ctx context.Context, stream agentv1.AgentService_ConnectClient, clusterID string, cfg Config, log *slog.Logger) error {
	info := discovery.Gather(ctx, cfg.KubeconfigPath)
	status := agentv1.HealthStatus_HEALTH_STATUS_HEALTHY
	if !info.Available {
		status = agentv1.HealthStatus_HEALTH_STATUS_DEGRADED
	}

	log.Info("sending heartbeat", "k8s_version", info.KubernetesVersion, "nodes", info.NodeCount, "discovery_available", info.Available)

	return stream.Send(&agentv1.AgentMessage{
		Payload: &agentv1.AgentMessage_Heartbeat{
			Heartbeat: &agentv1.Heartbeat{
				ClusterId: clusterID,
				Status:    status,
				Capabilities: &agentv1.Capabilities{
					KubernetesVersion:  info.KubernetesVersion,
					NodeCount:          info.NodeCount,
					DiscoveryAvailable: info.Available,
				},
			},
		},
	})
}
