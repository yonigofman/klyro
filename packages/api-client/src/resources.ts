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
