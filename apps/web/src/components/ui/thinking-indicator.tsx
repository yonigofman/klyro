import * as React from 'react'

import { BranchMark } from './branch-mark'

export interface ThinkingIndicatorProps {
  phase: React.ReactNode
  elapsed?: string
  detail?: React.ReactNode
}

/** A status phase as a verb ("Querying Mimir"), never "Thinking…". */
export function ThinkingIndicator({ phase, elapsed, detail }: ThinkingIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <BranchMark size={14} animate />
      <span className="text-ui text-ink-muted">{phase}</span>
      {detail && <span className="text-mono-sm text-ink-subtle">{detail}</span>}
      {elapsed && <span className="text-mono-sm text-ink-subtle">{elapsed}</span>}
    </div>
  )
}
