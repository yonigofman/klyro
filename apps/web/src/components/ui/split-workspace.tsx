import * as React from 'react'
import { MessageSquare, PanelsTopLeft, SquareStack } from 'lucide-react'

import { cn } from '#/lib/utils'

export type WorkspaceMode = 'split' | 'conversation' | 'canvas'

export interface SplitWorkspaceProps {
  left: React.ReactNode
  right: React.ReactNode
  mode?: WorkspaceMode
  onModeChange?: (mode: WorkspaceMode) => void
  defaultLeft?: number
  min?: number
  max?: number
}

const MODES: { id: WorkspaceMode; icon: React.ReactNode; label: string }[] = [
  { id: 'conversation', icon: <MessageSquare size={13} />, label: 'Conversation only' },
  { id: 'split', icon: <PanelsTopLeft size={13} />, label: 'Split' },
  { id: 'canvas', icon: <SquareStack size={13} />, label: 'Canvas only' },
]

/** Investigation trace on the left, generated canvas on the right. `F` toggles full-screen canvas. */
export function SplitWorkspace({ left, right, mode: modeProp, onModeChange, defaultLeft = 380, min = 320, max = 560 }: SplitWorkspaceProps) {
  const [modeState, setModeState] = React.useState<WorkspaceMode>('split')
  const mode = modeProp ?? modeState
  const setMode = onModeChange ?? setModeState

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end gap-0.5 border-b border-line px-3 py-1.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-label={m.label}
            onClick={() => setMode(m.id)}
            className={cn(
              'flex items-center justify-center rounded-xs p-1 text-ink-subtle hover:bg-surface-hover hover:text-ink',
              mode === m.id && 'bg-surface-active text-ink',
            )}
          >
            {m.icon}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1">
        {mode !== 'canvas' && (
          <div
            className="min-h-0 flex-shrink-0 overflow-y-auto border-r border-line p-4"
            style={{ width: mode === 'conversation' ? '100%' : defaultLeft, minWidth: min, maxWidth: max }}
          >
            {left}
          </div>
        )}
        {mode !== 'conversation' && (
          <div className="min-h-0 flex-1 overflow-y-auto bg-canvas/30 p-4">{right}</div>
        )}
      </div>
    </div>
  )
}
