import * as React from 'react'

import { cn } from '#/lib/utils'
import { Avatar } from './avatar'

export interface UserMessageProps {
  children: React.ReactNode
  author?: string
  time?: string
  headline?: boolean
}

/** A user's question. `headline` renders it large — the opening question becomes the canvas headline too. */
export function UserMessage({ children, author = 'You', time, headline }: UserMessageProps) {
  if (headline) {
    return (
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-hero text-ink">{children}</h1>
        {time && <span className="text-mono-sm text-ink-subtle">{time}</span>}
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5">
      <Avatar name={author} size={22} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="text-ui-strong text-ink">{author}</span>
          {time && <span className="text-mono-sm text-ink-subtle">{time}</span>}
        </div>
        <p className="text-body text-ink">{children}</p>
      </div>
    </div>
  )
}

export interface AIMessageProps {
  children: React.ReactNode
  sources?: React.ReactNode
  streaming?: boolean
  time?: string
}

/** Klyro's prose — short: conclusion in bold, evidence with citations, then what it proposes. */
export function AIMessage({ children, sources, streaming, time }: AIMessageProps) {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar name="Klyro" kind="agent" size={22} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-ui-strong text-volt-ink">Klyro</span>
          {time && <span className="text-mono-sm text-ink-subtle">{time}</span>}
          {streaming && <span className="animate-pulse text-mono-sm text-ink-subtle">writing…</span>}
        </div>
        <div className={cn('max-w-[72ch] text-body-lg text-ink')}>{children}</div>
        {sources && <div className="flex flex-wrap gap-1.5">{sources}</div>}
      </div>
    </div>
  )
}
