import type { IngressSummary } from "@klyro/api-client";
import { formatAge } from "#/features/clusters/health";

export function IngressList({ ingresses }: { ingresses: IngressSummary[] }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
          <th className="py-2 font-normal">Name</th>
          <th className="py-2 font-normal">Namespace</th>
          <th className="py-2 font-normal">Hosts</th>
          <th className="py-2 font-normal">Age</th>
        </tr>
      </thead>
      <tbody>
        {ingresses.map((ingress) => (
          <tr key={`${ingress.namespace}/${ingress.name}`} className="border-b border-border/60">
            <td className="py-2 font-mono font-medium text-foreground">{ingress.name}</td>
            <td className="py-2 font-mono text-sm text-muted-foreground">{ingress.namespace}</td>
            <td className="py-2 font-mono text-sm text-muted-foreground">
              {ingress.hosts.length > 0 ? ingress.hosts.join(", ") : "—"}
            </td>
            <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">
              {formatAge(ingress.createdAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
