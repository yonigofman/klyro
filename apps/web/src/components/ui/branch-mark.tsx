import * as React from 'react'

export interface BranchMarkProps {
  size?: number
  lit?: boolean
  animate?: boolean
  title?: string
  className?: string
}

/**
 * Klyro's symbol, matching the real mark geometry (klyro-mark-dark.svg): a
 * spine, a lit origin node, and two branching paths to leaf nodes. Used for
 * the logo, loaders, the investigation trace, the topology map and the AI
 * Workspace nav icon (the only nav icon that isn't from Lucide).
 */
export function BranchMark({ size = 24, lit = true, animate, title, className }: BranchMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <path
        d="M6 3V21M6 12H10L16 6M10 12L16 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="miter"
      >
        {animate && (
          <animate attributeName="stroke-dasharray" values="0,40;40,40" dur="1.2s" repeatCount="indefinite" />
        )}
      </path>
      <rect x="3.5" y="9.5" width="5" height="5" rx="1.25" fill={lit ? 'var(--color-volt)' : 'currentColor'} />
      <rect x="15" y="2.75" width="5" height="5" rx="1.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="15" y="16.25" width="5" height="5" rx="1.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
