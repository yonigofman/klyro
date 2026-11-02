import * as React from 'react'

import { cn } from '#/lib/utils'
import type { Status } from './status-pip'
import { StatusPip } from './status-pip'

export interface TopoNode {
  id: string
  kind: string
  name: string
  status?: Status
  col: number
  row: number
  state?: 'found' | 'pending' | 'hidden'
  focus?: boolean
  meta?: string
}

export interface TopoEdge {
  from: string
  to: string
  state?: 'found' | 'pending' | 'hidden'
  tone?: 'default' | 'active' | 'danger'
  label?: string
}

export interface TopologyMapProps {
  nodes: TopoNode[]
  edges: TopoEdge[]
  columns?: string[]
  colWidth?: number
  rowHeight?: number
  nodeWidth?: number
  selectedId?: string
  onSelect?: (node: TopoNode) => void
  className?: string
}

const NODE_HEIGHT = 44

/**
 * The signature visualisation: resources as nodes in layered columns,
 * connected by orthogonal branching paths. State is the story — pending
 * nodes are dashed, found nodes are solid, edges draw parent to child.
 */
export function TopologyMap({
  nodes,
  edges,
  columns,
  colWidth = 200,
  rowHeight = 64,
  nodeWidth = 150,
  selectedId,
  onSelect,
  className,
}: TopologyMapProps) {
  const visibleNodes = nodes.filter((n) => n.state !== 'hidden')
  const byId = React.useMemo(() => new Map(visibleNodes.map((n) => [n.id, n])), [visibleNodes])

  const maxCol = Math.max(0, ...visibleNodes.map((n) => n.col))
  const maxRow = Math.max(0, ...visibleNodes.map((n) => n.row))
  const width = (maxCol + 1) * colWidth
  const height = (maxRow + 1) * rowHeight + NODE_HEIGHT

  const center = (n: TopoNode) => ({
    x: n.col * colWidth + nodeWidth / 2 + 8,
    y: n.row * rowHeight + NODE_HEIGHT / 2 + 8,
  })

  return (
    <div className={cn('overflow-x-auto', className)}>
      {columns && (
        <div className="mb-2 flex text-caption text-ink-subtle" style={{ width }}>
          {columns.map((label, i) => (
            <div key={label} style={{ width: colWidth, marginLeft: i === 0 ? 8 : 0 }}>
              {label}
            </div>
          ))}
        </div>
      )}
      <div className="relative" style={{ width, height }}>
        <svg width={width} height={height} className="absolute inset-0" aria-hidden="true">
          {edges
            .filter((e) => e.state !== 'hidden' && byId.has(e.from) && byId.has(e.to))
            .map((e, i) => {
              const a = center(byId.get(e.from)!)
              const b = center(byId.get(e.to)!)
              const midX = a.x + (b.x - a.x) / 2
              const d = `M ${a.x} ${a.y} H ${midX} V ${b.y} H ${b.x}`
              const stroke =
                e.tone === 'danger' ? 'var(--color-danger)' : e.tone === 'active' ? 'var(--color-volt)' : 'var(--color-line-strong)'
              return (
                <path
                  key={`${e.from}-${e.to}-${i}`}
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={1.5}
                  strokeDasharray={e.state === 'pending' ? '3 3' : undefined}
                />
              )
            })}
        </svg>

        {visibleNodes.map((n) => {
          const isSelected = n.id === selectedId
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onSelect?.(n)}
              className={cn(
                'absolute flex items-center gap-1.5 rounded-sm border bg-surface-raised px-2 py-1.5 text-left transition-colors',
                n.focus || isSelected ? 'border-volt' : 'border-line',
                n.state === 'pending' && 'border-dashed opacity-60',
                onSelect && 'hover:bg-surface-hover',
              )}
              style={{
                left: n.col * colWidth + 8,
                top: n.row * rowHeight + 8,
                width: nodeWidth,
              }}
            >
              {n.status && <StatusPip status={n.status} />}
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-mono-ui text-ink">{n.name}</span>
                <span className="text-mono-sm text-ink-subtle">{n.kind}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
