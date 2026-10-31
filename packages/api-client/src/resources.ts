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

/** A Kubernetes condition — shared shape used by Pod and Node detail. */
export interface ConditionSummary {
  type: string;
  status: string;
}

/** One container in a Pod's detail view. */
export interface ContainerDetail {
  name: string;
  image: string;
  ready: boolean;
  restartCount: number;
  cpuRequest: string;
  cpuLimit: string;
  memoryRequest: string;
  memoryLimit: string;
}

/** PodSummary plus the fields only a single-resource view needs. Still
 * curated — never the raw Pod object — per CONTEXT.md's Detail entry. */
export interface PodDetail extends PodSummary {
  containers: ContainerDetail[];
  conditions: ConditionSummary[];
}

/** WorkloadSummary plus its update strategy and the Pods it owns. */
export interface WorkloadDetail extends WorkloadSummary {
  updateStrategy: string;
  podNames: string[];
}

/** One Pod backing a Service, matched by the Service's selector and
 * reported Ready. */
export interface ServiceEndpoint {
  podName: string;
  ip: string;
}

/** ServiceSummary plus its selector and the Pods backing it. A Service with
 * no selector (e.g. type ExternalName) has a null selector, not an empty
 * object — Go's nil map marshals to JSON null. */
export interface ServiceDetail extends ServiceSummary {
  selector: Record<string, string> | null;
  endpoints: ServiceEndpoint[];
}

/** One host/path routing rule on an Ingress. */
export interface IngressRuleDetail {
  host: string;
  path: string;
  serviceName: string;
  servicePort: string;
}

/** IngressSummary plus its backend rules and TLS hosts. */
export interface IngressDetail extends IngressSummary {
  rules: IngressRuleDetail[];
  tlsHosts: string[];
}

/** A Node taint. */
export interface TaintSummary {
  key: string;
  value: string;
  effect: string;
}

/** NodeSummary plus capacity, allocatable resources, conditions, and taints. */
export interface NodeDetail extends NodeSummary {
  capacity: Record<string, string>;
  allocatable: Record<string, string>;
  conditions: ConditionSummary[];
  taints: TaintSummary[];
}
