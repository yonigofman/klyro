import * as React from 'react'
import { Keyboard, LogOut, Moon, Sun, User } from 'lucide-react'

import { cn } from '#/lib/utils'
import { Avatar } from './avatar'

export interface UserMenuProps {
  user: { name: string; email?: string }
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Account menu in the sidebar footer: profile, theme, sign out. Opens
 * upward since it sits in the footer. This is a Phase 3 auth-shell stub —
 * no real session or sign-out backend yet.
 */
export function UserMenu({ user, open: openProp, onOpenChange }: UserMenuProps) {
  const [openState, setOpenState] = React.useState(false)
  const open = openProp ?? openState
  const setOpen = onOpenChange ?? setOpenState

  const toggleTheme = () => {
    const root = document.documentElement
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
  }

  return (
    <div className="relative">
      {open && <button aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left',
          'hover:bg-surface-hover focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        )}
      >
        <Avatar name={user.name} size={24} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-ui-strong text-ink">{user.name}</span>
          {user.email && <span className="truncate text-mono-sm text-ink-subtle">{user.email}</span>}
        </span>
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 z-50 mb-1 w-56 rounded-md border border-line bg-surface-overlay p-1 shadow-[var(--shadow-md)]"
          role="menu"
        >
          <MenuRow icon={<User size={14} />} label="Profile" />
          <MenuRow icon={<Keyboard size={14} />} label="Keyboard shortcuts" kbd="?" />
          <MenuRow
            icon={document.documentElement.dataset.theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            label="Toggle theme"
            onClick={toggleTheme}
          />
          <div className="my-1 h-px bg-line" />
          <MenuRow icon={<LogOut size={14} />} label="Sign out" />
        </div>
      )}
    </div>
  )
}

function MenuRow({
  icon,
  label,
  kbd,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  kbd?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-ui text-ink hover:bg-surface-hover"
    >
      <span className="text-ink-muted">{icon}</span>
      <span className="flex-1">{label}</span>
      {kbd && <kbd className="rounded-xs border border-line-strong px-1 font-mono text-mono-sm text-ink-subtle">{kbd}</kbd>}
    </button>
  )
}
