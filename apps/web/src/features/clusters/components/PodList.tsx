import type { PodSummary } from "@klyro/api-client";
import { formatAge } from "#/features/clusters/health";

export function PodList({ pods }: { pods: PodSummary[] }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
          <th className="py-2 font-normal">Name</th>
          <th className="py-2 font-normal">Namespace</th>
          <th className="py-2 font-normal">Phase</th>
          <th className="py-2 font-normal">Ready</th>
          <th className="py-2 font-normal">Restarts</th>
          <th className="py-2 font-normal">Node</th>
          <th className="py-2 font-normal">Age</th>
        </tr>
      </thead>
      <tbody>
        {pods.map((pod) => (
          <tr key={`${pod.namespace}/${pod.name}`} className="border-b border-border/60">
            <td className="py-2 font-mono font-medium text-foreground">{pod.name}</td>
            <td className="py-2 font-mono text-sm text-muted-foreground">{pod.namespace}</td>
            <td className="py-2 font-mono text-sm uppercase text-muted-foreground">{pod.phase}</td>
            <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">{pod.ready}</td>
            <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">{pod.restarts}</td>
            <td className="py-2 font-mono text-sm text-muted-foreground">{pod.node || "—"}</td>
            <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">
              {formatAge(pod.createdAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
