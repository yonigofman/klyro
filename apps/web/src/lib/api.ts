// A thin REST client for services/api. The browser only ever talks to this
// — never to a cluster or agent directly (AGENTS.md §2).

// A configurable base URL is follow-up work (env plumbing isn't wired up
// yet); hardcoded to the local dev backend for now.
const API_BASE = 'http://localhost:8080'

export interface ClusterSummary {
  id: string
  name: string
  connected: boolean
}

export interface ResourceRow {
  name: string
  namespace?: string
  status: string
  createdAt: string
  extra?: Record<string, string>
}

export interface ListResourcesResult {
  kind: string
  resources: ResourceRow[]
  error?: string
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export function listClusters(): Promise<ClusterSummary[]> {
  return getJSON('/api/clusters')
}

export function listResources(clusterId: string, kind: string, namespace = ''): Promise<ListResourcesResult> {
  const params = new URLSearchParams({ kind })
  if (namespace) params.set('namespace', namespace)
  return getJSON(`/api/clusters/${clusterId}/resources?${params.toString()}`)
}
