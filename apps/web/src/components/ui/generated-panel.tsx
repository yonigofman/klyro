import * as React from 'react'

import { cn } from '#/lib/utils'

export interface GeneratedPanelProps {
  kicker?: React.ReactNode
  title?: React.ReactNode
  sources?: number
  toolbar?: React.ReactNode
  children?: React.ReactNode
  state?: 'assembling' | 'ready' | 'stale' | 'error'
  className?: string
}

/**
 * Everything Klyro generates lives here, marked only by volt corner ticks —
 * never a border treatment that looks like decoration for its own sake.
 */
export function GeneratedPanel({ kicker, title, sources, toolbar, children, state = 'ready', className }: GeneratedPanelProps) {
  return (
    <div className={cn('relative rounded-lg border border-line bg-surface p-4', className)}>
      <Tick className="left-2 top-2" />
      <Tick className="right-2 top-2 rotate-90" />
      <Tick className="left-2 bottom-2 -rotate-90" />
      <Tick className="right-2 bottom-2 rotate-180" />

      {(kicker || title || toolbar) && (
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <div className="flex flex-col gap-0.5">
            {kicker && <span className="font-mono text-caption uppercase text-ink-subtle">{kicker}</span>}
            {title && <span className="text-title text-ink">{title}</span>}
          </div>
          <div className="flex items-center gap-2">
            {typeof sources === 'number' && (
              <span className="font-mono text-mono-sm text-ink-subtle">{sources} sources</span>
            )}
            {toolbar}
          </div>
        </div>
      )}

      <div className={cn('px-1', state === 'assembling' && 'animate-pulse opacity-70')}>{children}</div>
    </div>
  )
}

function Tick({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className={cn('absolute text-volt', className)} aria-hidden="true">
      <path d="M0 6V0H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
