import type { PodSummary } from '@klyro/api-client'
import { ResourceTable } from '#/components/shared/ResourceTable'
import type { ResourceTableColumn } from '#/components/shared/ResourceTable'
import { formatAge } from '#/features/clusters/health'

const columns: ResourceTableColumn<PodSummary>[] = [
  {
    header: 'Name',
    cellClassName: 'font-mono font-medium text-foreground',
    render: (pod) => pod.name,
  },
  {
    header: 'Namespace',
    cellClassName: 'font-mono text-sm text-muted-foreground',
    render: (pod) => pod.namespace,
  },
  {
    header: 'Phase',
    cellClassName: 'font-mono text-sm uppercase text-muted-foreground',
    render: (pod) => pod.phase,
  },
  {
    header: 'Ready',
    cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
    render: (pod) => pod.ready,
  },
  {
    header: 'Restarts',
    cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
    render: (pod) => pod.restarts,
  },
  {
    header: 'Node',
    cellClassName: 'font-mono text-sm text-muted-foreground',
    render: (pod) => pod.node || '—',
  },
  {
    header: 'Age',
    cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
    render: (pod) => formatAge(pod.createdAt),
  },
]

export function PodList({ pods }: { pods: PodSummary[] }) {
  return (
    <ResourceTable
      rows={pods}
      rowKey={(pod) => `${pod.namespace}/${pod.name}`}
      columns={columns}
    />
  )
}
