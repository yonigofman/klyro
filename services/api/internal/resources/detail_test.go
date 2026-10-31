package resources_test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	fakeclient "k8s.io/client-go/kubernetes/fake"
)

// --- fixtures specific to detail views ------------------------------------

func podWithLabels(name, namespace string, labels map[string]string) *corev1.Pod {
	return &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace, Labels: labels},
		Spec: corev1.PodSpec{
			NodeName: "node-a",
			Containers: []corev1.Container{{
				Name:  "web",
				Image: "nginx:1.25",
				Resources: corev1.ResourceRequirements{
					Requests: corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("100m"),
						corev1.ResourceMemory: resource.MustParse("64Mi"),
					},
					Limits: corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("200m"),
						corev1.ResourceMemory: resource.MustParse("128Mi"),
					},
				},
			}},
		},
		Status: corev1.PodStatus{
			Phase: corev1.PodRunning,
			PodIP: "10.1.2.3",
			Conditions: []corev1.PodCondition{
				{Type: corev1.PodReady, Status: corev1.ConditionTrue},
			},
			ContainerStatuses: []corev1.ContainerStatus{
				{Name: "web", Ready: true, RestartCount: 1},
			},
		},
	}
}

func deploymentWithSelector(name, namespace string, desired, ready int32, labels map[string]string) *appsv1.Deployment {
	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Spec: appsv1.DeploymentSpec{
			Replicas: &desired,
			Strategy: appsv1.DeploymentStrategy{Type: appsv1.RollingUpdateDeploymentStrategyType},
			Selector: &metav1.LabelSelector{MatchLabels: labels},
		},
		Status: appsv1.DeploymentStatus{ReadyReplicas: ready},
	}
}

func serviceWithSelector(name, namespace string, labels map[string]string) *corev1.Service {
	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Spec: corev1.ServiceSpec{
			Type:      corev1.ServiceTypeClusterIP,
			ClusterIP: "10.0.0.1",
			Selector:  labels,
			Ports:     []corev1.ServicePort{{Port: 80, Protocol: corev1.ProtocolTCP}},
		},
	}
}

func ingressWithRule(name, namespace, host, path, backendService string, backendPort int32) *networkingv1.Ingress {
	pathType := networkingv1.PathTypePrefix
	return &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Spec: networkingv1.IngressSpec{
			Rules: []networkingv1.IngressRule{{
				Host: host,
				IngressRuleValue: networkingv1.IngressRuleValue{
					HTTP: &networkingv1.HTTPIngressRuleValue{
						Paths: []networkingv1.HTTPIngressPath{{
							Path:     path,
							PathType: &pathType,
							Backend: networkingv1.IngressBackend{
								Service: &networkingv1.IngressServiceBackend{
									Name: backendService,
									Port: networkingv1.ServiceBackendPort{Number: backendPort},
								},
							},
						}},
					},
				},
			}},
			TLS: []networkingv1.IngressTLS{{Hosts: []string{host}}},
		},
	}
}

func nodeWithCapacity(name string) *corev1.Node {
	return &corev1.Node{
		ObjectMeta: metav1.ObjectMeta{Name: name},
		Spec: corev1.NodeSpec{
			Taints: []corev1.Taint{{Key: "dedicated", Value: "gpu", Effect: corev1.TaintEffectNoSchedule}},
		},
		Status: corev1.NodeStatus{
			Conditions: []corev1.NodeCondition{{Type: corev1.NodeReady, Status: corev1.ConditionTrue}},
			Capacity: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("4"),
				corev1.ResourceMemory: resource.MustParse("16Gi"),
			},
			Allocatable: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("3800m"),
				corev1.ResourceMemory: resource.MustParse("15Gi"),
			},
		},
	}
}

