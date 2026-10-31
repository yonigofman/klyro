import type { NodeSummary } from '@klyro/api-client'
import { ResourceTable } from '#/components/shared/ResourceTable'
import type { ResourceTableColumn } from '#/components/shared/ResourceTable'
import { formatAge } from '#/features/clusters/health'

const columns: ResourceTableColumn<NodeSummary>[] = [
  {
    header: 'Name',
    cellClassName: 'font-mono font-medium text-foreground',
    render: (node) => node.name,
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

export function NodeList({ nodes }: { nodes: NodeSummary[] }) {
  return (
    <ResourceTable
      rows={nodes}
      rowKey={(node) => node.name}
      columns={columns}
    />
  )
}
