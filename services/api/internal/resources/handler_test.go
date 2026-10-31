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
	namespace   = testsupport.Namespace
	pod         = testsupport.Pod
	deployment  = testsupport.Deployment
	statefulSet = testsupport.StatefulSet
	daemonSet   = testsupport.DaemonSet
	service     = testsupport.Service
	ingress     = testsupport.Ingress
	node        = testsupport.Node
	event       = testsupport.Event
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

// --- workloads ---------------------------------------------------------

func TestListWorkloads_MergesDeploymentsStatefulSetsDaemonSets(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		deployment("web", "default", 3, 2),
		statefulSet("db", "default", 3, 3),
		daemonSet("logger", "default", 5, 5),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/workloads")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 3 {
		t.Fatalf("got %d workloads, want 3: %v", len(body), body)
	}

	byName := map[string]map[string]any{}
	for _, w := range body {
		byName[w["name"].(string)] = w
	}
	if byName["web"]["kind"] != "Deployment" || byName["web"]["desired"] != float64(3) || byName["web"]["ready"] != float64(2) {
		t.Errorf("web workload = %v, want Deployment 3/2", byName["web"])
	}
	if byName["db"]["kind"] != "StatefulSet" || byName["db"]["ready"] != float64(3) {
		t.Errorf("db workload = %v, want StatefulSet 3/3", byName["db"])
	}
	if byName["logger"]["kind"] != "DaemonSet" || byName["logger"]["desired"] != float64(5) {
		t.Errorf("logger workload = %v, want DaemonSet 5/5", byName["logger"])
	}
}

func TestListWorkloads_FilteredByNamespaceQueryParam(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		deployment("web", "default", 1, 1),
		deployment("worker", "jobs", 1, 1),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/workloads?namespace=jobs")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 1 || body[0]["name"] != "worker" {
		t.Fatalf("got %v, want only worker", body)
	}
}

func TestListWorkloads_EmptyClusterReturnsEmptyList(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/workloads")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 0 {
		t.Errorf("got %v, want empty list", body)
	}
}

func TestListWorkloads_InvalidNamespaceIs400(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/workloads?namespace=Not_Valid!")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestListWorkloads_UnknownClusterIs404(t *testing.T) {
	srv, _ := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/does-not-exist/workloads")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

// --- services ---------------------------------------------------------

func TestListServices_ReturnsServicesWithPorts(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		service("web", "default", corev1.ServiceTypeClusterIP, "10.0.0.1", 80, 443),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/services")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 1 {
		t.Fatalf("got %d services, want 1: %v", len(body), body)
	}
	if body[0]["type"] != "ClusterIP" || body[0]["clusterIP"] != "10.0.0.1" {
		t.Errorf("service = %v, want ClusterIP/10.0.0.1", body[0])
	}
	ports, ok := body[0]["ports"].([]any)
	if !ok || len(ports) != 2 || ports[0] != "80/TCP" || ports[1] != "443/TCP" {
		t.Errorf("ports = %v, want [80/TCP 443/TCP]", body[0]["ports"])
	}
}

func TestListServices_FilteredByNamespace(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		service("web", "default", corev1.ServiceTypeClusterIP, "10.0.0.1", 80),
		service("worker", "jobs", corev1.ServiceTypeClusterIP, "10.0.0.2", 80),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/services?namespace=jobs")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 1 || body[0]["name"] != "worker" {
		t.Fatalf("got %v, want only worker", body)
	}
}

func TestListServices_UnknownClusterIs404(t *testing.T) {
	srv, _ := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/does-not-exist/services")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestListServices_EmptyClusterReturnsEmptyList(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/services")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 0 {
		t.Errorf("got %v, want empty list", body)
	}
}

func TestListServices_InvalidNamespaceIs400(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/services?namespace=Not_Valid!")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

// --- ingresses ---------------------------------------------------------

func TestListIngresses_ReturnsHosts(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		ingress("web", "default", "web.example.com", "api.example.com"),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/ingresses")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 1 {
		t.Fatalf("got %d ingresses, want 1: %v", len(body), body)
	}
	hosts, ok := body[0]["hosts"].([]any)
	if !ok || len(hosts) != 2 || hosts[0] != "web.example.com" || hosts[1] != "api.example.com" {
		t.Errorf("hosts = %v, want [web.example.com api.example.com]", body[0]["hosts"])
	}
}

func TestListIngresses_FilteredByNamespace(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		ingress("web", "default", "web.example.com"),
		ingress("worker", "jobs", "jobs.example.com"),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/ingresses?namespace=jobs")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 1 || body[0]["name"] != "worker" {
		t.Fatalf("got %v, want only worker", body)
	}
}

func TestListIngresses_UnknownClusterIs404(t *testing.T) {
	srv, _ := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/does-not-exist/ingresses")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestListIngresses_EmptyClusterReturnsEmptyList(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/ingresses")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 0 {
		t.Errorf("got %v, want empty list", body)
	}
}

func TestListIngresses_InvalidNamespaceIs400(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/ingresses?namespace=Not_Valid!")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

// --- nodes --------------------------------------------------------------

func TestListNodes_ReturnsNodesWithReadyStatus(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		node("node-a", true),
		node("node-b", false),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/nodes")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 2 {
		t.Fatalf("got %d nodes, want 2: %v", len(body), body)
	}
	byName := map[string]map[string]any{}
	for _, n := range body {
		byName[n["name"].(string)] = n
	}
	if byName["node-a"]["ready"] != true {
		t.Errorf("node-a ready = %v, want true", byName["node-a"]["ready"])
	}
	if byName["node-b"]["ready"] != false {
		t.Errorf("node-b ready = %v, want false", byName["node-b"]["ready"])
	}
}

func TestListNodes_UnknownClusterIs404(t *testing.T) {
	srv, _ := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/does-not-exist/nodes")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

// --- events --------------------------------------------------------------

func TestListEvents_ReturnsEventsAboutInvolvedObject(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		event("web-1.abc", "default", "Warning", "BackOff", "container crashed", "Pod", "web-1", 3),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/events")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 1 {
		t.Fatalf("got %d events, want 1: %v", len(body), body)
	}
	e := body[0]
	if e["type"] != "Warning" || e["reason"] != "BackOff" || e["involvedObjectKind"] != "Pod" || e["involvedObjectName"] != "web-1" {
		t.Errorf("event = %v, want Warning/BackOff about Pod/web-1", e)
	}
	if e["count"] != float64(3) {
		t.Errorf("count = %v, want 3", e["count"])
	}
}

func TestListEvents_FilteredByNamespace(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		event("web-1.abc", "default", "Normal", "Scheduled", "scheduled", "Pod", "web-1", 1),
		event("worker-1.abc", "jobs", "Normal", "Scheduled", "scheduled", "Pod", "worker-1", 1),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/events?namespace=jobs")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 1 || body[0]["involvedObjectName"] != "worker-1" {
		t.Fatalf("got %v, want only the jobs-namespace event", body)
	}
}

func TestListEvents_UnknownClusterIs404(t *testing.T) {
	srv, _ := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/does-not-exist/events")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestListEvents_EmptyClusterReturnsEmptyList(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, body := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/events")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if len(body) != 0 {
		t.Errorf("got %v, want empty list", body)
	}
}

func TestListEvents_InvalidNamespaceIs400(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/events?namespace=Not_Valid!")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}