// getObject fetches url and decodes a single JSON object (unlike getJSON in
// handler_test.go, which decodes an array and only on a 200).
func getObject(t *testing.T, url string) (*http.Response, map[string]any) {
	t.Helper()
	resp, err := http.Get(url)
	if err != nil {
		t.Fatalf("GET %s: %v", url, err)
	}
	defer resp.Body.Close()
	var body map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return resp, body
}

// --- pod detail -------------------------------------------------------

func TestGetPod_ReturnsFullDetail(t *testing.T) {
	labels := map[string]string{"app": "web"}
	cs := fakeclient.NewSimpleClientset(podWithLabels("web-1", "default", labels))
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getObject(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods/default/web-1")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %v", resp.StatusCode, body)
	}
	if body["name"] != "web-1" || body["namespace"] != "default" {
		t.Fatalf("got %v, want web-1/default", body)
	}
	containers, ok := body["containers"].([]any)
	if !ok || len(containers) != 1 {
		t.Fatalf("containers = %v, want 1", body["containers"])
	}
	container := containers[0].(map[string]any)
	if container["image"] != "nginx:1.25" || container["cpuRequest"] != "100m" || container["memoryLimit"] != "128Mi" {
		t.Errorf("container = %v, want nginx:1.25/100m/128Mi", container)
	}
	conditions, ok := body["conditions"].([]any)
	if !ok || len(conditions) != 1 {
		t.Fatalf("conditions = %v, want 1", body["conditions"])
	}
}

func TestGetPod_UnknownNameIs404(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods/default/does-not-exist")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestGetPod_UnknownClusterIs404(t *testing.T) {
	srv, _ := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/does-not-exist/pods/default/web-1")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestGetPod_InvalidNamespaceIs400(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods/Not_Valid!/web-1")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

// --- workload detail ----------------------------------------------------

func TestGetWorkload_ReturnsStrategyAndOwnedPods(t *testing.T) {
	labels := map[string]string{"app": "web"}
	cs := fakeclient.NewSimpleClientset(
		deploymentWithSelector("web", "default", 2, 2, labels),
		podWithLabels("web-abc", "default", labels),
		podWithLabels("web-def", "default", labels),
		podWithLabels("other-pod", "default", map[string]string{"app": "other"}),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getObject(t, srv.URL+"/api/v1/clusters/"+clusterID+"/workloads/default/Deployment/web")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %v", resp.StatusCode, body)
	}
	if body["updateStrategy"] != "RollingUpdate" {
		t.Errorf("updateStrategy = %v, want RollingUpdate", body["updateStrategy"])
	}
	podNames, ok := body["podNames"].([]any)
	if !ok || len(podNames) != 2 {
		t.Fatalf("podNames = %v, want 2 (web-abc, web-def, not other-pod)", body["podNames"])
	}
}

