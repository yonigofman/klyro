import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import type * as TanStackRouter from '@tanstack/react-router'
import { vi } from 'vitest'

// jsdom has no ResizeObserver; cmdk (the command palette's list) needs one
// to measure item heights. A no-op stub is enough for tests, which never
// rely on real layout measurements.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub
}

// jsdom has no EventSource (the log viewer's live-tail transport, #7 — the
// first SSE use in the app). A controllable fake lets tests drive
// open/message/custom-event/error without a real HTTP connection; test
// files reach a given hook's instance via `MockEventSource.instances`.
type MockListener = (event: MessageEvent) => void

export class MockEventSource {
  static instances: MockEventSource[] = []
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2

  url: string
  readyState: number = MockEventSource.CONNECTING
  onopen: (() => void) | null = null
  onmessage: MockListener | null = null
  onerror: (() => void) | null = null
  private listeners: Record<string, MockListener[]> = {}

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, handler: MockListener) {
    ;(this.listeners[type] ??= []).push(handler)
  }

  removeEventListener(type: string, handler: MockListener) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((h) => h !== handler)
  }

  close() {
    this.readyState = MockEventSource.CLOSED
  }

  // --- test-only helpers, not part of the real EventSource API ---
  emitOpen() {
    this.readyState = MockEventSource.OPEN
    this.onopen?.()
  }
  emitMessage(data: string) {
    this.onmessage?.({ data } as MessageEvent)
  }
  emitEvent(type: string, data: string) {
    const handlers = this.listeners[type] ?? []
    handlers.forEach((handler) => handler({ data } as MessageEvent))
  }
  emitError(readyState: number = MockEventSource.CONNECTING) {
    this.readyState = readyState
    this.onerror?.()
  }
}

vi.stubGlobal('EventSource', MockEventSource)

// Both Link and useNavigate need a real RouterProvider for their
// href/navigate logic. Component tests render pages/panels in isolation
// (not through the actual router), and aren't testing router navigation
// mechanics — just that the right link target renders, or that the right
// navigation call was made (see Testing Decisions in #5 and #6). Swap both
// for plain stubs globally so no test file has to repeat this.
export const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof TanStackRouter>()
  return {
    ...actual,
    Link: ({
      children,
      to,
      params,
      ...rest
    }: {
      children: ReactNode
      to: string
      params?: Record<string, string>
    }) => {
      const href = Object.entries(params ?? {}).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to,
      )
      return (
        <a href={href} {...rest}>
          {children}
        </a>
      )
    },
    useNavigate: () => mockNavigate,
  }
})
