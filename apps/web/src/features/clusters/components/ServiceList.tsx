import type { ServiceSummary } from "@klyro/api-client";
import { formatAge } from "#/features/clusters/health";

export function ServiceList({ services }: { services: ServiceSummary[] }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
          <th className="py-2 font-normal">Name</th>
          <th className="py-2 font-normal">Namespace</th>
          <th className="py-2 font-normal">Type</th>
          <th className="py-2 font-normal">Cluster IP</th>
          <th className="py-2 font-normal">Ports</th>
          <th className="py-2 font-normal">Age</th>
        </tr>
      </thead>
      <tbody>
        {services.map((service) => (
          <tr key={`${service.namespace}/${service.name}`} className="border-b border-border/60">
            <td className="py-2 font-mono font-medium text-foreground">{service.name}</td>
            <td className="py-2 font-mono text-sm text-muted-foreground">{service.namespace}</td>
            <td className="py-2 font-mono text-sm uppercase text-muted-foreground">{service.type}</td>
            <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">{service.clusterIP || "—"}</td>
            <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">
              {service.ports.length > 0 ? service.ports.join(", ") : "—"}
            </td>
            <td className="py-2 font-mono text-sm tabular-nums text-muted-foreground">
              {formatAge(service.createdAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
