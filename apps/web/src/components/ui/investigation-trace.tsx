import * as React from 'react'

import { cn } from '#/lib/utils'

export interface TraceStep {
  id: string
  title: React.ReactNode
  detail?: React.ReactNode
  status: 'done' | 'active' | 'pending' | 'error'
  children?: React.ReactNode
}

export interface InvestigationTraceProps {
  steps: TraceStep[]
}

const DOT: Record<TraceStep['status'], string> = {
  done: 'bg-success',
  active: 'bg-volt animate-pulse',
  pending: 'bg-transparent border border-line-strong',
  error: 'bg-danger',
}

/** A spine of steps hanging off one line — the active node is lit. */
export function InvestigationTrace({ steps }: InvestigationTraceProps) {
  return (
    <div className="flex flex-col">
      {steps.map((step, i) => (
        <div key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && (
            <span className="absolute left-[5px] top-3 bottom-0 w-px bg-line" aria-hidden="true" />
          )}
          <span className={cn('relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full', DOT[step.status])} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-baseline gap-2">
              <span className={cn('text-ui-strong', step.status === 'pending' ? 'text-ink-subtle' : 'text-ink')}>
                {step.title}
              </span>
              {step.detail && <span className="text-mono-sm text-ink-subtle">{step.detail}</span>}
            </div>
            {step.children}
          </div>
        </div>
      ))}
    </div>
  )
}
