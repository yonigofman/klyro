import type { Cluster } from '@klyro/api-client'
import {
  connectionStatusLabel,
  formatLastSeen,
  rosterDensity,
} from '#/features/clusters/health'
import { useClusterSelectionStore } from '#/features/clusters/selection-store'
import { StatusDot } from '#/features/clusters/components/StatusDot'
import { FlipValue } from '#/components/shared/FlipValue'
import { cn } from '#/lib/utils'

// Staggers each row's entrance flip — "the board powering up" — capped so
// a long roster doesn't leave the bottom rows waiting.
const ROW_FLIP_STAGGER_MS = 40
const ROW_FLIP_STAGGER_CAP_MS = 400

export function ClusterRoster({ clusters }: { clusters: Cluster[] }) {
  const density = rosterDensity(clusters.length)
  const selectedClusterId = useClusterSelectionStore(
    (state) => state.selectedClusterId,
  )
  const select = useClusterSelectionStore((state) => state.select)

  return (
    <table className="w-full border-collapse text-left" data-density={density}>
      <thead>
        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
          <th className="py-2 font-normal">Status</th>
          <th className="py-2 font-normal">Name</th>
          <th className="py-2 font-normal">Context</th>
          <th className="py-2 font-normal">Version</th>
          <th className="py-2 font-normal">Nodes</th>
          <th className="py-2 font-normal">Pods</th>
          <th className="py-2 font-normal">Last seen</th>
          <th className="py-2 font-normal">Connection</th>
        </tr>
      </thead>
      <tbody>
        {clusters.map((cluster, index) => {
          const isSelected = cluster.id === selectedClusterId
          const enterDelayMs = Math.min(index * ROW_FLIP_STAGGER_MS, ROW_FLIP_STAGGER_CAP_MS)
          return (
            <tr
              key={cluster.id}
              role="button"
              tabIndex={0}
              aria-selected={isSelected}
              onClick={() => select(isSelected ? null : cluster.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  select(isSelected ? null : cluster.id)
                }
              }}
              className={cn(
                'cursor-pointer border-b border-border/60 outline-none hover:bg-accent/40 focus-visible:bg-accent/40',
                density === 'dense' ? 'text-sm' : 'text-base',
                isSelected && 'bg-accent/60',
              )}
            >
              <td
                className={cn('py-2', density === 'dense' ? 'py-1.5' : 'py-3')}
              >
                <FlipValue watch={cluster.health} enterDelayMs={enterDelayMs}>
                  <StatusDot health={cluster.health} />
                </FlipValue>
              </td>
              <td className="py-2 font-mono font-medium text-foreground">
                {cluster.displayName}
              </td>
              <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">
                {cluster.context}
              </td>
              <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">
                {cluster.kubernetesVersion || '—'}
              </td>
              <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">
                <FlipValue watch={cluster.nodeCount} enterDelayMs={enterDelayMs}>
                  {cluster.nodeCount}
                </FlipValue>
              </td>
              <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">
                <FlipValue watch={cluster.podCount} enterDelayMs={enterDelayMs}>
                  {cluster.podCount}
                </FlipValue>
              </td>
              <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">
                <FlipValue watch={cluster.lastSeen ?? ''} enterDelayMs={enterDelayMs}>
                  {formatLastSeen(cluster.lastSeen)}
                </FlipValue>
              </td>
              <td className="py-2 text-sm text-muted-foreground">
                <FlipValue watch={cluster.connectionStatus} enterDelayMs={enterDelayMs}>
                  {connectionStatusLabel(cluster.connectionStatus)}
                </FlipValue>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
