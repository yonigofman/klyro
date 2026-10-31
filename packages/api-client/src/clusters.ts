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
  };
}
