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
