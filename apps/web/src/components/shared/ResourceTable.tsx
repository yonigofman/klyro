import type { ReactNode } from 'react'
import { cn } from '#/lib/utils'

export interface ResourceTableColumn<T> {
  header: string
  /** Full className for this column's cells — typography/color included, not just overrides. */
  cellClassName: string
  render: (row: T) => ReactNode
}

/**
 * Renders a resource list as a table: hairline rows, hidden column gap fixed
 * once here (pr-6 between columns, dropped on the last), used by every
 * resource type's list component instead of each one repeating the same
 * table shell.
 */
export function ResourceTable<T>({
  rows,
  rowKey,
  columns,
}: {
  rows: T[]
  rowKey: (row: T, index: number) => string
  columns: ResourceTableColumn<T>[]
}) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="sticky top-0 z-10 border-b border-border bg-background text-xs uppercase tracking-wide text-muted-foreground">
          {columns.map((column) => (
            <th key={column.header} className="py-2 pr-6 font-normal last:pr-0">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={rowKey(row, index)} className="border-b border-border/60">
            {columns.map((column) => (
              <td
                key={column.header}
                className={cn('py-2 pr-6 last:pr-0', column.cellClassName)}
              >
                {column.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
