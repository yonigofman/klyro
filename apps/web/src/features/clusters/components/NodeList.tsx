import { Link } from '@tanstack/react-router'
import type { NodeSummary } from '@klyro/api-client'
import { ResourceTable } from '#/components/shared/ResourceTable'
import type { ResourceTableColumn } from '#/components/shared/ResourceTable'
import { formatAge } from '#/features/clusters/health'

export function NodeList({ clusterId, nodes }: { clusterId: string; nodes: NodeSummary[] }) {
  const columns: ResourceTableColumn<NodeSummary>[] = [
    {
      header: 'Name',
      cellClassName: 'font-mono font-medium text-foreground',
      render: (node) => (
        <Link
          to="/clusters/$clusterId/nodes/$name"
          params={{ clusterId, name: node.name }}
          className="hover:underline"
        >
          {node.name}
        </Link>
      ),
    },
    {
      header: 'Ready',
      cellClassName: 'font-mono text-sm uppercase text-muted-foreground',
      render: (node) => (node.ready ? 'Ready' : 'Not Ready'),
    },
    {
      header: 'Version',
      cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
      render: (node) => node.kubernetesVersion || '—',
    },
    {
      header: 'Age',
      cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
      render: (node) => formatAge(node.createdAt),
    },
  ]

  return <ResourceTable rows={nodes} rowKey={(node) => node.name} columns={columns} />
}
