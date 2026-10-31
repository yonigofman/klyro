import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import type * as TanStackRouter from '@tanstack/react-router'
import { vi } from 'vitest'

// Link needs a real RouterProvider for its href/navigate logic. Component
// tests render pages/panels in isolation (not through the actual router),
// and aren't testing router navigation mechanics — just that the right
// link target and label render (see Testing Decisions in #5). Swap it for
// a plain anchor globally so no test file has to repeat this.
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
  }
})
