import { useEffect, useRef, useState } from 'react'
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
  /** Staggers the entrance flip (e.g. row index * 40ms) — ignored on
   * later re-flips triggered by `watch` changing. */
  enterDelayMs?: number
}) {
  const [flipKey, setFlipKey] = useState(0)
  const prevWatch = useRef(watch)

  useEffect(() => {
    if (prevWatch.current !== watch) {
      prevWatch.current = watch
      setFlipKey((k) => k + 1)
    }
  }, [watch])

  return (
    <span
      key={flipKey}
      className={cn('inline-block animate-flip-reveal', className)}
      style={enterDelayMs ? { animationDelay: `${enterDelayMs}ms` } : undefined}
    >
      {children}
    </span>
  )
}
