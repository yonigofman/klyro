import * as React from 'react'

import { BranchMark } from './branch-mark'

export interface EmptyStateProps {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  compact?: boolean
}

/**
 * An empty view: the Branch mark, a display headline (a statement of fact,
 * not "Oops"), one line of guidance, and at most two actions.
 */
export function EmptyState({ title, description, actions, compact }: EmptyStateProps) {
  return (
    <div
      className={
        compact
          ? 'flex flex-col items-center gap-2 py-10 text-center'
          : 'flex flex-col items-center gap-4 py-16 text-center'
      }
    >
      <BranchMark size={compact ? 28 : 40} lit animate />
      <div className="flex flex-col gap-1">
        <h2 className={compact ? 'font-display text-title-lg text-ink' : 'font-display text-display text-ink'}>
          {title}
        </h2>
        {description && <p className="text-body text-ink-muted max-w-[52ch]">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
