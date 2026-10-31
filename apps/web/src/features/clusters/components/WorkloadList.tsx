import { Link } from '@tanstack/react-router'
import type { WorkloadSummary } from '@klyro/api-client'
import { ResourceTable } from '#/components/shared/ResourceTable'
import type { ResourceTableColumn } from '#/components/shared/ResourceTable'
import { formatAge } from '#/features/clusters/health'

export function WorkloadList({
  clusterId,
  workloads,
}: {
  clusterId: string
  workloads: WorkloadSummary[]
}) {
  const columns: ResourceTableColumn<WorkloadSummary>[] = [
    {
      header: 'Kind',
      cellClassName: 'font-mono text-sm uppercase text-muted-foreground',
      render: (w) => w.kind,
    },
    {
      header: 'Name',
      cellClassName: 'font-mono font-medium text-foreground',
      render: (w) => (
        <Link
          to="/clusters/$clusterId/workloads/$namespace/$kind/$name"
          params={{ clusterId, namespace: w.namespace, kind: w.kind, name: w.name }}
          className="hover:underline"
        >
          {w.name}
        </Link>
      ),
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

  return (
    <ResourceTable
      rows={workloads}
      rowKey={(w) => `${w.namespace}/${w.kind}/${w.name}`}
      columns={columns}
    />
  )
}
