import * as React from 'react'

import { cn } from '#/lib/utils'

export interface TabItem {
  id: string
  label: React.ReactNode
  count?: number
}

export interface TabsProps {
  items: TabItem[]
  value?: string
  onChange?: (id: string) => void
  variant?: 'line' | 'segmented'
}

export function Tabs({ items, value, onChange, variant = 'line' }: TabsProps) {
  if (variant === 'segmented') {
    return (
      <div className="inline-flex gap-0.5 rounded-sm bg-surface-hover p-0.5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange?.(item.id)}
            className={cn(
              'rounded-xs px-2.5 py-1 text-ui-strong',
              item.id === value ? 'bg-surface-raised text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {item.label}
            {typeof item.count === 'number' && <span className="ml-1 text-ink-subtle">{item.count}</span>}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-4 border-b border-line">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange?.(item.id)}
          className={cn(
            'relative pb-2 text-ui-strong',
            item.id === value ? 'text-ink' : 'text-ink-muted hover:text-ink',
          )}
        >
          {item.label}
          {typeof item.count === 'number' && <span className="ml-1 text-ink-subtle">{item.count}</span>}
          {item.id === value && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-volt" />}
        </button>
      ))}
    </div>
  )
}
