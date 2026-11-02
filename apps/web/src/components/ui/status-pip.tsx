import * as React from 'react'

import { cn } from '#/lib/utils'

export type Status = 'healthy' | 'warning' | 'danger' | 'info' | 'neutral' | 'progress'

export interface StatusPipProps {
  status: Status
  size?: number
  pulse?: boolean
  label?: string
  className?: string
}

/**
 * Shape carries the state, not just color, so StatusPip reads in grayscale
 * and for color-blind users: filled square (healthy), half-filled square
 * (warning), diamond (danger), hollow square (neutral), pulsing volt square
 * (progress), dot (info).
 */
export function StatusPip({ status, size = 8, pulse, label, className }: StatusPipProps) {
  const style = { width: size, height: size }
  const shouldPulse = pulse || status === 'progress'

  const shape = (() => {
    switch (status) {
      case 'healthy':
        return <span className={cn('block rounded-xs bg-success', shouldPulse && 'animate-pulse')} style={style} />
      case 'warning':
        return (
          <span
            className={cn('block rounded-xs bg-warning', shouldPulse && 'animate-pulse')}
            style={{ ...style, background: 'linear-gradient(to top, var(--color-warning) 50%, transparent 50%)' }}
          />
        )
      case 'danger':
        return (
          <span
            className={cn('block bg-danger', shouldPulse && 'animate-pulse')}
            style={{ ...style, transform: 'rotate(45deg)', borderRadius: 1 }}
          />
        )
      case 'neutral':
        return <span className="block rounded-xs border border-neutral-status" style={style} />
      case 'progress':
        return <span className="block animate-pulse rounded-xs bg-volt" style={style} />
      case 'info':
        return <span className={cn('block rounded-full bg-info', shouldPulse && 'animate-pulse')} style={style} />
    }
  })()

  return (
    <span className="inline-flex items-center" role={label ? 'img' : undefined} aria-label={label}>
      {shape}
    </span>
  )
}
