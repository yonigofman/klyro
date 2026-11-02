import * as React from 'react'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

import { cn } from '#/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-label font-sans whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-hover text-ink-muted',
        volt: 'bg-volt text-on-volt',
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning',
        danger: 'bg-danger-soft text-danger',
        info: 'bg-info-soft text-info',
        outline: 'bg-transparent text-ink border border-line-strong',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean
  mono?: boolean
}

export function Badge({ className, tone, dot, mono, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), mono && 'font-mono', className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
