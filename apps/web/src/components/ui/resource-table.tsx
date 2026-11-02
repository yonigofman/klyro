import * as React from 'react'

import { cn } from '#/lib/utils'

export interface Column<TRow> {
  key: string
  label: React.ReactNode
  width?: number | string
  align?: 'left' | 'right'
  mono?: boolean
  sortable?: boolean
  render?: (row: TRow) => React.ReactNode
}

export interface ResourceTableProps<TRow extends { id: string }> {
  columns: Column<TRow>[]
  rows: TRow[]
  selectedId?: string
  onSelect?: (row: TRow) => void
  sort?: { key: string; dir: 'asc' | 'desc' }
  onSort?: (key: string) => void
  density?: 'comfortable' | 'compact'
  loading?: boolean
  caption?: React.ReactNode
  emptyState?: React.ReactNode
}

/** Dense, keyboard-navigable tables of Kubernetes objects. */
export function ResourceTable<TRow extends { id: string }>({
  columns,
  rows,
  selectedId,
  onSelect,
  sort,
  onSort,
  density = 'comfortable',
  loading,
  caption,
  emptyState,
}: ResourceTableProps<TRow>) {
  const rowHeight = density === 'compact' ? 28 : 34

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!onSelect || rows.length === 0) return
    const idx = rows.findIndex((r) => r.id === selectedId)

    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault()
      onSelect(rows[Math.min(idx + 1, rows.length - 1)] ?? rows[0])
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault()
      onSelect(rows[Math.max(idx - 1, 0)] ?? rows[0])
    } else if (e.key === 'Enter' && idx >= 0) {
      onSelect(rows[idx])
    }
  }

  return (
    <div className="rounded-md border border-line bg-surface-raised" onKeyDown={onKeyDown} tabIndex={0}>
      {caption && (
        <div className="border-b border-line px-3 py-2 text-ui text-ink-muted">{caption}</div>
      )}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={cn(
                  'px-3 py-1.5 text-left font-mono text-caption uppercase text-ink-subtle',
                  col.align === 'right' && 'text-right',
                  col.sortable && 'cursor-pointer select-none hover:text-ink',
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                {col.label}
                {sort?.key === col.key && (sort.dir === 'asc' ? ' ↑' : ' ↓')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} style={{ height: rowHeight }} className="border-b border-line last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-3">
                    <div className="h-3 w-24 animate-pulse rounded-xs bg-surface-hover" />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-ui text-ink-muted">
                {emptyState ?? 'No resources found.'}
              </td>
            </tr>
          )}

          {!loading &&
            rows.map((row) => {
              const isSelected = row.id === selectedId
              return (
                <tr
                  key={row.id}
                  style={{ height: rowHeight }}
                  onClick={() => onSelect?.(row)}
                  className={cn(
                    'relative border-b border-line last:border-0 text-ui text-ink',
                    onSelect && 'cursor-pointer hover:bg-surface-hover',
                    isSelected && 'bg-surface-active',
                  )}
                >
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={cn(
                        'relative px-3',
                        col.align === 'right' && 'text-right tabular-nums',
                        col.mono && 'font-mono',
                        i === 0 && isSelected && 'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-volt',
                      )}
                    >
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}
