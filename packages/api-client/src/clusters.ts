import type {
  EventSummary,
  IngressDetail,
  IngressSummary,
  NamespaceSummary,
  NodeDetail,
  NodeSummary,
  PodDetail,
  PodSummary,
  ServiceDetail,
  ServiceSummary,
  WorkloadDetail,
  WorkloadKind,
  WorkloadSummary,
} from "./resources";

export type ConnectionStatus = "connected" | "unreachable";
export type Health = "green" | "amber" | "red";

export interface Cluster {
  id: string;
  displayName: string;
  context: string;
  kubernetesVersion: string;
  connectionStatus: ConnectionStatus;
  health: Health;
  nodeCount: number;
  podCount: number;
  /** ISO 8601 timestamp of the last successful reachability probe, or null if never reachable. */
  lastSeen: string | null;
  metadata?: Record<string, string>;
}

export interface RegisterClusterInput {
  kubeconfig: string;
  context?: string;
  displayName?: string;
  metadata?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

export interface ApiClient {
  listClusters(): Promise<Cluster[]>;
  getCluster(id: string): Promise<Cluster>;
  registerCluster(input: RegisterClusterInput): Promise<Cluster>;
  deleteCluster(id: string): Promise<void>;
  listNamespaces(clusterId: string): Promise<NamespaceSummary[]>;
  /** namespace omitted or "" lists Pods across all namespaces. */
  listPods(clusterId: string, namespace?: string): Promise<PodSummary[]>;
  /** namespace omitted or "" lists Workloads across all namespaces. */
  listWorkloads(clusterId: string, namespace?: string): Promise<WorkloadSummary[]>;
  /** namespace omitted or "" lists Services across all namespaces. */
  listServices(clusterId: string, namespace?: string): Promise<ServiceSummary[]>;
  /** namespace omitted or "" lists Ingresses across all namespaces. */
  listIngresses(clusterId: string, namespace?: string): Promise<IngressSummary[]>;
  /** Nodes are Cluster-scoped — there is no namespace to filter by. */
  listNodes(clusterId: string): Promise<NodeSummary[]>;
  /** namespace omitted or "" lists Events across all namespaces. */
  listEvents(clusterId: string, namespace?: string): Promise<EventSummary[]>;
  getPod(clusterId: string, namespace: string, name: string): Promise<PodDetail>;
  getWorkload(clusterId: string, namespace: string, kind: WorkloadKind, name: string): Promise<WorkloadDetail>;
  getService(clusterId: string, namespace: string, name: string): Promise<ServiceDetail>;
  getIngress(clusterId: string, namespace: string, name: string): Promise<IngressDetail>;
  getNode(clusterId: string, name: string): Promise<NodeDetail>;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const doFetch = options.fetch ?? fetch;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await doFetch(`${baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => ({}));
      const message =
        typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : `request failed with status ${response.status}`;
      throw new ApiError(response.status, message);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  function namespaceQuery(namespace?: string): string {
    return namespace ? `?namespace=${encodeURIComponent(namespace)}` : "";
  }

  return {
    listClusters: () => request<Cluster[]>("/api/v1/clusters"),
    getCluster: (id) => request<Cluster>(`/api/v1/clusters/${encodeURIComponent(id)}`),
    registerCluster: (input) =>
      request<Cluster>("/api/v1/clusters", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    deleteCluster: (id) =>
      request<void>(`/api/v1/clusters/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    listNamespaces: (clusterId) =>
      request<NamespaceSummary[]>(`/api/v1/clusters/${encodeURIComponent(clusterId)}/namespaces`),
    listPods: (clusterId, namespace) =>
      request<PodSummary[]>(`/api/v1/clusters/${encodeURIComponent(clusterId)}/pods${namespaceQuery(namespace)}`),
    listWorkloads: (clusterId, namespace) =>
      request<WorkloadSummary[]>(
        `/api/v1/clusters/${encodeURIComponent(clusterId)}/workloads${namespaceQuery(namespace)}`,
      ),
    listServices: (clusterId, namespace) =>
      request<ServiceSummary[]>(
        `/api/v1/clusters/${encodeURIComponent(clusterId)}/services${namespaceQuery(namespace)}`,
      ),
    listIngresses: (clusterId, namespace) =>
      request<IngressSummary[]>(
        `/api/v1/clusters/${encodeURIComponent(clusterId)}/ingresses${namespaceQuery(namespace)}`,
      ),
    listNodes: (clusterId) => request<NodeSummary[]>(`/api/v1/clusters/${encodeURIComponent(clusterId)}/nodes`),
    listEvents: (clusterId, namespace) =>
      request<EventSummary[]>(
        `/api/v1/clusters/${encodeURIComponent(clusterId)}/events${namespaceQuery(namespace)}`,
      ),
    getPod: (clusterId, namespace, name) =>
      request<PodDetail>(
        `/api/v1/clusters/${encodeURIComponent(clusterId)}/pods/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
      ),
    getWorkload: (clusterId, namespace, kind, name) =>
      request<WorkloadDetail>(
        `/api/v1/clusters/${encodeURIComponent(clusterId)}/workloads/${encodeURIComponent(namespace)}/${encodeURIComponent(kind)}/${encodeURIComponent(name)}`,
      ),
    getService: (clusterId, namespace, name) =>
      request<ServiceDetail>(
        `/api/v1/clusters/${encodeURIComponent(clusterId)}/services/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
      ),
    getIngress: (clusterId, namespace, name) =>
      request<IngressDetail>(
        `/api/v1/clusters/${encodeURIComponent(clusterId)}/ingresses/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
      ),
    getNode: (clusterId, name) =>
      request<NodeDetail>(`/api/v1/clusters/${encodeURIComponent(clusterId)}/nodes/${encodeURIComponent(name)}`),
  };
}
