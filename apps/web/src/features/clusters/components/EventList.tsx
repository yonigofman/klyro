import type { EventSummary } from '@klyro/api-client'
import { ResourceTable } from '#/components/shared/ResourceTable'
import type { ResourceTableColumn } from '#/components/shared/ResourceTable'
import { formatAge } from '#/features/clusters/health'

const columns: ResourceTableColumn<EventSummary>[] = [
  {
    header: 'Type',
    cellClassName: 'font-mono text-sm uppercase text-muted-foreground',
    render: (e) => e.type,
  },
  {
    header: 'Reason',
    cellClassName: 'font-mono font-medium text-foreground',
    render: (e) => e.reason,
  },
  {
    header: 'Namespace',
    cellClassName: 'font-mono text-sm text-muted-foreground',
    render: (e) => e.namespace,
  },
  {
    header: 'Object',
    cellClassName: 'font-mono text-sm text-muted-foreground',
    render: (e) => `${e.involvedObjectKind}/${e.involvedObjectName}`,
  },
  {
    header: 'Message',
    cellClassName: 'text-sm text-muted-foreground',
    render: (e) => e.message,
  },
  {
    header: 'Count',
    cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
    render: (e) => e.count,
  },
  {
    header: 'Last seen',
    cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
    render: (e) => formatAge(e.lastSeen),
  },
]

export function EventList({ events }: { events: EventSummary[] }) {
  return (
    <ResourceTable
      rows={events}
      rowKey={(e, index) =>
        `${e.namespace}/${e.involvedObjectKind}/${e.involvedObjectName}/${index}`
      }
      columns={columns}
    />
  )
}
