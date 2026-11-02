import * as React from 'react'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

import { cn } from '#/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap',
    'font-sans text-ui-strong rounded-sm transition-colors',
    'disabled:opacity-50 disabled:pointer-events-none',
    'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-volt text-on-volt hover:bg-volt-hover active:bg-volt-press',
        secondary: 'bg-surface-raised text-ink border border-line hover:bg-surface-hover',
        outline: 'bg-transparent text-ink border border-line-strong hover:bg-surface-hover',
        ghost: 'bg-transparent text-ink hover:bg-surface-hover',
        danger: 'bg-danger-fill text-on-danger hover:opacity-90',
      },
      size: {
        xs: 'h-control-xs px-2 text-ui',
        sm: 'h-control-sm px-2.5',
        md: 'h-control-md px-3',
        lg: 'h-control-lg px-4 text-ui',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  kbd?: string
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, icon, iconRight, kbd, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
          icon
        )}
        {children}
        {!loading && iconRight}
        {kbd && (
          <kbd className="ml-1 rounded-xs border border-line-strong px-1 font-mono text-mono-sm text-ink-subtle">
            {kbd}
          </kbd>
        )}
      </button>
    )
  },
)
Button.displayName = 'Button'
