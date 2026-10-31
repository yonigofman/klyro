import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RegisterClusterInput } from "@klyro/api-client";
import { apiClient } from "#/lib/api-client";

export const clustersQueryKey = ["clusters"] as const;

export function useClusters() {
  return useQuery({
    queryKey: clustersQueryKey,
    queryFn: () => apiClient.listClusters(),
  });
}

export function useRegisterCluster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterClusterInput) => apiClient.registerCluster(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clustersQueryKey }),
  });
}

export function useDeleteCluster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteCluster(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clustersQueryKey }),
  });
}

export function useNamespaces(clusterId: string) {
  return useQuery({
    queryKey: ["clusters", clusterId, "namespaces"],
    queryFn: () => apiClient.listNamespaces(clusterId),
  });
}

/** namespace undefined or "" fetches Pods across all namespaces. */
export function usePods(clusterId: string, namespace: string | undefined) {
  return useQuery({
    queryKey: ["clusters", clusterId, "pods", namespace ?? "all"],
    queryFn: () => apiClient.listPods(clusterId, namespace),
  });
}
