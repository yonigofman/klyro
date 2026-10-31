import type { EventSummary } from '@klyro/api-client'
import { ResourceTable } from '#/components/shared/ResourceTable'
import type { ResourceTableColumn } from '#/components/shared/ResourceTable'
import { formatAge } from '#/features/clusters/health'

const typeColumn: ResourceTableColumn<EventSummary> = {
  header: 'Type',
  cellClassName: 'font-mono text-sm uppercase text-muted-foreground',
  render: (e) => e.type,
}
const reasonColumn: ResourceTableColumn<EventSummary> = {
  header: 'Reason',
  cellClassName: 'font-mono font-medium text-foreground',
  render: (e) => e.reason,
}
const namespaceColumn: ResourceTableColumn<EventSummary> = {
  header: 'Namespace',
  cellClassName: 'font-mono text-sm text-muted-foreground',
  render: (e) => e.namespace,
}
const objectColumn: ResourceTableColumn<EventSummary> = {
  header: 'Object',
  cellClassName: 'font-mono text-sm text-muted-foreground',
  render: (e) => `${e.involvedObjectKind}/${e.involvedObjectName}`,
}
const messageColumn: ResourceTableColumn<EventSummary> = {
  header: 'Message',
  cellClassName: 'text-sm text-muted-foreground',
  render: (e) => e.message,
}
const countColumn: ResourceTableColumn<EventSummary> = {
  header: 'Count',
  cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
  render: (e) => e.count,
}
const lastSeenColumn: ResourceTableColumn<EventSummary> = {
  header: 'Last seen',
  cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
  render: (e) => formatAge(e.lastSeen),
}

export function EventList({
  events,
  variant = 'full',
}: {
  events: EventSummary[]
  /**
   * 'full' (the Cluster-wide Events tab, mixed namespaces/objects) shows
   * every column. 'compact' (a single Resource's own Events section, where
   * the namespace and object are already the page itself) drops the two
   * redundant columns so the table isn't restating what the page already
   * says.
   */
  variant?: 'full' | 'compact'
}) {
  const columns =
    variant === 'compact'
      ? [typeColumn, reasonColumn, messageColumn, countColumn, lastSeenColumn]
      : [typeColumn, reasonColumn, namespaceColumn, objectColumn, messageColumn, countColumn, lastSeenColumn]

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
