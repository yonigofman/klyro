import * as React from 'react'
import { ChevronRight } from 'lucide-react'

import { cn } from '#/lib/utils'
import type { Status } from './status-pip'
import { StatusPip } from './status-pip'

export interface ToolCallProps {
  tool: string
  system?: string
  input?: string
  status?: 'queued' | 'running' | 'success' | 'error'
  duration?: string
  summary?: React.ReactNode
  output?: React.ReactNode
  defaultOpen?: boolean
}

const STATUS_MAP: Record<NonNullable<ToolCallProps['status']>, Status> = {
  queued: 'neutral',
  running: 'progress',
  success: 'healthy',
  error: 'danger',
}

/** The real query against a real system (kube, Mimir, Loki, Tempo, ArgoCD) — not a chat bubble. */
export function ToolCall({ tool, system, input, status = 'queued', duration, summary, output, defaultOpen }: ToolCallProps) {
  const [open, setOpen] = React.useState(defaultOpen ?? false)
  const hasOutput = Boolean(output)

  return (
    <div className="rounded-sm border border-line bg-surface-raised">
      <button
        type="button"
        onClick={() => hasOutput && setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
      >
        {hasOutput && <ChevronRight size={12} className={cn('text-ink-subtle transition-transform', open && 'rotate-90')} />}
        <StatusPip status={STATUS_MAP[status]} />
        <span className="font-mono text-mono-ui text-ink">{tool}</span>
        {system && <span className="text-mono-sm text-ink-subtle">{system}</span>}
        {input && <span className="truncate text-mono-sm text-ink-subtle">{input}</span>}
        <span className="flex-1" />
        {duration && <span className="text-mono-sm text-ink-subtle">{duration}</span>}
      </button>
      {summary && !open && <div className="px-2.5 pb-1.5 text-ui text-ink-muted">{summary}</div>}
      {open && hasOutput && (
        <div className="border-t border-line px-2.5 py-2 font-mono text-code text-ink-muted">{output}</div>
      )}
    </div>
  )
}
