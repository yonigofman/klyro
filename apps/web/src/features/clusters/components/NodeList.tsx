import type { NodeSummary } from "@klyro/api-client";
import { formatAge } from "#/features/clusters/health";

export function NodeList({ nodes }: { nodes: NodeSummary[] }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
          <th className="py-2 font-normal">Name</th>
          <th className="py-2 font-normal">Ready</th>
          <th className="py-2 font-normal">Version</th>
          <th className="py-2 font-normal">Age</th>
        </tr>
      </thead>
      <tbody>
        {nodes.map((node) => (
          <tr key={node.name} className="border-b border-border/60">
            <td className="py-2 font-mono font-medium text-foreground">{node.name}</td>
            <td className="py-2 font-mono text-sm uppercase text-muted-foreground">
              {node.ready ? "Ready" : "Not Ready"}
            </td>
            <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">
              {node.kubernetesVersion || "—"}
            </td>
            <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">{formatAge(node.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
