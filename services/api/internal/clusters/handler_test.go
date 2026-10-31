package clusters_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	kubeclient "k8s.io/client-go/kubernetes"
	fakeclient "k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"

	"github.com/yonigofman/klyro/services/api/internal/clusters"
	"github.com/yonigofman/klyro/services/api/internal/testsupport"
)

// --- test server wiring -----------------------------------------------------

// newTestServer builds a clusters HTTP handler whose Dialer always hands back
// the given fake clientset, regardless of what kubeconfig bytes are sent in —
// this exercises the real Dial() parsing/context logic while substituting a
// deterministic clientset for the network call client-go would otherwise make.
func newTestServer(clientset kubeclient.Interface) *httptest.Server {
	service := clusters.NewService(testsupport.FakeDialer(clientset))
	mux := http.NewServeMux()
	clusters.NewHandler(service).Register(mux)
	return httptest.NewServer(mux)
}

// --- fixtures ----------------------------------------------------------------
//
// Node, Deployment, Pod, SingleContextKubeconfig and MultiContextKubeconfig
// live in internal/testsupport, shared with internal/resources' tests.

var (
	node                            = testsupport.Node
	deployment                      = testsupport.Deployment
	pod                             = testsupport.Pod
	singleContextKubeconfig         = testsupport.SingleContextKubeconfig
	multiContextKubeconfigNoCurrent = testsupport.MultiContextKubeconfig
	setFakedServerVersion           = testsupport.SetFakedServerVersion
)

// --- HTTP helpers --------------------------------------------------------------

