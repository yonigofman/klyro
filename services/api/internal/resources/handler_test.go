package resources_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	corev1 "k8s.io/api/core/v1"
	fakeclient "k8s.io/client-go/kubernetes/fake"

	"github.com/yonigofman/klyro/services/api/internal/clusters"
	"github.com/yonigofman/klyro/services/api/internal/resources"
	"github.com/yonigofman/klyro/services/api/internal/testsupport"
)

// newTestServer wires clusters + resources exactly as cmd/api/main.go does,
// registers one Cluster against the given fake clientset, and returns the
// server plus that Cluster's ID.
func newTestServer(t *testing.T, cs *fakeclient.Clientset) (*httptest.Server, string) {
	t.Helper()

	clusterService := clusters.NewService(testsupport.FakeDialer(cs))
	resourcesService := resources.NewService(clusterService)

	mux := http.NewServeMux()
	clusters.NewHandler(clusterService).Register(mux)
	resources.NewHandler(resourcesService).Register(mux)

	registered, err := clusterService.Register(context.Background(), clusters.RegisterRequest{
		Kubeconfig: testsupport.SingleContextKubeconfig("test"),
	})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}

	return httptest.NewServer(mux), registered.ID
}

var (
	namespace = testsupport.Namespace
	pod       = testsupport.Pod
)

func getJSON(t *testing.T, url string) (*http.Response, []map[string]any) {
	t.Helper()
	resp, err := http.Get(url)
	if err != nil {
		t.Fatalf("GET %s: %v", url, err)
	}
	defer resp.Body.Close()
	var body []map[string]any
	if resp.StatusCode == http.StatusOK {
		if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
			t.Fatalf("decode: %v", err)
		}
	}
	return resp, body
}

func TestListNamespaces_ReturnsRegisteredNamespaces(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		namespace("default", corev1.NamespaceActive),
		namespace("kube-system", corev1.NamespaceActive),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/namespaces")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 2 {
		t.Fatalf("got %d namespaces, want 2: %v", len(body), body)
	}
	names := map[string]bool{}
	for _, ns := range body {
		names[ns["name"].(string)] = true
		if ns["status"] != "Active" {
			t.Errorf("status = %v, want Active", ns["status"])
		}
	}
	if !names["default"] || !names["kube-system"] {
		t.Errorf("missing expected namespace names, got %v", body)
	}
}

func TestListNamespaces_EmptyClusterReturnsEmptyList(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/namespaces")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 0 {
		t.Errorf("got %v, want empty list", body)
	}
}

func TestListNamespaces_UnknownClusterIs404(t *testing.T) {
	srv, _ := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/does-not-exist/namespaces")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestListPods_AllNamespacesByDefault(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		pod("web-1", "default", "node-a", 2, 2, 0),
		pod("worker-1", "jobs", "node-a", 1, 1, 3),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 2 {
		t.Fatalf("got %d pods, want 2: %v", len(body), body)
	}
}

func TestListPods_FilteredByNamespaceQueryParam(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		pod("web-1", "default", "node-a", 2, 2, 0),
		pod("worker-1", "jobs", "node-a", 1, 1, 0),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods?namespace=jobs")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 1 || body[0]["name"] != "worker-1" {
		t.Fatalf("got %v, want only worker-1", body)
	}
}

func TestListPods_ReadyAndRestartsComputedFromContainerStatuses(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(pod("web-1", "default", "node-a", 1, 2, 4))
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	_, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods")
	if len(body) != 1 {
		t.Fatalf("got %d pods, want 1", len(body))
	}
	if body[0]["ready"] != "1/2" {
		t.Errorf("ready = %v, want 1/2", body[0]["ready"])
	}
	if body[0]["restarts"] != float64(8) {
		t.Errorf("restarts = %v, want 8 (4 per container * 2 containers)", body[0]["restarts"])
	}
	if body[0]["node"] != "node-a" {
		t.Errorf("node = %v, want node-a", body[0]["node"])
	}
}

func TestListPods_InvalidNamespaceQueryParamIs400(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods?namespace=Not_Valid!")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestListPods_UnknownClusterIs404(t *testing.T) {
	srv, _ := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/does-not-exist/pods")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}
