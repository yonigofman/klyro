import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Activity, LayoutDashboard, Network, Server, Settings, Workflow } from 'lucide-react'

import { cn } from '#/lib/utils'
import { BranchMark } from './branch-mark'
import { UserMenu } from './user-menu'

export interface NavItem {
  id: string
  label: string
  icon?: React.ReactNode
  count?: number
}

const DEFAULT_ITEMS: NavItem[] = [
  { id: 'ai-workspace', label: 'AI Workspace', icon: <BranchMark size={15} lit={false} /> },
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
  { id: 'infrastructure', label: 'Infrastructure', icon: <Server size={15} /> },
  { id: 'observability', label: 'Observability', icon: <Activity size={15} /> },
  { id: 'operations', label: 'Operations', icon: <Workflow size={15} /> },
  { id: 'clusters', label: 'Clusters', icon: <Network size={15} /> },
]

export interface SidebarProps {
  items?: NavItem[]
  active?: string
  user?: { name: string; email?: string }
}

function hrefFor(id: string) {
  return id === 'overview' ? '/' : `/${id}`
}

/**
 * Persistent workspace navigation. AI Workspace uses the Branch as its
 * icon — the only nav icon that isn't from Lucide. The active item gets
 * surface-active and a 3px volt notch on the left edge.
 */
export function Sidebar({ items = DEFAULT_ITEMS, active, user }: SidebarProps) {
  return (
    <div className="flex h-full flex-col justify-between" style={{ width: 'var(--sidebar-width)' }}>
      <div className="flex flex-col gap-4 p-3">
        <div className="flex items-center gap-2 px-2 py-1">
          <BranchMark size={20} />
          <span className="font-display text-title text-ink lowercase">klyro</span>
        </div>

        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
            const isActive = item.id === active
            return (
              <Link
                key={item.id}
                to={hrefFor(item.id)}
                className={cn(
                  'relative flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-ui text-ink-muted',
                  'hover:bg-surface-hover hover:text-ink',
                  isActive && 'bg-surface-active text-ink',
                )}
              >
                {isActive && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-volt" />}
                <span className={isActive ? 'text-ink' : 'text-ink-muted'}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="rounded-xs bg-surface-hover px-1 font-mono text-mono-sm text-ink-subtle">
                    {item.count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-0.5 p-3">
        <Link
          to="/settings"
          className={cn(
            'relative flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-ui text-ink-muted hover:bg-surface-hover hover:text-ink',
            active === 'settings' && 'bg-surface-active text-ink',
          )}
        >
          {active === 'settings' && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-volt" />}
          <Settings size={15} />
          <span>Settings</span>
        </Link>
        {user && <UserMenu user={user} />}
      </div>
    </div>
  )
}
