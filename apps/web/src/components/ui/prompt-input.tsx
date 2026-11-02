import * as React from 'react'
import { ArrowUp, Square } from 'lucide-react'

import { cn } from '#/lib/utils'

export interface PromptInputProps {
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  onStop?: () => void
  running?: boolean
  disabled?: boolean
  placeholder?: string
  context?: { label: string; kind?: 'cluster' | 'namespace' | 'resource' }[]
  autoFocus?: boolean
}

export function PromptInput({
  value: valueProp,
  onChange,
  onSubmit,
  onStop,
  running,
  disabled,
  placeholder = 'Ask Klyro about your infrastructure…',
  context,
  autoFocus,
}: PromptInputProps) {
  const [valueState, setValueState] = React.useState('')
  const value = valueProp ?? valueState
  const setValue = onChange ?? setValueState

  const submit = () => {
    if (!value.trim() || running) return
    onSubmit?.(value)
    setValue('')
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line-strong bg-surface-raised p-3 focus-within:border-volt-line">
      {context && context.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {context.map((c) => (
            <span
              key={c.label}
              className="rounded-xs bg-surface-hover px-1.5 py-0.5 font-mono text-mono-sm text-ink-subtle"
            >
              {c.label}
            </span>
          ))}
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={2}
        className="resize-none bg-transparent text-body text-ink placeholder:text-ink-subtle focus:outline-none"
      />
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={running ? onStop : submit}
          disabled={!running && (disabled || !value.trim())}
          className={cn(
            'flex items-center justify-center rounded-sm',
            running ? 'bg-ink text-canvas' : 'bg-volt text-on-volt disabled:opacity-40',
          )}
          style={{ width: 'var(--control-sm)', height: 'var(--control-sm)' }}
        >
          {running ? <Square size={12} /> : <ArrowUp size={14} />}
        </button>
      </div>
    </div>
  )
}
