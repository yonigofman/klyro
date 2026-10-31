package clusters

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
)

// snapshot is everything computeHealth needs from one probe. The four lists
// always travel together, so they're bundled rather than passed separately.
type snapshot struct {
	nodes        []corev1.Node
	deployments  []appsv1.Deployment
	statefulSets []appsv1.StatefulSet
	daemonSets   []appsv1.DaemonSet
}

// computeHealth applies the thresholds recorded in CONTEXT.md's Health entry:
// green when every Node is Ready and no Workload is under its desired
// replica count; amber when something is degraded but nothing is fully down;
// red when a Workload has zero ready replicas, or more than half the Nodes
// are NotReady.
func computeHealth(s snapshot) Health {
	notReadyNodes := 0
	for _, node := range s.nodes {
		if !nodeIsReady(node) {
			notReadyNodes++
		}
	}

	anyWorkloadDown := false
	anyWorkloadDegraded := false

	for _, desired := range workloadReplicaCounts(s.deployments, s.statefulSets, s.daemonSets) {
		switch {
		case desired.desired > 0 && desired.ready == 0:
			anyWorkloadDown = true
		case desired.ready < desired.desired:
			anyWorkloadDegraded = true
		}
	}

	allNodesDown := len(s.nodes) > 0 && notReadyNodes == len(s.nodes)
	majorityNodesDown := notReadyNodes*2 > len(s.nodes)

	if anyWorkloadDown || allNodesDown || majorityNodesDown {
		return HealthRed
	}
	if anyWorkloadDegraded || notReadyNodes > 0 {
		return HealthAmber
	}
	return HealthGreen
}

func nodeIsReady(node corev1.Node) bool {
	for _, condition := range node.Status.Conditions {
		if condition.Type == corev1.NodeReady {
			return condition.Status == corev1.ConditionTrue
		}
	}
	return false
}

type replicaCount struct {
	desired int32
	ready   int32
}

func workloadReplicaCounts(deployments []appsv1.Deployment, statefulSets []appsv1.StatefulSet, daemonSets []appsv1.DaemonSet) []replicaCount {
	counts := make([]replicaCount, 0, len(deployments)+len(statefulSets)+len(daemonSets))
	for _, d := range deployments {
		desired := int32(1)
		if d.Spec.Replicas != nil {
			desired = *d.Spec.Replicas
		}
		counts = append(counts, replicaCount{desired: desired, ready: d.Status.ReadyReplicas})
	}
	for _, s := range statefulSets {
		desired := int32(1)
		if s.Spec.Replicas != nil {
			desired = *s.Spec.Replicas
		}
		counts = append(counts, replicaCount{desired: desired, ready: s.Status.ReadyReplicas})
	}
	for _, ds := range daemonSets {
		counts = append(counts, replicaCount{desired: ds.Status.DesiredNumberScheduled, ready: ds.Status.NumberReady})
	}
	return counts
}
