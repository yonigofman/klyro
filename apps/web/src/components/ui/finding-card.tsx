import * as React from 'react'

import { cn } from '#/lib/utils'

export interface FindingCardProps {
  n: number
  title: React.ReactNode
  confidence?: 'low' | 'medium' | 'high'
  tone?: 'danger' | 'warning' | 'info' | 'success'
  children?: React.ReactNode
  evidence?: React.ReactNode
  resource?: React.ReactNode
}

const RULE: Record<NonNullable<FindingCardProps['tone']>, string> = {
  danger: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-info',
  success: 'border-l-success',
}

/** State the conclusion, show the evidence. */
export function FindingCard({ n, title, confidence, tone = 'info', children, evidence, resource }: FindingCardProps) {
  return (
    <div className={cn('rounded-md border border-line border-l-2 bg-surface-raised p-3', RULE[tone])}>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-mono-sm text-ink-subtle">{n}</span>
        <h3 className="flex-1 text-title-lg text-ink">{title}</h3>
        {confidence && (
          <span className="shrink-0 text-mono-sm text-ink-subtle">{confidence} confidence</span>
        )}
      </div>
      {children && <div className="mt-1 text-body text-ink-muted">{children}</div>}
      {resource && <div className="mt-2">{resource}</div>}
      {evidence && <div className="mt-2 flex flex-wrap gap-1.5">{evidence}</div>}
    </div>
  )
}
