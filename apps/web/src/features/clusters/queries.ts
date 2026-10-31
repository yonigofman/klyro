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