type registerBody struct {
	Kubeconfig  string            `json:"kubeconfig"`
	Context     string            `json:"context,omitempty"`
	DisplayName string            `json:"displayName,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

func postRegister(t *testing.T, srv *httptest.Server, body registerBody) (*http.Response, map[string]any) {
	t.Helper()
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}
	resp, err := http.Post(srv.URL+"/api/v1/clusters", "application/json", bytes.NewReader(raw))
	if err != nil {
		t.Fatalf("POST /api/v1/clusters: %v", err)
	}
	defer resp.Body.Close()
	var decoded map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return resp, decoded
}

func getJSON(t *testing.T, url string) (*http.Response, []byte) {
	t.Helper()
	resp, err := http.Get(url)
	if err != nil {
		t.Fatalf("GET %s: %v", url, err)
	}
	defer resp.Body.Close()
	var buf bytes.Buffer
	if _, err := buf.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read body: %v", err)
	}
	return resp, buf.Bytes()
}

// --- tests ----------------------------------------------------------------

func TestRegister_HealthyClusterIsGreen(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		node("node-a", true),
		node("node-b", true),
		deployment("web", 2, 2),
		pod("web-abc12", "default", "node-a", 1, 1, 0),
		pod("web-def34", "default", "node-a", 1, 1, 0),
	)
	setFakedServerVersion(cs, "v1.30.1")
	srv := newTestServer(cs)
	defer srv.Close()

	before := time.Now().UTC()
	resp, body := postRegister(t, srv, registerBody{Kubeconfig: singleContextKubeconfig("prod")})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body = %v", resp.StatusCode, body)
	}
	if body["connectionStatus"] != "connected" {
		t.Errorf("connectionStatus = %v, want connected", body["connectionStatus"])
	}
	if body["health"] != "green" {
		t.Errorf("health = %v, want green", body["health"])
	}
	if body["context"] != "prod" {
		t.Errorf("context = %v, want prod", body["context"])
	}
	if body["displayName"] != "prod" {
		t.Errorf("displayName = %v, want prod (defaulted from context)", body["displayName"])
	}
	if body["kubernetesVersion"] != "v1.30.1" {
		t.Errorf("kubernetesVersion = %v, want v1.30.1", body["kubernetesVersion"])
	}
	if body["nodeCount"] != float64(2) {
		t.Errorf("nodeCount = %v, want 2", body["nodeCount"])
	}
	if body["podCount"] != float64(2) {
		t.Errorf("podCount = %v, want 2", body["podCount"])
	}
	lastSeen, ok := body["lastSeen"].(string)
	if !ok || lastSeen == "" {
		t.Fatalf("lastSeen = %v, want a timestamp", body["lastSeen"])
	}
	parsed, err := time.Parse(time.RFC3339, lastSeen)
	if err != nil {
		t.Fatalf("lastSeen %q did not parse as RFC3339: %v", lastSeen, err)
	}
	if parsed.Before(before) {
		t.Errorf("lastSeen %v is before registration started at %v", parsed, before)
	}
}

func TestRegister_ReachableButListFailureIsConnectedNotUnreachable(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(node("node-a", true))
	setFakedServerVersion(cs, "v1.30.1")
	// Simulate an RBAC-denied list: the API server answers fine (version
	// succeeds) but reading Deployments fails — this must stay "connected",
	// not be confused with "unreachable".
	cs.PrependReactor("list", "deployments", func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, fmt.Errorf("deployments is forbidden: User cannot list resource")
	})
	srv := newTestServer(cs)
	defer srv.Close()

	resp, body := postRegister(t, srv, registerBody{Kubeconfig: singleContextKubeconfig("prod")})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body = %v", resp.StatusCode, body)
	}
	if body["connectionStatus"] != "connected" {
		t.Errorf("connectionStatus = %v, want connected (the server answered; only a list was denied)", body["connectionStatus"])
	}
	if body["health"] != "red" {
		t.Errorf("health = %v, want red (can't be sure of health without seeing all workloads)", body["health"])
	}
}

func TestRegister_DegradedButNothingDownIsAmber(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		node("node-a", true),
		node("node-b", false), // 1 of 2 NotReady: not a majority
		deployment("web", 3, 2),
	)
	setFakedServerVersion(cs, "v1.30.1")
	srv := newTestServer(cs)
	defer srv.Close()

	_, body := postRegister(t, srv, registerBody{Kubeconfig: singleContextKubeconfig("staging")})
	if body["health"] != "amber" {
		t.Errorf("health = %v, want amber", body["health"])
	}
}

func TestRegister_WorkloadAtZeroReadyIsRed(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		node("node-a", true),
		deployment("web", 2, 0),
	)
	setFakedServerVersion(cs, "v1.30.1")
	srv := newTestServer(cs)
	defer srv.Close()

	_, body := postRegister(t, srv, registerBody{Kubeconfig: singleContextKubeconfig("broken")})
	if body["health"] != "red" {
		t.Errorf("health = %v, want red", body["health"])
	}
}

func TestRegister_MajorityNodesDownIsRed(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		node("node-a", false),
		node("node-b", false),
		node("node-c", true),
	)
	setFakedServerVersion(cs, "v1.30.1")
	srv := newTestServer(cs)
	defer srv.Close()

	_, body := postRegister(t, srv, registerBody{Kubeconfig: singleContextKubeconfig("flaky")})
	if body["health"] != "red" {
		t.Errorf("health = %v, want red", body["health"])
	}
}

func TestRegister_UnreachableClusterIsRedAndUnreachable(t *testing.T) {
	cs := fakeclient.NewSimpleClientset()
	cs.PrependReactor("get", "version", func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, fmt.Errorf("connection refused")
	})
	srv := newTestServer(cs)
	defer srv.Close()

	resp, body := postRegister(t, srv, registerBody{Kubeconfig: singleContextKubeconfig("down-cluster")})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("status = %d, want 201 (unreachable clusters still register); body = %v", resp.StatusCode, body)
	}
	if body["connectionStatus"] != "unreachable" {
		t.Errorf("connectionStatus = %v, want unreachable", body["connectionStatus"])
	}
	if body["health"] != "red" {
		t.Errorf("health = %v, want red", body["health"])
	}
}

func TestRegister_InvalidKubeconfigIsRejected(t *testing.T) {
	srv := newTestServer(fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, body := postRegister(t, srv, registerBody{Kubeconfig: "not: valid: yaml: ][}"})
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body = %v", resp.StatusCode, body)
	}
	if _, ok := body["error"]; !ok {
		t.Errorf("expected an error field, got %v", body)
	}
}

func TestRegister_UnknownContextIsRejected(t *testing.T) {
	srv := newTestServer(fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, body := postRegister(t, srv, registerBody{
		Kubeconfig: singleContextKubeconfig("real-context"),
		Context:    "does-not-exist",
	})
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body = %v", resp.StatusCode, body)
	}
}

func TestRegister_MultipleContextsRequireExplicitChoice(t *testing.T) {
	srv := newTestServer(fakeclient.NewSimpleClientset())
	defer srv.Close()

	kubeconfig := multiContextKubeconfigNoCurrent("ctx-a", "ctx-b")

	resp, body := postRegister(t, srv, registerBody{Kubeconfig: kubeconfig})
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400 when context is ambiguous; body = %v", resp.StatusCode, body)
	}

	resp, body = postRegister(t, srv, registerBody{Kubeconfig: kubeconfig, Context: "ctx-b"})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("status = %d, want 201 once context is explicit; body = %v", resp.StatusCode, body)
	}
	if body["displayName"] != "ctx-b" {
		t.Errorf("displayName = %v, want ctx-b", body["displayName"])
	}
}

func TestRegister_ExplicitDisplayNameOverridesContextDefault(t *testing.T) {
	srv := newTestServer(fakeclient.NewSimpleClientset())
	defer srv.Close()

	_, body := postRegister(t, srv, registerBody{
		Kubeconfig:  singleContextKubeconfig("prod"),
		DisplayName: "Production (EU)",
	})
	if body["displayName"] != "Production (EU)" {
		t.Errorf("displayName = %v, want Production (EU)", body["displayName"])
	}
}

func TestRegister_MetadataIsEchoedBack(t *testing.T) {
	srv := newTestServer(fakeclient.NewSimpleClientset())
	defer srv.Close()

	_, body := postRegister(t, srv, registerBody{
		Kubeconfig: singleContextKubeconfig("prod"),
		Metadata:   map[string]string{"region": "eu-west-1"},
	})
	metadata, ok := body["metadata"].(map[string]any)
	if !ok || metadata["region"] != "eu-west-1" {
		t.Errorf("metadata = %v, want {region: eu-west-1}", body["metadata"])
	}
}

func TestRegister_MissingKubeconfigIsRejected(t *testing.T) {
	srv := newTestServer(fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := postRegister(t, srv, registerBody{})
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestRegister_NeverExposesKubeconfigContents(t *testing.T) {
	srv := newTestServer(fakeclient.NewSimpleClientset())
	defer srv.Close()

	_, rawBody := getRegisterRawBody(t, srv, singleContextKubeconfig("prod"))
	if strings.Contains(string(rawBody), "fake-token-do-not-leak") {
		t.Errorf("response leaked kubeconfig token contents: %s", rawBody)
	}
	if strings.Contains(string(rawBody), "kubeconfig") {
		t.Errorf("response echoed a kubeconfig field: %s", rawBody)
	}
}

func getRegisterRawBody(t *testing.T, srv *httptest.Server, kubeconfig string) (*http.Response, []byte) {
	t.Helper()
	raw, _ := json.Marshal(registerBody{Kubeconfig: kubeconfig})
	resp, err := http.Post(srv.URL+"/api/v1/clusters", "application/json", bytes.NewReader(raw))
	if err != nil {
		t.Fatalf("POST /api/v1/clusters: %v", err)
	}
	defer resp.Body.Close()
	var buf bytes.Buffer
	_, _ = buf.ReadFrom(resp.Body)
	return resp, buf.Bytes()
}

func TestList_EmptyByDefault(t *testing.T) {
	srv := newTestServer(fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, raw := getJSON(t, srv.URL+"/api/v1/clusters")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	var list []map[string]any
	if err := json.Unmarshal(raw, &list); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(list) != 0 {
		t.Errorf("list = %v, want empty", list)
	}
}

func TestGetAndDeleteLifecycle(t *testing.T) {
	srv := newTestServer(fakeclient.NewSimpleClientset())
	defer srv.Close()

	_, created := postRegister(t, srv, registerBody{Kubeconfig: singleContextKubeconfig("prod")})
	id, _ := created["id"].(string)
	if id == "" {
		t.Fatalf("expected an id in %v", created)
	}

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+id)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("GET after register: status = %d, want 200", resp.StatusCode)
	}

	req, _ := http.NewRequest(http.MethodDelete, srv.URL+"/api/v1/clusters/"+id, nil)
	delResp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("DELETE: %v", err)
	}
	if delResp.StatusCode != http.StatusNoContent {
		t.Fatalf("DELETE status = %d, want 204", delResp.StatusCode)
	}

	resp, _ = getJSON(t, srv.URL+"/api/v1/clusters/"+id)
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("GET after delete: status = %d, want 404", resp.StatusCode)
	}
}

func TestGet_UnknownIDIsNotFound(t *testing.T) {
	srv := newTestServer(fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/does-not-exist")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestRefreshAll_UpdatesHealthAfterRegistration(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(node("node-a", true), node("node-b", true))
	setFakedServerVersion(cs, "v1.30.1")
	dialer := testsupport.FakeDialer(cs)
	service := clusters.NewService(dialer)

	created, err := service.Register(context.Background(), clusters.RegisterRequest{Kubeconfig: singleContextKubeconfig("prod")})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	if created.Health != clusters.HealthGreen {
		t.Fatalf("initial health = %v, want green", created.Health)
	}

	// Node goes NotReady between registration and the next periodic refresh.
	updated := node("node-a", false)
	_, err = cs.CoreV1().Nodes().Update(context.Background(), updated, metav1.UpdateOptions{})
	if err != nil {
		t.Fatalf("update node: %v", err)
	}

	service.RefreshAll(context.Background())

	after, err := service.Get(created.ID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if after.Health != clusters.HealthAmber {
		t.Errorf("health after refresh = %v, want amber (single node down, no majority)", after.Health)
	}
}

func TestRefreshAll_PreservesLastSeenWhenClusterGoesUnreachable(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(node("node-a", true))
	setFakedServerVersion(cs, "v1.30.1")
	dialer := testsupport.FakeDialer(cs)
	service := clusters.NewService(dialer)

	created, err := service.Register(context.Background(), clusters.RegisterRequest{Kubeconfig: singleContextKubeconfig("prod")})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	if created.LastSeen == nil {
		t.Fatalf("LastSeen after a successful register should be set")
	}
	firstSeen := *created.LastSeen

	cs.PrependReactor("get", "version", func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, fmt.Errorf("connection refused")
	})
	service.RefreshAll(context.Background())

	after, err := service.Get(created.ID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if after.ConnectionStatus != clusters.ConnectionStatusUnreachable {
		t.Fatalf("connectionStatus after refresh = %v, want unreachable", after.ConnectionStatus)
	}
	if after.LastSeen == nil || !after.LastSeen.Equal(firstSeen) {
		t.Errorf("LastSeen = %v, want unchanged at %v (last seen means last successfully seen, not currently seen)", after.LastSeen, firstSeen)
	}
}
