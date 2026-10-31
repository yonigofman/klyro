import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RegisterClusterInput, WorkloadKind } from '@klyro/api-client'
import { apiClient } from '#/lib/api-client'

export const clustersQueryKey = ['clusters'] as const

export function useClusters() {
  return useQuery({
    queryKey: clustersQueryKey,
    queryFn: () => apiClient.listClusters(),
  })
}

export function useRegisterCluster() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterClusterInput) =>
      apiClient.registerCluster(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: clustersQueryKey }),
  })
}

export function useDeleteCluster() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteCluster(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: clustersQueryKey }),
  })
}

export function useNamespaces(clusterId: string) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'namespaces'],
    queryFn: () => apiClient.listNamespaces(clusterId),
  })
}

/**
 * namespace undefined or "" fetches Pods across all namespaces. enabled
 * defaults to true — the detail panel passes false for tabs that aren't
 * active, so switching tabs doesn't fetch every resource type eagerly.
 */
export function usePods(
  clusterId: string,
  namespace: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'pods', namespace ?? 'all'],
    queryFn: () => apiClient.listPods(clusterId, namespace),
    enabled,
  })
}

export function useWorkloads(
  clusterId: string,
  namespace: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'workloads', namespace ?? 'all'],
    queryFn: () => apiClient.listWorkloads(clusterId, namespace),
    enabled,
  })
}

export function useServices(
  clusterId: string,
  namespace: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'services', namespace ?? 'all'],
    queryFn: () => apiClient.listServices(clusterId, namespace),
    enabled,
  })
}

export function useIngresses(
  clusterId: string,
  namespace: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'ingresses', namespace ?? 'all'],
    queryFn: () => apiClient.listIngresses(clusterId, namespace),
    enabled,
  })
}

/** Nodes are Cluster-scoped — there is no namespace to filter by. */
export function useNodes(clusterId: string, enabled = true) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'nodes'],
    queryFn: () => apiClient.listNodes(clusterId),
    enabled,
  })
}

export function useEvents(
  clusterId: string,
  namespace: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'events', namespace ?? 'all'],
    queryFn: () => apiClient.listEvents(clusterId, namespace),
    enabled,
  })
}

export function usePodDetail(clusterId: string, namespace: string, name: string) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'pods', namespace, name],
    queryFn: () => apiClient.getPod(clusterId, namespace, name),
  })
}

export function useWorkloadDetail(
  clusterId: string,
  namespace: string,
  kind: WorkloadKind,
  name: string,
) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'workloads', namespace, kind, name],
    queryFn: () => apiClient.getWorkload(clusterId, namespace, kind, name),
  })
}

export function useServiceDetail(clusterId: string, namespace: string, name: string) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'services', namespace, name],
    queryFn: () => apiClient.getService(clusterId, namespace, name),
  })
}

export function useIngressDetail(clusterId: string, namespace: string, name: string) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'ingresses', namespace, name],
    queryFn: () => apiClient.getIngress(clusterId, namespace, name),
  })
}

/** Nodes are Cluster-scoped — there is no namespace to filter by. */
export function useNodeDetail(clusterId: string, name: string) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'nodes', name],
    queryFn: () => apiClient.getNode(clusterId, name),
  })
}

// Manifest queries are gated on `enabled` — the Manifest section is
// collapsed by default (see the Shape Brief), so the raw YAML is only
// fetched once an operator actually opens it.

export function usePodManifest(
  clusterId: string,
  namespace: string,
  name: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'pods', namespace, name, 'manifest'],
    queryFn: () => apiClient.getPodManifest(clusterId, namespace, name),
    enabled,
  })
}

export function useWorkloadManifest(
  clusterId: string,
  namespace: string,
  kind: WorkloadKind,
  name: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'workloads', namespace, kind, name, 'manifest'],
    queryFn: () => apiClient.getWorkloadManifest(clusterId, namespace, kind, name),
    enabled,
  })
}

export function useServiceManifest(
  clusterId: string,
  namespace: string,
  name: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'services', namespace, name, 'manifest'],
    queryFn: () => apiClient.getServiceManifest(clusterId, namespace, name),
    enabled,
  })
}

export function useIngressManifest(
  clusterId: string,
  namespace: string,
  name: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'ingresses', namespace, name, 'manifest'],
    queryFn: () => apiClient.getIngressManifest(clusterId, namespace, name),
    enabled,
  })
}

/** Nodes are Cluster-scoped — there is no namespace to filter by. */
export function useNodeManifest(clusterId: string, name: string, enabled: boolean) {
  return useQuery({
    queryKey: ['clusters', clusterId, 'nodes', name, 'manifest'],
    queryFn: () => apiClient.getNodeManifest(clusterId, name),
    enabled,
  })
}
