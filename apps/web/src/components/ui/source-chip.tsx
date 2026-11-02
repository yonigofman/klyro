import * as React from 'react'
import { FileText, GitCommit, LineChart, ListTree, ScrollText, Workflow } from 'lucide-react'

export interface SourceChipProps {
  n?: number
  kind?: 'metric' | 'log' | 'event' | 'manifest' | 'resource' | 'change' | 'doc' | 'trace'
  system?: string
  label: React.ReactNode
  onClick?: () => void
}

const ICONS: Record<NonNullable<SourceChipProps['kind']>, React.ReactNode> = {
  metric: <LineChart size={11} />,
  log: <ScrollText size={11} />,
  event: <Workflow size={11} />,
  manifest: <FileText size={11} />,
  resource: <ListTree size={11} />,
  change: <GitCommit size={11} />,
  doc: <FileText size={11} />,
  trace: <ListTree size={11} />,
}

/** A citation chip linking a finding back to the evidence that supports it. */
export function SourceChip({ n, kind = 'resource', system, label, onClick }: SourceChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-xs border border-line bg-surface-raised px-1.5 py-0.5 text-mono-sm text-ink-subtle hover:bg-surface-hover hover:text-ink"
    >
      {typeof n === 'number' && <span className="text-ink-muted">{n}</span>}
      {ICONS[kind]}
      {system && <span className="text-ink-muted">{system}</span>}
      <span>{label}</span>
    </button>
  )
}
