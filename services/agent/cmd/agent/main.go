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

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	log.Info("connecting to api", "addr", serverAddr, "cluster_name", clusterName)

	if err := connector.Run(ctx, client, connector.Config{
		ClusterName:    clusterName,
		AgentVersion:   "v0.0.0-dev",
		KubeconfigPath: kubeconfigPath,
		HeartbeatEvery: 5 * time.Second,
	}, log); err != nil && ctx.Err() == nil {
		log.Error("connector stopped", "error", err)
		os.Exit(1)
	}

	log.Info("shut down cleanly")
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
