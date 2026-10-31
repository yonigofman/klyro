import type { Health } from '@klyro/api-client'
import { healthDotClassName } from '#/features/clusters/health'
import { cn } from '#/lib/utils'

/**
 * The roster's health-color vocabulary (green/amber/red — CONTEXT.md's
 * Health entry), reused bare — no fixed label — for the same readiness
 * signal at Resource scale: a Pod's own Ready condition, a Node's own
 * Ready status, a Workload's own rollout, instead of only ever showing it
 * aggregated at the Cluster level. Never used for anything these three
 * colors don't already mean.
 */
export function Dot({ health, className }: { health: Health; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-2 shrink-0 rounded-full', healthDotClassName[health], className)}
    />
  )
}