func TestGetWorkload_UnknownKindIs400(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/workloads/default/CronJob/web")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestGetWorkload_UnknownNameIs404(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/workloads/default/Deployment/does-not-exist")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestGetWorkload_InvalidNamespaceIs400(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/workloads/Not_Valid!/Deployment/web")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

// --- service detail -----------------------------------------------------

func TestGetService_ReturnsSelectorAndEndpoints(t *testing.T) {
	labels := map[string]string{"app": "web"}
	cs := fakeclient.NewSimpleClientset(
		serviceWithSelector("web", "default", labels),
		podWithLabels("web-1", "default", labels),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getObject(t, srv.URL+"/api/v1/clusters/"+clusterID+"/services/default/web")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %v", resp.StatusCode, body)
	}
	selector, ok := body["selector"].(map[string]any)
	if !ok || selector["app"] != "web" {
		t.Errorf("selector = %v, want {app: web}", body["selector"])
	}
	endpoints, ok := body["endpoints"].([]any)
	if !ok || len(endpoints) != 1 {
		t.Fatalf("endpoints = %v, want 1", body["endpoints"])
	}
	endpoint := endpoints[0].(map[string]any)
	if endpoint["podName"] != "web-1" || endpoint["ip"] != "10.1.2.3" {
		t.Errorf("endpoint = %v, want {podName: web-1, ip: 10.1.2.3}", endpoint)
	}
}

func TestGetService_UnknownNameIs404(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/services/default/does-not-exist")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestGetService_EndpointsExcludeNotReadyPods(t *testing.T) {
	labels := map[string]string{"app": "web"}
	notReady := podWithLabels("web-2", "default", labels)
	notReady.Status.Conditions = []corev1.PodCondition{{Type: corev1.PodReady, Status: corev1.ConditionFalse}}
	notReady.Status.PodIP = "10.1.2.4"

	cs := fakeclient.NewSimpleClientset(
		serviceWithSelector("web", "default", labels),
		podWithLabels("web-1", "default", labels),
		notReady,
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getObject(t, srv.URL+"/api/v1/clusters/"+clusterID+"/services/default/web")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %v", resp.StatusCode, body)
	}
	endpoints, ok := body["endpoints"].([]any)
	if !ok || len(endpoints) != 1 {
		t.Fatalf("endpoints = %v, want 1 (not-ready web-2 excluded)", body["endpoints"])
	}
	endpoint := endpoints[0].(map[string]any)
	if endpoint["podName"] != "web-1" || endpoint["ip"] != "10.1.2.3" {
		t.Errorf("endpoint = %v, want {podName: web-1, ip: 10.1.2.3}", endpoint)
	}
}

func TestGetService_InvalidNamespaceIs400(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/services/Not_Valid!/web")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

// --- ingress detail -----------------------------------------------------

func TestGetIngress_ReturnsRulesAndTLSHosts(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(
		ingressWithRule("web", "default", "web.example.com", "/", "web-svc", 80),
	)
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getObject(t, srv.URL+"/api/v1/clusters/"+clusterID+"/ingresses/default/web")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %v", resp.StatusCode, body)
	}
	rules, ok := body["rules"].([]any)
	if !ok || len(rules) != 1 {
		t.Fatalf("rules = %v, want 1", body["rules"])
	}
	rule := rules[0].(map[string]any)
	if rule["host"] != "web.example.com" || rule["serviceName"] != "web-svc" {
		t.Errorf("rule = %v, want web.example.com/web-svc", rule)
	}
	tlsHosts, ok := body["tlsHosts"].([]any)
	if !ok || len(tlsHosts) != 1 || tlsHosts[0] != "web.example.com" {
		t.Errorf("tlsHosts = %v, want [web.example.com]", body["tlsHosts"])
	}
}

func TestGetIngress_UnknownNameIs404(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/ingresses/default/does-not-exist")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestGetIngress_InvalidNamespaceIs400(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/ingresses/Not_Valid!/web")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

// --- node detail ----------------------------------------------------------

func TestGetNode_ReturnsCapacityConditionsAndTaints(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(nodeWithCapacity("node-a"))
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getObject(t, srv.URL+"/api/v1/clusters/"+clusterID+"/nodes/node-a")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %v", resp.StatusCode, body)
	}
	capacity, ok := body["capacity"].(map[string]any)
	if !ok || capacity["cpu"] != "4" {
		t.Errorf("capacity = %v, want cpu: 4", body["capacity"])
	}
	taints, ok := body["taints"].([]any)
	if !ok || len(taints) != 1 {
		t.Fatalf("taints = %v, want 1", body["taints"])
	}
	taint := taints[0].(map[string]any)
	if taint["key"] != "dedicated" || taint["effect"] != "NoSchedule" {
		t.Errorf("taint = %v, want dedicated/NoSchedule", taint)
	}
}

