import type { EventSummary } from "@klyro/api-client";
import { formatAge } from "#/features/clusters/health";

export function EventList({ events }: { events: EventSummary[] }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
          <th className="py-2 font-normal">Type</th>
          <th className="py-2 font-normal">Reason</th>
          <th className="py-2 font-normal">Object</th>
          <th className="py-2 font-normal">Message</th>
          <th className="py-2 font-normal">Count</th>
          <th className="py-2 font-normal">Last seen</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event, index) => (
          <tr
            key={`${event.namespace}/${event.involvedObjectKind}/${event.involvedObjectName}/${index}`}
            className="border-b border-border/60"
          >
            <td className="py-2 font-mono text-sm uppercase text-muted-foreground">{event.type}</td>
            <td className="py-2 font-mono font-medium text-foreground">{event.reason}</td>
            <td className="py-2 font-mono text-sm text-muted-foreground">
              {event.involvedObjectKind}/{event.involvedObjectName}
            </td>
            <td className="py-2 text-sm text-muted-foreground">{event.message}</td>
            <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">{event.count}</td>
            <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">
              {formatAge(event.lastSeen)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
