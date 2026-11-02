import * as React from 'react'
import { ChevronRight } from 'lucide-react'

import { cn } from '#/lib/utils'

export interface BreadcrumbItem {
  label: React.ReactNode
  mono?: boolean
  onClick?: () => void
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

/** The path from a section to a resource. Earlier crumbs are buttons; the last is the current page. */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <div className="flex items-center gap-1.5 text-ui text-ink-muted">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight size={12} className="text-ink-subtle" />}
            {item.onClick && !isLast ? (
              <button
                type="button"
                onClick={item.onClick}
                className={cn('hover:text-ink', item.mono && 'font-mono')}
              >
                {item.label}
              </button>
            ) : (
              <span className={cn(isLast ? 'text-ink' : undefined, item.mono && 'font-mono')}>{item.label}</span>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
