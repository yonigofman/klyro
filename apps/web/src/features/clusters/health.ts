import type { ConnectionStatus, Health } from '@klyro/api-client'

export const healthLabel: Record<Health, string> = {
  green: 'Healthy',
  amber: 'Degraded',
  red: 'Down',
}

export const healthDotClassName: Record<Health, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
}

export const healthTextClassName: Record<Health, string> = {
  green: 'text-emerald-500',
  amber: 'text-amber-500',
  red: 'text-red-500',
}

export function connectionStatusLabel(status: ConnectionStatus): string {
  return status === 'connected' ? 'Connected' : 'Unreachable'
}

// Same traffic-light vocabulary as Cluster Health (CONTEXT.md), applied to
// the underlying per-Resource signals Health is itself built from — a
// Resource's own readiness, not an aggregate.

// Most Kubernetes conditions are "good when True" (Ready, Initialized,
// ContainersReady, ...), but a few well-known ones are inverted — True
// means something's wrong. Getting this backwards would show a healthy
// Node's "MemoryPressure: False" as red.
const invertedConditionTypes = new Set([
  'MemoryPressure',
  'DiskPressure',
  'PIDPressure',
  'NetworkUnavailable',
])

/** A Kubernetes condition's status ("True"/"False"/"Unknown") as Health,
 * accounting for conditions where True is the bad state. */
export function conditionHealth(type: string, status: string): Health {
  if (status !== 'True' && status !== 'False') return 'amber'
  const isGood = invertedConditionTypes.has(type) ? status === 'False' : status === 'True'
  return isGood ? 'green' : 'red'
}

/** A simple Ready/Not Ready signal (a Pod's Ready condition, a Node's
 * readiness) as Health. */
export function readyHealth(ready: boolean): Health {
  return ready ? 'green' : 'red'
}

/** A Workload's rollout (ready vs. desired replicas) as Health — mirrors
 * the exact "Workload below desired replicas" signal Cluster Health already
 * factors in. */
export function rolloutHealth(ready: number, desired: number): Health {
  if (desired === 0 || ready >= desired) return 'green'
  if (ready === 0) return 'red'
  return 'amber'
}

// Dense rows once the roster grows past the long-tail scale threshold;
// roomier spacing for the small, common case of a handful of clusters.
export function rosterDensity(clusterCount: number): 'dense' | 'roomy' {
  return clusterCount >= 50 ? 'dense' : 'roomy'
}

export function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return 'Never'
  const date = new Date(lastSeen)
  if (Number.isNaN(date.getTime())) return 'Never'
  return date.toLocaleString()
}

/** Formats an ISO timestamp as a short relative age, e.g. "3d", "2h", "<1m". */
export function formatAge(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '—'

  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000)
  const minutes = seconds / 60
  const hours = minutes / 60
  const days = hours / 24

  if (days >= 1) return `${Math.floor(days)}d`
  if (hours >= 1) return `${Math.floor(hours)}h`
  if (minutes >= 1) return `${Math.floor(minutes)}m`
  return '<1m'
}
