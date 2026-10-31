import type { IngressSummary } from '@klyro/api-client'
import { ResourceTable } from '#/components/shared/ResourceTable'
import type { ResourceTableColumn } from '#/components/shared/ResourceTable'
import { formatAge } from '#/features/clusters/health'

const columns: ResourceTableColumn<IngressSummary>[] = [
  {
    header: 'Name',
    cellClassName: 'font-mono font-medium text-foreground',
    render: (ing) => ing.name,
  },
  {
    header: 'Namespace',
    cellClassName: 'font-mono text-sm text-muted-foreground',
    render: (ing) => ing.namespace,
  },
  {
    header: 'Hosts',
    cellClassName: 'font-mono text-sm text-muted-foreground',
    render: (ing) => (ing.hosts.length > 0 ? ing.hosts.join(', ') : '—'),
  },
  {
    header: 'Age',
    cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
    render: (ing) => formatAge(ing.createdAt),
  },
]

export function IngressList({ ingresses }: { ingresses: IngressSummary[] }) {
  return (
    <ResourceTable
      rows={ingresses}
      rowKey={(ing) => `${ing.namespace}/${ing.name}`}
      columns={columns}
    />
  )
}
