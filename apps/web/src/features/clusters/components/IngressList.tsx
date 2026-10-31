import { Link } from '@tanstack/react-router'
import type { IngressSummary } from '@klyro/api-client'
import { ResourceTable } from '#/components/shared/ResourceTable'
import type { ResourceTableColumn } from '#/components/shared/ResourceTable'
import { formatAge } from '#/features/clusters/health'

export function IngressList({
  clusterId,
  ingresses,
}: {
  clusterId: string
  ingresses: IngressSummary[]
}) {
  const columns: ResourceTableColumn<IngressSummary>[] = [
    {
      header: 'Name',
      cellClassName: 'font-mono font-medium text-foreground',
      render: (ing) => (
        <Link
          to="/clusters/$clusterId/ingresses/$namespace/$name"
          params={{ clusterId, namespace: ing.namespace, name: ing.name }}
          className="hover:underline"
        >
          {ing.name}
        </Link>
      ),
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

  return (
    <ResourceTable
      rows={ingresses}
      rowKey={(ing) => `${ing.namespace}/${ing.name}`}
      columns={columns}
    />
  )
}
