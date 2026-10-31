import type { Health } from "@klyro/api-client";
import { healthDotClassName, healthLabel } from "#/features/clusters/health";
import { cn } from "#/lib/utils";

export function StatusDot({ health }: { health: Health }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full", healthDotClassName[health])}
      />
      <span className="font-mono text-xs tabular-nums uppercase tracking-wide text-muted-foreground">
        {healthLabel[health]}
      </span>
    </span>
  );
}
