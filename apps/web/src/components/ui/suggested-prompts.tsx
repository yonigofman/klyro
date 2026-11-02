import * as React from 'react'

import { cn } from '#/lib/utils'

export interface SuggestedPromptsProps {
  prompts: { title: string; detail?: string; icon?: React.ReactNode; scope?: string }[]
  onPick?: (title: string) => void
  layout?: 'grid' | 'list'
}

export function SuggestedPrompts({ prompts, onPick, layout = 'grid' }: SuggestedPromptsProps) {
  return (
    <div className={cn(layout === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2')}>
      {prompts.map((p) => (
        <button
          key={p.title}
          type="button"
          onClick={() => onPick?.(p.title)}
          className="flex flex-col gap-1 rounded-md border border-line bg-surface-raised p-3 text-left hover:bg-surface-hover hover:border-line-strong"
        >
          <div className="flex items-center gap-2">
            {p.icon && <span className="text-ink-muted">{p.icon}</span>}
            <span className="text-ui-strong text-ink">{p.title}</span>
          </div>
          {p.detail && <span className="text-ui text-ink-muted">{p.detail}</span>}
          {p.scope && <span className="text-mono-sm text-ink-subtle">{p.scope}</span>}
        </button>
      ))}
    </div>
  )
}
