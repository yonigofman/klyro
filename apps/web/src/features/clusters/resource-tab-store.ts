import { create } from "zustand";

export type ResourceTab = "pods" | "workloads" | "services" | "ingresses" | "nodes" | "events";

export const resourceTabs: { id: ResourceTab; label: string }[] = [
  { id: "pods", label: "Pods" },
  { id: "workloads", label: "Workloads" },
  { id: "services", label: "Services" },
  { id: "ingresses", label: "Ingresses" },
  { id: "nodes", label: "Nodes" },
  { id: "events", label: "Events" },
];

interface ResourceTabState {
  /** Keyed by Cluster ID — same reasoning as the Namespace filter: each
   * Cluster's detail view keeps its own active tab independently. */
  activeTabByCluster: Record<string, ResourceTab>;
  selectTab: (clusterId: string, tab: ResourceTab) => void;
}

export const useResourceTabStore = create<ResourceTabState>((set) => ({
  activeTabByCluster: {},
  selectTab: (clusterId, tab) =>
    set((state) => ({ activeTabByCluster: { ...state.activeTabByCluster, [clusterId]: tab } })),
}));

export function activeTabFor(clusterId: string) {
  return (state: ResourceTabState) => state.activeTabByCluster[clusterId] ?? "pods";
}
