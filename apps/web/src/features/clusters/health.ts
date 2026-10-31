import type { ConnectionStatus, Health } from "@klyro/api-client";

export const healthLabel: Record<Health, string> = {
  green: "Healthy",
  amber: "Degraded",
  red: "Down",
};

export const healthDotClassName: Record<Health, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function connectionStatusLabel(status: ConnectionStatus): string {
  return status === "connected" ? "Connected" : "Unreachable";
}

// Dense rows once the roster grows past the long-tail scale threshold;
// roomier spacing for the small, common case of a handful of clusters.
export function rosterDensity(clusterCount: number): "dense" | "roomy" {
  return clusterCount >= 50 ? "dense" : "roomy";
}

export function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return "Never";
  const date = new Date(lastSeen);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

/** Formats an ISO timestamp as a short relative age, e.g. "3d", "2h", "<1m". */
export function formatAge(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;

  if (days >= 1) return `${Math.floor(days)}d`;
  if (hours >= 1) return `${Math.floor(hours)}h`;
  if (minutes >= 1) return `${Math.floor(minutes)}m`;
  return "<1m";
}
