import * as React from 'react'
import { Search } from 'lucide-react'

export interface TopBarProps {
  left?: React.ReactNode
  center?: React.ReactNode
  right?: React.ReactNode
}

/**
 * The context strip above content. Left: where you are. Centre: search or
 * ask. Right: contextual controls, at most three.
 */
export function TopBar({ left, center, right }: TopBarProps) {
  return (
    <div
      className="flex items-center justify-between gap-4 border-b border-line bg-canvas px-4"
      style={{ height: 'var(--topbar-height)' }}
    >
      <div className="flex min-w-0 flex-1 items-center">{left}</div>
      <div className="flex items-center">
        {center ?? (
          <button
            type="button"
            className="flex items-center gap-2 rounded-sm border border-line bg-surface px-2.5 py-1 text-ui text-ink-subtle hover:bg-surface-hover"
          >
            <Search size={13} />
            <span>Search or ask</span>
            <kbd className="rounded-xs border border-line-strong px-1 font-mono text-mono-sm">⌘K</kbd>
          </button>
        )}
      </div>
      <div className="flex flex-1 items-center justify-end gap-2">{right}</div>
    </div>
  )
}
