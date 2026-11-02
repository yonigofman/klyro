// Package connector is the agent's gRPC client: it dials out to
// services/api over mTLS, registers, and streams periodic heartbeats. The
// agent never accepts inbound connections (see AGENTS.md §5), so requests
// from the backend (ListResources) arrive as messages pushed down this
// same stream, correlated by request_id.
package connector

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"k8s.io/client-go/kubernetes"

	agentv1 "github.com/yonigofman/klyro/packages/protocol/agent/v1"
	"github.com/yonigofman/klyro/services/agent/internal/discovery"
	"github.com/yonigofman/klyro/services/agent/internal/resources"
)

type Config struct {
	ClusterName    string
	AgentVersion   string
	Clientset      *kubernetes.Clientset // nil when no cluster is reachable yet
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
	var sendMu sync.Mutex
	send := func(msg *agentv1.AgentMessage) error {
		sendMu.Lock()
		defer sendMu.Unlock()
		return stream.Send(msg)
	}

	if err := send(&agentv1.AgentMessage{
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

	recvErrCh := make(chan error, 1)
	go func() {
		for {
			msg, err := stream.Recv()
			if err != nil {
				recvErrCh <- err
				return
			}

			switch {
			case msg.GetHeartbeatAck() != nil:
				log.Debug("heartbeat acked", "server_time", msg.GetHeartbeatAck().GetServerTimeUnix())
			case msg.GetListResourcesRequest() != nil:
				handleListResources(ctx, send, cfg, msg.GetListResourcesRequest(), log)
			}
		}
	}()

	if err := sendHeartbeat(ctx, send, ack.GetClusterId(), cfg, log); err != nil {
		return err
	}

	for {
		select {
		case <-ctx.Done():
			return stream.CloseSend()
		case err := <-recvErrCh:
			return err
		case <-ticker.C:
			if err := sendHeartbeat(ctx, send, ack.GetClusterId(), cfg, log); err != nil {
				return err
			}
		}
	}
}

func handleListResources(ctx context.Context, send func(*agentv1.AgentMessage) error, cfg Config, req *agentv1.ListResourcesRequest, log *slog.Logger) {
	log.Info("listing resources", "kind", req.GetKind(), "namespace", req.GetNamespace())

	resp := &agentv1.ListResourcesResponse{
		RequestId: req.GetRequestId(),
		Kind:      req.GetKind(),
	}

	if cfg.Clientset == nil {
		resp.Error = "no cluster is reachable from this agent"
	} else {
		items := resources.List(ctx, cfg.Clientset, req.GetKind(), req.GetNamespace())
		if items == nil {
			resp.Error = fmt.Sprintf("failed to list %s, or unsupported kind", req.GetKind())
		}
		resp.Resources = items
	}

	if err := send(&agentv1.AgentMessage{
		Payload: &agentv1.AgentMessage_ListResourcesResponse{ListResourcesResponse: resp},
	}); err != nil {
		log.Warn("failed to send list resources response", "error", err)
	}
}

func sendHeartbeat(ctx context.Context, send func(*agentv1.AgentMessage) error, clusterID string, cfg Config, log *slog.Logger) error {
	var info discovery.Info
	if cfg.Clientset != nil {
		info = discovery.GatherWith(ctx, cfg.Clientset)
	}

	status := agentv1.HealthStatus_HEALTH_STATUS_HEALTHY
	if !info.Available {
		status = agentv1.HealthStatus_HEALTH_STATUS_DEGRADED
	}

	log.Info("sending heartbeat", "k8s_version", info.KubernetesVersion, "nodes", info.NodeCount, "discovery_available", info.Available)

	return send(&agentv1.AgentMessage{
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
