import { useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '#/lib/utils'

/**
 * The departure board's signature move (see the confirmed
 * cluster-overview-dashboard direction contract, `.impeccable/surfaces/`):
 * a value visibly flips into place, like a flap settling on a split-flap
 * board, instead of silently appearing or changing — "every connected
 * cluster is a row that visibly flips when its state changes." Purely a
 * decorative CSS animation layered over content that's always
 * synchronously present: `children` never gets hidden, delayed, or
 * swapped, so screen readers and tests see the real content immediately.
 * Remounting the inner span (via `key`) is what restarts the CSS
 * animation, on first mount and again whenever `watch` changes.
 */
export function FlipValue({
  watch,
  children,
  className,
  enterDelayMs = 0,
}: {
  /** The primitive signal to flip on — compared by value, not `children`. */
  watch: string | number | boolean
  children: ReactNode
  className?: string
  /** Staggers only the entrance flip (e.g. row index * 40ms) — never
   * applied to a later re-flip triggered by `watch` changing. */
  enterDelayMs?: number
}) {
  // React's documented "adjust state during render" pattern: comparing and
  // updating here (not in a useEffect) means the remount happens in the
  // same render as the content change, so there's no in-between frame
  // where the new content is visible but the flip hasn't started yet.
  const [prevWatch, setPrevWatch] = useState(watch)
  const [flipKey, setFlipKey] = useState(0)
  if (prevWatch !== watch) {
    setPrevWatch(watch)
    setFlipKey((k) => k + 1)
  }

  const isEntrance = flipKey === 0

  return (
    <span
      key={flipKey}
      className={cn('inline-block animate-flip-reveal', className)}
      style={isEntrance && enterDelayMs ? { animationDelay: `${enterDelayMs}ms` } : undefined}
    >
      {children}
    </span>
  )
}
