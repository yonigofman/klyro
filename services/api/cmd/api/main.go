package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/yonigofman/klyro/services/api/internal/clusters"
	"github.com/yonigofman/klyro/services/api/internal/kubernetes"
)

const clusterRefreshInterval = 30 * time.Second

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	clusterService := clusters.NewService(kubernetes.NewDialer())
	go refreshClustersPeriodically(ctx, clusterService)

	mux := http.NewServeMux()
	clusters.NewHandler(clusterService).Register(mux)

	addr := ":" + port()
	server := &http.Server{Addr: addr, Handler: mux}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}()

	slog.Info("klyro api listening", "addr", addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}

func refreshClustersPeriodically(ctx context.Context, service *clusters.Service) {
	ticker := time.NewTicker(clusterRefreshInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			service.RefreshAll(ctx)
		}
	}
}

func port() string {
	if p := os.Getenv("PORT"); p != "" {
		return p
	}
	return "8080"
}
