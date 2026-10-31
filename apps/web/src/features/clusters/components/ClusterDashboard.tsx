import { useMemo, useState } from 'react'
import { useClusters } from '#/features/clusters/queries'
import { useClusterSelectionStore } from '#/features/clusters/selection-store'
import { useCommandPaletteStore } from '#/features/clusters/command-palette-store'
import { ClusterRoster } from '#/features/clusters/components/ClusterRoster'
import { ClusterDetailPanel } from '#/features/clusters/components/ClusterDetailPanel'
import { EmptyState } from '#/features/clusters/components/EmptyState'
import { RegisterClusterDialog } from '#/features/clusters/components/RegisterClusterDialog'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { QueryState } from '#/components/shared/QueryState'

export function ClusterDashboard() {
  const clustersQuery = useClusters()
  const selectedClusterId = useClusterSelectionStore(
    (state) => state.selectedClusterId,
  )
  const openPalette = useCommandPaletteStore((state) => state.open)
  const [search, setSearch] = useState('')

  const filteredClusters = useMemo(() => {
    if (!clustersQuery.data) return undefined
    const query = search.trim().toLowerCase()
    if (!query) return clustersQuery.data
    return clustersQuery.data.filter(
      (cluster) =>
        cluster.displayName.toLowerCase().includes(query) ||
        cluster.context.toLowerCase().includes(query),
    )
  }, [clustersQuery.data, search])

  const selectedCluster = clustersQuery.data?.find(
    (cluster) => cluster.id === selectedClusterId,
  )

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-background px-6 py-3">
        <h1 className="font-mono text-sm uppercase tracking-wide text-muted-foreground">
          Klyro
        </h1>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search clusters…"
          aria-label="Search clusters"
          className="h-8 max-w-xs font-mono text-sm"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={openPalette}
          className="h-8 gap-1.5 font-mono text-xs text-muted-foreground"
          aria-label="Open command palette"
        >
          Jump to…
          <kbd className="rounded border border-border px-1 font-mono text-[10px]">
            ⌘K
          </kbd>
        </Button>
        <div className="ml-auto">
          <RegisterClusterDialog />
        </div>
      </header>

      <main aria-label="Cluster roster" className="flex-1 px-6 py-4">
        <QueryState
          query={clustersQuery}
          loadingLabel="Loading clusters…"
          isEmpty={() => (filteredClusters ?? []).length === 0}
          empty={
            <EmptyState
              reason={
                clustersQuery.data && clustersQuery.data.length > 0
                  ? 'no-matches'
                  : 'no-clusters'
              }
            />
          }
        >
          {() => <ClusterRoster clusters={filteredClusters ?? []} />}
        </QueryState>
      </main>

      {selectedCluster && <ClusterDetailPanel cluster={selectedCluster} />}
    </div>
  )
}
