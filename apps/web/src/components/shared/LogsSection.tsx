import { useEffect, useRef, useState } from 'react'
import { useLogs } from '#/features/clusters/use-logs'
import { cn } from '#/lib/utils'

/**
 * A Pod's live-tailing log pane (see issue #7's Shape Brief). Live tail is
 * the resting state — it connects and starts streaming on mount, newest
 * line pinned to the bottom, until the operator pauses. No flip-reveal
 * motion here: this represents continuous output, not a discrete state
 * change, and that motion is reserved for the latter (see DESIGN.md).
 *
 * Deliberately no aria-live region on the scrolling log lines — announcing
 * every streamed line would make this unusable noise for screen readers,
 * not an accessibility aid.
 */
export function LogsSection({
  clusterId,
  namespace,
  name,
  containers,
}: {
  clusterId: string
  namespace: string
  name: string
  containers: string[]
}) {
  const [selectedContainer, setSelectedContainer] = useState(containers[0] ?? '')
  const [frozenLines, setFrozenLines] = useState<string[] | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeContainer = containers.length > 1 ? selectedContainer : undefined

  const { lines, state, errorMessage } = useLogs({
    clusterId,
    namespace,
    name,
    container: activeContainer,
  })

  const isPaused = frozenLines !== null

  // Switching containers starts a fresh stream — a frozen snapshot of the
  // old one's output no longer means anything, so don't carry pause across
  // that boundary.
  useEffect(() => {
    setFrozenLines(null)
  }, [activeContainer])

  // Pause freezes what's on screen (and auto-scroll) without stopping the
  // underlying stream — useLogs keeps receiving and buffering lines the
  // whole time, so Resume reveals everything that arrived while paused.
  const displayedLines = frozenLines ?? lines

  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [displayedLines, isPaused])

  function togglePause() {
    setFrozenLines((current) => (current === null ? lines : null))
  }

  const statusLabel =
    state === 'connecting' ? 'Connecting…' : state === 'error' ? 'Disconnected' : isPaused ? 'Paused' : 'Live'

  return (
    <div className="flex flex-col gap-2">
      {containers.length > 1 && (
        <div role="tablist" aria-label="Container" className="flex gap-1">
          {containers.map((container) => (
            <button
              key={container}
              role="tab"
              type="button"
              aria-selected={container === selectedContainer}
              onClick={() => setSelectedContainer(container)}
              className={cn(
                'rounded-md px-2 py-1 font-mono text-xs',
                container === selectedContainer
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {container}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          {statusLabel}
        </span>
        <button
          type="button"
          onClick={togglePause}
          className="font-mono text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <div
        ref={scrollRef}
        className="h-96 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs text-muted-foreground"
      >
        {displayedLines.length === 0 ? (
          <p role="status">{state === 'connecting' ? 'Connecting…' : 'No output yet.'}</p>
        ) : (
          displayedLines.map((line, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
