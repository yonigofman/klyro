// Package main is the entrypoint for the Klyro Kubernetes agent.
//
// Phase 5 adds the first real capability: the agent dials out to
// services/api over mTLS, registers, and streams heartbeats carrying
// client-go-discovered cluster capabilities. Executing authorized
// operations and informer-based watches are later phases.
package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"

	agentv1 "github.com/yonigofman/klyro/packages/protocol/agent/v1"
	"github.com/yonigofman/klyro/services/agent/internal/connector"
	"github.com/yonigofman/klyro/services/agent/internal/discovery"
)

func main() {
	log := slog.New(slog.NewTextHandler(os.Stdout, nil))

	certDir := envOr("KLYRO_CERT_DIR", "../../.dev/certs")
	serverAddr := envOr("KLYRO_API_GRPC_ADDR", "localhost:9443")
	serverName := envOr("KLYRO_API_TLS_SERVER_NAME", "localhost")
	clusterName := envOr("KLYRO_CLUSTER_NAME", "local-dev")
	kubeconfigPath := os.Getenv("KUBECONFIG")

	tlsConfig, err := clientTLSConfig(certDir, serverName)
	if err != nil {
		log.Error("failed to load TLS config", "error", err)
		os.Exit(1)
	}

	conn, err := grpc.NewClient(serverAddr, grpc.WithTransportCredentials(credentials.NewTLS(tlsConfig)))
	if err != nil {
		log.Error("failed to dial api", "addr", serverAddr, "error", err)
		os.Exit(1)
	}
	defer func() { _ = conn.Close() }()

	client := agentv1.NewAgentServiceClient(conn)

	clientset, err := discovery.NewClientset(kubeconfigPath)
	if err != nil {
		log.Warn("no cluster reachable yet; will report degraded health", "error", err)
		clientset = nil
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	log.Info("connecting to api", "addr", serverAddr, "cluster_name", clusterName)

	runWithReconnect(ctx, client, connector.Config{
		ClusterName:    clusterName,
		AgentVersion:   "v0.0.0-dev",
		Clientset:      clientset,
		HeartbeatEvery: 5 * time.Second,
	}, log)

	log.Info("shut down cleanly")
}

// runWithReconnect keeps calling connector.Run until ctx is canceled. The
// api may not be listening yet (dev startup order) or may restart; a
// disconnected agent should keep trying, not exit. Backoff caps at 10s.
func runWithReconnect(ctx context.Context, client agentv1.AgentServiceClient, cfg connector.Config, log *slog.Logger) {
	backoff := time.Second
	const maxBackoff = 10 * time.Second

	for ctx.Err() == nil {
		startedAt := time.Now()
		err := connector.Run(ctx, client, cfg, log)
		if ctx.Err() != nil {
			return
		}
		if err != nil {
			log.Warn("connector stopped, reconnecting", "error", err, "retry_in", backoff)
		}

		if time.Since(startedAt) > 5*time.Second {
			backoff = time.Second // it was connected a while; don't punish a later, unrelated drop
		}

		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}

		backoff *= 2
		if backoff > maxBackoff {
			backoff = maxBackoff
		}
	}
}

func clientTLSConfig(certDir, serverName string) (*tls.Config, error) {
	cert, err := tls.LoadX509KeyPair(certDir+"/agent-cert.pem", certDir+"/agent-key.pem")
	if err != nil {
		return nil, err
	}

	caBytes, err := os.ReadFile(certDir + "/ca-cert.pem")
	if err != nil {
		return nil, err
	}
	caPool := x509.NewCertPool()
	caPool.AppendCertsFromPEM(caBytes)

	return &tls.Config{
		Certificates: []tls.Certificate{cert},
		RootCAs:      caPool,
		ServerName:   serverName,
		MinVersion:   tls.VersionTLS13,
	}, nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
