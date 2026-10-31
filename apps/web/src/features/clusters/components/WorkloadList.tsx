import type { WorkloadSummary } from "@klyro/api-client";
import { formatAge } from "#/features/clusters/health";

export function WorkloadList({ workloads }: { workloads: WorkloadSummary[] }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
          <th className="py-2 font-normal">Kind</th>
          <th className="py-2 font-normal">Name</th>
          <th className="py-2 font-normal">Namespace</th>
          <th className="py-2 font-normal">Ready</th>
          <th className="py-2 font-normal">Age</th>
        </tr>
      </thead>
      <tbody>
        {workloads.map((workload) => (
          <tr key={`${workload.namespace}/${workload.kind}/${workload.name}`} className="border-b border-border/60">
            <td className="py-2 font-mono text-sm uppercase text-muted-foreground">{workload.kind}</td>
            <td className="py-2 font-mono font-medium text-foreground">{workload.name}</td>
            <td className="py-2 font-mono text-sm text-muted-foreground">{workload.namespace}</td>
            <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">
              {workload.ready}/{workload.desired}
            </td>
            <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">
              {formatAge(workload.createdAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
