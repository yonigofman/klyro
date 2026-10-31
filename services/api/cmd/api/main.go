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
	"github.com/yonigofman/klyro/services/api/internal/resources"
)

const clusterRefreshInterval = 30 * time.Second

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	clusterService := clusters.NewService(kubernetes.NewDialer())
	go refreshClustersPeriodically(ctx, clusterService)

	resourcesService := resources.NewService(clusterService)

	mux := http.NewServeMux()
	clusters.NewHandler(clusterService).Register(mux)
	resources.NewHandler(resourcesService).Register(mux)

	addr := ":" + port()
	server := &http.Server{Addr: addr, Handler: withCORS(mux)}

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

// withCORS allows the frontend dev server (a different origin/port than the
// API) to call these endpoints. No cookies/credentials are used, so
// reflecting the request's Origin is safe without Allow-Credentials.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if origin := r.Header.Get("Origin"); origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func port() string {
	if p := os.Getenv("PORT"); p != "" {
		return p
	}
	return "8080"
}
