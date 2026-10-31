import type { WorkloadSummary } from '@klyro/api-client'
import { ResourceTable } from '#/components/shared/ResourceTable'
import type { ResourceTableColumn } from '#/components/shared/ResourceTable'
import { formatAge } from '#/features/clusters/health'

const columns: ResourceTableColumn<WorkloadSummary>[] = [
  {
    header: 'Kind',
    cellClassName: 'font-mono text-sm uppercase text-muted-foreground',
    render: (w) => w.kind,
  },
  {
    header: 'Name',
    cellClassName: 'font-mono font-medium text-foreground',
    render: (w) => w.name,
  },
  {
    header: 'Namespace',
    cellClassName: 'font-mono text-sm text-muted-foreground',
    render: (w) => w.namespace,
  },
  {
    header: 'Ready',
    cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
    render: (w) => `${w.ready}/${w.desired}`,
  },
  {
    header: 'Age',
    cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
    render: (w) => formatAge(w.createdAt),
  },
]

export function WorkloadList({ workloads }: { workloads: WorkloadSummary[] }) {
  return (
    <ResourceTable
      rows={workloads}
      rowKey={(w) => `${w.namespace}/${w.kind}/${w.name}`}
      columns={columns}
    />
  )
}
