import type { EventSummary } from '@klyro/api-client'
import { QueryState } from '#/components/shared/QueryState'
import { useEvents } from '#/features/clusters/queries'
import { EventList } from '#/features/clusters/components/EventList'

/**
 * The Events section every Detail page shows: this one Resource's own
 * Events, reusing the Cluster-wide Events list with a client-side filter
 * (see CONTEXT.md's Event entry — there's no per-Resource backend
 * endpoint). Fixed-height and scrollable, so a chatty Resource's Events
 * don't push the rest of the page down — same panel language as the
 * Cluster detail panel's own fixed-height tab area.
 */
export function ResourceEventsSection({
  clusterId,
  namespace,
  kind,
  name,
}: {
  clusterId: string
  /** Pass '' for a Cluster-scoped Resource (e.g. a Node) — Events
   * themselves are always Namespace-scoped, so this fetches across all
   * namespaces and relies on the kind+name filter below. */
  namespace: string
  kind: string
  name: string
}) {
  const eventsQuery = useEvents(clusterId, namespace)
  const matches = (e: EventSummary) => e.involvedObjectKind === kind && e.involvedObjectName === name

  return (
    <QueryState
      query={eventsQuery}
      loadingLabel="Loading events…"
      isEmpty={(events) => events.filter(matches).length === 0}
      empty={<p className="text-sm text-muted-foreground">No events for this {kind}.</p>}
    >
      {(events) => (
        <div className="max-h-64 overflow-y-auto rounded-md border border-border">
          <EventList events={events.filter(matches)} variant="compact" />
        </div>
      )}
    </QueryState>
  )
}
