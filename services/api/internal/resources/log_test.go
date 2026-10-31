package resources_test

import (
	"io"
	"net/http"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	fakeclient "k8s.io/client-go/kubernetes/fake"
)

func podWithContainers(name, namespace string, containerNames ...string) *corev1.Pod {
	containers := make([]corev1.Container, 0, len(containerNames))
	for _, n := range containerNames {
		containers = append(containers, corev1.Container{Name: n, Image: "nginx:1.25"})
	}
	return &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Spec:       corev1.PodSpec{Containers: containers},
	}
}

// getSSEBody fetches url, confirms it responds as an SSE stream, and
// returns the full body (the fake clientset's log stream ends on its own
// with a fixed "fake logs" payload, so this never hangs).
func getSSEBody(t *testing.T, url string) (*http.Response, string) {
	t.Helper()
	resp, err := http.Get(url)
	if err != nil {
		t.Fatalf("GET %s: %v", url, err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("reading body: %v", err)
	}
	return resp, string(body)
}

func TestStreamPodLogs_SingleContainerReturnsSSE(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(podWithContainers("web-1", "default", "web"))
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getSSEBody(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods/default/web-1/logs")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %q", resp.StatusCode, body)
	}
	if ct := resp.Header.Get("Content-Type"); ct != "text/event-stream" {
		t.Errorf("Content-Type = %q, want text/event-stream", ct)
	}
	if body != "data: fake logs\n\n" {
		t.Errorf("body = %q, want a single SSE data event carrying the log line", body)
	}
}

func TestStreamPodLogs_MultiContainerRequiresContainerParam(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(podWithContainers("web-1", "default", "web", "sidecar"))
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods/default/web-1/logs")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestStreamPodLogs_MultiContainerWithValidContainerParamReturnsSSE(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(podWithContainers("web-1", "default", "web", "sidecar"))
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getSSEBody(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods/default/web-1/logs?container=sidecar")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %q", resp.StatusCode, body)
	}
}

func TestStreamPodLogs_UnknownContainerIs400(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(podWithContainers("web-1", "default", "web"))
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods/default/web-1/logs?container=does-not-exist")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestStreamPodLogs_UnknownNameIs404(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods/default/does-not-exist/logs")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestStreamPodLogs_UnknownClusterIs404(t *testing.T) {
	srv, _ := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/does-not-exist/pods/default/web-1/logs")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestStreamPodLogs_InvalidNamespaceIs400(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods/Not_Valid!/web-1/logs")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}
