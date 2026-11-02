import * as React from 'react'

import { cn } from '#/lib/utils'
import { BranchMark } from './branch-mark'

export interface AvatarProps {
  name: string
  src?: string
  size?: number
  kind?: 'person' | 'agent' | 'system'
  className?: string
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

/**
 * People are round with initials. Klyro (the agent) is a square tile with
 * the Branch. Systems (ArgoCD, CI) are square with initials — so audit
 * trails always show whether a person, Klyro or a pipeline acted.
 */
export function Avatar({ name, src, size = 24, kind = 'person', className }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.4) }
  const shape = kind === 'person' ? 'rounded-full' : 'rounded-xs'

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(shape, 'object-cover', className)}
        style={style}
      />
    )
  }

  if (kind === 'agent') {
    return (
      <span
        className={cn(shape, 'flex items-center justify-center bg-surface-raised border border-line text-volt', className)}
        style={style}
        aria-label={name}
      >
        <BranchMark size={size * 0.6} />
      </span>
    )
  }

  return (
    <span
      className={cn(
        shape,
        'flex items-center justify-center bg-surface-raised border border-line text-ink-muted font-mono uppercase',
        className,
      )}
      style={style}
      aria-label={name}
    >
      {initials(name)}
    </span>
  )
}