func TestGetNode_UnknownNameIs404(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/nodes/does-not-exist")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

// --- manifests --------------------------------------------------------

func manifestString(t *testing.T, body map[string]any) string {
	t.Helper()
	manifest, ok := body["manifest"].(string)
	if !ok {
		t.Fatalf("manifest = %v, want a string", body["manifest"])
	}
	return manifest
}

func TestGetPodManifest_ReturnsRawYAML(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(podWithLabels("web-1", "default", map[string]string{"app": "web"}))
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getObject(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods/default/web-1/manifest")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %v", resp.StatusCode, body)
	}
	manifest := manifestString(t, body)
	if !strings.Contains(manifest, "name: web-1") || !strings.Contains(manifest, "namespace: default") {
		t.Errorf("manifest = %q, want it to contain name: web-1 and namespace: default", manifest)
	}
	if !strings.Contains(manifest, "image: nginx:1.25") {
		t.Errorf("manifest = %q, want the raw container spec (image: nginx:1.25)", manifest)
	}
}

func TestGetPodManifest_UnknownNameIs404(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/pods/default/does-not-exist/manifest")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestGetWorkloadManifest_ReturnsRawYAML(t *testing.T) {
	labels := map[string]string{"app": "web"}
	cs := fakeclient.NewSimpleClientset(deploymentWithSelector("web", "default", 2, 2, labels))
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getObject(t, srv.URL+"/api/v1/clusters/"+clusterID+"/workloads/default/Deployment/web/manifest")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %v", resp.StatusCode, body)
	}
	manifest := manifestString(t, body)
	if !strings.Contains(manifest, "name: web") || !strings.Contains(manifest, "RollingUpdate") {
		t.Errorf("manifest = %q, want name: web and the RollingUpdate strategy", manifest)
	}
}

func TestGetWorkloadManifest_UnknownKindIs400(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/workloads/default/CronJob/web/manifest")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestGetServiceManifest_ReturnsRawYAML(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(serviceWithSelector("web", "default", map[string]string{"app": "web"}))
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getObject(t, srv.URL+"/api/v1/clusters/"+clusterID+"/services/default/web/manifest")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %v", resp.StatusCode, body)
	}
	manifest := manifestString(t, body)
	if !strings.Contains(manifest, "name: web") || !strings.Contains(manifest, "clusterIP: 10.0.0.1") {
		t.Errorf("manifest = %q, want name: web and clusterIP: 10.0.0.1", manifest)
	}
}

func TestGetServiceManifest_UnknownNameIs404(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/services/default/does-not-exist/manifest")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestGetIngressManifest_ReturnsRawYAML(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(ingressWithRule("web", "default", "web.example.com", "/", "web-svc", 80))
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getObject(t, srv.URL+"/api/v1/clusters/"+clusterID+"/ingresses/default/web/manifest")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %v", resp.StatusCode, body)
	}
	manifest := manifestString(t, body)
	if !strings.Contains(manifest, "name: web") || !strings.Contains(manifest, "web.example.com") {
		t.Errorf("manifest = %q, want name: web and host web.example.com", manifest)
	}
}

func TestGetIngressManifest_UnknownNameIs404(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/ingresses/default/does-not-exist/manifest")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestGetNodeManifest_ReturnsRawYAML(t *testing.T) {
	cs := fakeclient.NewSimpleClientset(nodeWithCapacity("node-a"))
	srv, clusterID := newTestServer(t, cs)
	defer srv.Close()

	resp, body := getObject(t, srv.URL+"/api/v1/clusters/"+clusterID+"/nodes/node-a/manifest")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %v", resp.StatusCode, body)
	}
	manifest := manifestString(t, body)
	if !strings.Contains(manifest, "name: node-a") || !strings.Contains(manifest, "dedicated") {
		t.Errorf("manifest = %q, want name: node-a and the dedicated taint", manifest)
	}
}

func TestGetNodeManifest_UnknownNameIs404(t *testing.T) {
	srv, clusterID := newTestServer(t, fakeclient.NewSimpleClientset())
	defer srv.Close()

	resp, _ := getJSON(t, srv.URL+"/api/v1/clusters/"+clusterID+"/nodes/does-not-exist/manifest")
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}
