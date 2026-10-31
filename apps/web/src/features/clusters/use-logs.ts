import { useEffect, useState } from 'react'
import { apiClient } from '#/lib/api-client'

export type LogStreamState = 'connecting' | 'streaming' | 'error'

/**
 * Live-tails one container's logs over SSE. Not a TanStack Query hook —
 * there's no request/response or cache semantics here, just an open
 * connection appending lines as they arrive. The error contract
 * (ErrInvalidContainer/ErrResourceNotFound etc. map to a non-2xx JSON
 * response before any SSE headers are sent) means a browser EventSource
 * treats those as permanently fatal per spec and stops retrying — a
 * transient drop mid-stream instead leaves the browser retrying on its
 * own, which we surface as 'connecting' again rather than 'error'.
 */
export function useLogs({
  clusterId,
  namespace,
  name,
  container,
  maxLines = 2000,
}: {
  clusterId: string
  namespace: string
  name: string
  container?: string
  maxLines?: number
}): { lines: string[]; state: LogStreamState; errorMessage: string | null } {
  const [lines, setLines] = useState<string[]>([])
  const [state, setState] = useState<LogStreamState>('connecting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setLines([])
    setState('connecting')
    setErrorMessage(null)

    const source = new EventSource(apiClient.podLogsUrl(clusterId, namespace, name, { container }))

    source.onopen = () => setState('streaming')

    source.onmessage = (event) => {
      setState('streaming')
      setLines((prev) => {
        const withNewLine = [...prev, event.data as string]
        return withNewLine.length > maxLines
          ? withNewLine.slice(withNewLine.length - maxLines)
          : withNewLine
      })
    }

    source.addEventListener('log-error', (event) => {
      // A real EventSource never reaches readyState CLOSED after a normal
      // 200 SSE response ends — it just keeps auto-reconnecting, so a
      // mid-stream upstream failure (the one case the backend's log-error
      // event exists for) would otherwise never surface as 'error' at
      // all. This is the one definitive signal we have for that case;
      // treat it as such directly rather than inferring from readyState.
      setErrorMessage((event).data as string)
      setState('error')
    })

    source.onerror = () => {
      setState(source.readyState === EventSource.CLOSED ? 'error' : 'connecting')
    }

    return () => source.close()
  }, [clusterId, namespace, name, container, maxLines])

  return { lines, state, errorMessage }
}
