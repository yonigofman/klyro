package agentserver

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"

	agentv1 "github.com/yonigofman/klyro/packages/protocol/agent/v1"
	"github.com/yonigofman/klyro/services/api/internal/clusters"
)

func dial(t *testing.T) agentv1.AgentServiceClient {
	t.Helper()

	lis := bufconn.Listen(1024 * 1024)
	t.Cleanup(func() { _ = lis.Close() })

	grpcServer := grpc.NewServer()
	store := clusters.NewStore()
	agentv1.RegisterAgentServiceServer(grpcServer, New(store, slog.Default()))

	go func() { _ = grpcServer.Serve(lis) }()
	t.Cleanup(grpcServer.Stop)

	conn, err := grpc.NewClient("passthrough:///bufnet",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		t.Fatalf("grpc.NewClient() error = %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	return agentv1.NewAgentServiceClient(conn)
}

func TestConnect_RegisterThenHeartbeat(t *testing.T) {
	client := dial(t)

	stream, err := client.Connect(context.Background())
	if err != nil {
		t.Fatalf("Connect() error = %v", err)
	}

	if err := stream.Send(&agentv1.AgentMessage{
		Payload: &agentv1.AgentMessage_Register{
			Register: &agentv1.RegisterRequest{ClusterName: "test-cluster", AgentVersion: "v0.0.0-test"},
		},
	}); err != nil {
		t.Fatalf("Send(register) error = %v", err)
	}

	ackMsg, err := stream.Recv()
	if err != nil {
		t.Fatalf("Recv(register ack) error = %v", err)
	}
	ack := ackMsg.GetRegisterAck()
	if ack == nil {
		t.Fatalf("expected RegisterAck, got %T", ackMsg.GetPayload())
	}
	if ack.GetClusterId() == "" {
		t.Error("RegisterAck.ClusterId is empty")
	}

	if err := stream.Send(&agentv1.AgentMessage{
		Payload: &agentv1.AgentMessage_Heartbeat{
			Heartbeat: &agentv1.Heartbeat{
				ClusterId: ack.GetClusterId(),
				Status:    agentv1.HealthStatus_HEALTH_STATUS_HEALTHY,
				Capabilities: &agentv1.Capabilities{
					KubernetesVersion:  "v1.35.0",
					NodeCount:          1,
					DiscoveryAvailable: true,
				},
			},
		},
	}); err != nil {
		t.Fatalf("Send(heartbeat) error = %v", err)
	}

	hbAckMsg, err := stream.Recv()
	if err != nil {
		t.Fatalf("Recv(heartbeat ack) error = %v", err)
	}
	if hbAckMsg.GetHeartbeatAck() == nil {
		t.Fatalf("expected HeartbeatAck, got %T", hbAckMsg.GetPayload())
	}

	if err := stream.CloseSend(); err != nil {
		t.Fatalf("CloseSend() error = %v", err)
	}
	if _, err := stream.Recv(); err != io.EOF {
		t.Errorf("Recv() after close = %v, want io.EOF", err)
	}
}

// dialWithServer is like dial but also returns the *Server, so a test can
// call ListResources on it directly — simulating what the REST handler
// does — while a fake "agent" goroutine answers over the same connection.
func dialWithServer(t *testing.T) (*Server, agentv1.AgentServiceClient) {
	t.Helper()

	lis := bufconn.Listen(1024 * 1024)
	t.Cleanup(func() { _ = lis.Close() })

	grpcServer := grpc.NewServer()
	store := clusters.NewStore()
	srv := New(store, slog.Default())
	agentv1.RegisterAgentServiceServer(grpcServer, srv)

	go func() { _ = grpcServer.Serve(lis) }()
	t.Cleanup(grpcServer.Stop)

	conn, err := grpc.NewClient("passthrough:///bufnet",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		t.Fatalf("grpc.NewClient() error = %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	return srv, agentv1.NewAgentServiceClient(conn)
}

func TestListResources_RoundTrip(t *testing.T) {
	srv, client := dialWithServer(t)

	stream, err := client.Connect(context.Background())
	if err != nil {
		t.Fatalf("Connect() error = %v", err)
	}
	if err := stream.Send(&agentv1.AgentMessage{
		Payload: &agentv1.AgentMessage_Register{
			Register: &agentv1.RegisterRequest{ClusterName: "test-cluster"},
		},
	}); err != nil {
		t.Fatalf("Send(register) error = %v", err)
	}
	ackMsg, err := stream.Recv()
	if err != nil {
		t.Fatalf("Recv(register ack) error = %v", err)
	}
	clusterID := ackMsg.GetRegisterAck().GetClusterId()

	// Fake agent: whatever ListResourcesRequest arrives, answer with one pod.
	go func() {
		msg, err := stream.Recv()
		if err != nil {
			return
		}
		req := msg.GetListResourcesRequest()
		if req == nil {
			return
		}
		_ = stream.Send(&agentv1.AgentMessage{
			Payload: &agentv1.AgentMessage_ListResourcesResponse{
				ListResourcesResponse: &agentv1.ListResourcesResponse{
					RequestId: req.GetRequestId(),
					Kind:      req.GetKind(),
					Resources: []*agentv1.Resource{{Name: "web-abc123", Namespace: "default", Status: "Running"}},
				},
			},
		})
	}()

	resp, err := srv.ListResources(context.Background(), clusterID, "Pod", "default")
	if err != nil {
		t.Fatalf("ListResources() error = %v", err)
	}
	if len(resp.GetResources()) != 1 || resp.GetResources()[0].GetName() != "web-abc123" {
		t.Errorf("ListResources() = %+v, want one resource named web-abc123", resp.GetResources())
	}
}

func TestListResources_UnknownCluster(t *testing.T) {
	srv, _ := dialWithServer(t)

	_, err := srv.ListResources(context.Background(), "does-not-exist", "Pod", "default")
	if !errors.Is(err, ErrClusterNotConnected) {
		t.Errorf("ListResources() error = %v, want ErrClusterNotConnected", err)
	}
}

func TestConnect_FirstMessageMustBeRegister(t *testing.T) {
	client := dial(t)

	stream, err := client.Connect(context.Background())
	if err != nil {
		t.Fatalf("Connect() error = %v", err)
	}

	if err := stream.Send(&agentv1.AgentMessage{
		Payload: &agentv1.AgentMessage_Heartbeat{Heartbeat: &agentv1.Heartbeat{ClusterId: "nope"}},
	}); err != nil {
		t.Fatalf("Send() error = %v", err)
	}

	if _, err := stream.Recv(); err == nil {
		t.Error("expected an error when the first message is a Heartbeat, got nil")
	}
}
