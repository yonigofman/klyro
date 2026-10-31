import { create } from 'zustand'

interface ClusterSelectionState {
  selectedClusterId: string | null
  select: (id: string | null) => void
}

// UI-only state: which roster row's detail panel is open. The cluster list
// itself is server state and lives in TanStack Query, never here.
export const useClusterSelectionStore = create<ClusterSelectionState>(
  (set) => ({
    selectedClusterId: null,
    select: (id) => set({ selectedClusterId: id }),
  }),
)
