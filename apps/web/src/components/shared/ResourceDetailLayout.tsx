import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { Health } from '@klyro/api-client'
import { formatAge } from '#/features/clusters/health'
import { useClusterSelectionStore } from '#/features/clusters/selection-store'
import { Dot } from '#/components/shared/Dot'

export function ResourceDetailLayout({
  kind,
  name,
  namespace,
  createdAt,
  backHref,
  clusterId,
  health,
  children,
}: {
  kind: string
  name: string
  namespace?: string
  createdAt: string
  backHref: string
  clusterId: string
  /** This Resource's own readiness, not the Cluster's — pass it where a
   * kind has one (Pod/Node/Workload); omit it where "ready" isn't a
   * concept the kind has (Service/Ingress). See the Dot component. */
  health?: Health
  children: ReactNode
}) {
  // The dashboard's Cluster panel is driven by selection-store state, not
  // the URL, so landing here directly (bookmark, reload, fresh navigation)
  // leaves it unset — re-select on mount so "Back to dashboard" actually
  // reopens this Resource's Cluster, not just the bare roster.
  const select = useClusterSelectionStore((state) => state.select)
  useEffect(() => {
    select(clusterId)
  }, [select, clusterId])

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-background p-6 text-foreground">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            to={backHref}
            className="font-mono text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            ← Back to dashboard
          </Link>
        </div>
        <div className="flex flex-col items-end gap-1">
          <h1 className="flex items-center gap-2 font-mono text-lg font-semibold tracking-tight text-foreground">
            {health && <Dot health={health} />}
            <span>
              <span className="text-muted-foreground">
                {kind} / {namespace ? `${namespace}/` : ''}
              </span>
              {name}
            </span>
          </h1>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            Age {formatAge(createdAt)}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-6">{children}</div>
    </div>
  )
}

export function DetailSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}
