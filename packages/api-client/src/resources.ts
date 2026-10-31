/** A Namespace — a Cluster-scoped Resource — summarized for display. */
export interface NamespaceSummary {
  name: string;
  status: string;
  createdAt: string;
}

/** A Pod — a Namespace-scoped Resource — summarized for display. */
export interface PodSummary {
  name: string;
  namespace: string;
  phase: string;
  /** "ready/total" container count, e.g. "2/2". */
  ready: string;
  restarts: number;
  node: string;
  createdAt: string;
}

/** Which Kubernetes kind a WorkloadSummary came from. */
export type WorkloadKind = "Deployment" | "StatefulSet" | "DaemonSet";

/**
 * A Deployment, StatefulSet, or DaemonSet — Workload is one domain concept
 * (see CONTEXT.md) spanning all three kinds, exposed as one list.
 */
export interface WorkloadSummary {
  kind: WorkloadKind;
  name: string;
  namespace: string;
  desired: number;
  ready: number;
  createdAt: string;
}

/** A Service — a Namespace-scoped Resource — summarized for display. */
export interface ServiceSummary {
  name: string;
  namespace: string;
  type: string;
  clusterIP: string;
  /** Short human-readable form, e.g. "80/TCP". */
  ports: string[];
  createdAt: string;
}

/** An Ingress — a Namespace-scoped Resource — summarized for display. */
export interface IngressSummary {
  name: string;
  namespace: string;
  hosts: string[];
  createdAt: string;
}

/** A Node — a Cluster-scoped Resource, with no Namespace to filter by. */
export interface NodeSummary {
  name: string;
  ready: boolean;
  kubernetesVersion: string;
  createdAt: string;
}

/** An Event — a Namespace-scoped Resource. */
export interface EventSummary {
  type: string;
  reason: string;
  message: string;
  involvedObjectKind: string;
  involvedObjectName: string;
  namespace: string;
  count: number;
  lastSeen: string;
}
