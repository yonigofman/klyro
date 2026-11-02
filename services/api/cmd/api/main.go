// Package main is the entrypoint for the Klyro API service.
//
// Phase 5 adds the first real capability: an mTLS gRPC server that cluster
// agents dial into to register and report health. REST/HTTP endpoints and
// the modules AGENTS.md describes (Identity, Authorization, Resources, ...)
// are later phases.
package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"syscall"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"

	agentv1 "github.com/yonigofman/klyro/packages/protocol/agent/v1"
	"github.com/yonigofman/klyro/services/api/internal/agentserver"
	"github.com/yonigofman/klyro/services/api/internal/clusters"
)

func main() {
	log := slog.New(slog.NewTextHandler(os.Stdout, nil))

	certDir := envOr("KLYRO_CERT_DIR", "../../.dev/certs")
	addr := envOr("KLYRO_AGENT_GRPC_ADDR", ":9443")

	tlsConfig, err := serverTLSConfig(certDir)
	if err != nil {
		log.Error("failed to load TLS config", "error", err)
		os.Exit(1)
	}

	lis, err := net.Listen("tcp", addr)
	if err != nil {
		log.Error("failed to listen", "addr", addr, "error", err)
		os.Exit(1)
	}

	store := clusters.NewStore()
	grpcServer := grpc.NewServer(grpc.Creds(credentials.NewTLS(tlsConfig)))
	agentv1.RegisterAgentServiceServer(grpcServer, agentserver.New(store, log))

	log.Info("agent gRPC server listening", "addr", addr)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		<-ctx.Done()
		log.Info("shutting down")
		grpcServer.GracefulStop()
	}()

	if err := grpcServer.Serve(lis); err != nil {
		log.Error("grpc server stopped", "error", err)
		os.Exit(1)
	}
}

func serverTLSConfig(certDir string) (*tls.Config, error) {
	cert, err := tls.LoadX509KeyPair(certDir+"/server-cert.pem", certDir+"/server-key.pem")
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
		ClientAuth:   tls.RequireAndVerifyClientCert,
		ClientCAs:    caPool,
		MinVersion:   tls.VersionTLS13,
	}, nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
