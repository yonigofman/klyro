import type { ServiceSummary } from '@klyro/api-client'
import { ResourceTable } from '#/components/shared/ResourceTable'
import type { ResourceTableColumn } from '#/components/shared/ResourceTable'
import { formatAge } from '#/features/clusters/health'

const columns: ResourceTableColumn<ServiceSummary>[] = [
  {
    header: 'Name',
    cellClassName: 'font-mono font-medium text-foreground',
    render: (svc) => svc.name,
  },
  {
    header: 'Namespace',
    cellClassName: 'font-mono text-sm text-muted-foreground',
    render: (svc) => svc.namespace,
  },
  {
    header: 'Type',
    cellClassName: 'font-mono text-sm uppercase text-muted-foreground',
    render: (svc) => svc.type,
  },
  {
    header: 'Cluster IP',
    cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
    render: (svc) => svc.clusterIP || '—',
  },
  {
    header: 'Ports',
    cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
    render: (svc) => (svc.ports.length > 0 ? svc.ports.join(', ') : '—'),
  },
  {
    header: 'Age',
    cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
    render: (svc) => formatAge(svc.createdAt),
  },
]

export function ServiceList({ services }: { services: ServiceSummary[] }) {
  return (
    <ResourceTable
      rows={services}
      rowKey={(svc) => `${svc.namespace}/${svc.name}`}
      columns={columns}
    />
  )
}
