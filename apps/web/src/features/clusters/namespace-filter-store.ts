import { create } from "zustand";

interface NamespaceFilterState {
  /** Keyed by Cluster ID — multi-cluster is first-class, so each Cluster's
   * detail view keeps its own namespace filter independently of any other. */
  selectedNamespaceByCluster: Record<string, string | null>;
  selectNamespace: (clusterId: string, namespace: string | null) => void;
}

// UI-only state: which Namespace each open Cluster's Pod list is filtered
// to. The Namespace/Pod data itself is server state and lives in TanStack
// Query.
export const useNamespaceFilterStore = create<NamespaceFilterState>((set) => ({
  selectedNamespaceByCluster: {},
  selectNamespace: (clusterId, namespace) =>
    set((state) => ({
      selectedNamespaceByCluster: { ...state.selectedNamespaceByCluster, [clusterId]: namespace },
    })),
}));

/** null (unset or explicitly "All namespaces") means no namespace filter. */
export function selectedNamespaceFor(clusterId: string) {
  return (state: NamespaceFilterState) => state.selectedNamespaceByCluster[clusterId] ?? null;
}
