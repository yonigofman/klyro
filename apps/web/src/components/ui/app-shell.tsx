import * as React from 'react'

export interface AppShellProps {
  sidebar?: React.ReactNode
  topbar?: React.ReactNode
  children: React.ReactNode
  height?: number | string
}

/**
 * The desktop frame: sidebar on the left, top bar above, content filling
 * the rest. One shell per window — don't nest shells, and don't scroll the
 * shell itself: the content pane scrolls.
 */
export function AppShell({ sidebar, topbar, children, height = '100vh' }: AppShellProps) {
  return (
    <div className="flex bg-canvas" style={{ height }}>
      {sidebar && <div className="flex-shrink-0 border-r border-line">{sidebar}</div>}
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        <div className="min-h-0 flex-1 overflow-y-auto bg-surface">{children}</div>
      </div>
    </div>
  )
}
