import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const { listEvents } = vi.hoisted(() => ({ listEvents: vi.fn() }))

vi.mock('#/lib/api-client', () => ({
  apiClient: { listEvents },
}))

const { ResourceEventsSection } = await import('./ResourceEventsSection')

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ResourceEventsSection clusterId="c1" namespace="default" kind="Service" name="web" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  listEvents.mockReset()
})

describe('ResourceEventsSection', () => {
  it('filters by kind and name, ignoring a same-named different-kind event', async () => {
    listEvents.mockResolvedValue([
      {
        type: 'Normal',
        reason: 'EndpointsUpdated',
        message: 'updated',
        involvedObjectKind: 'Service',
        involvedObjectName: 'web',
        namespace: 'default',
        count: 1,
        lastSeen: '2026-01-01T00:00:00Z',
      },
      {
        type: 'Normal',
        reason: 'Created',
        message: 'a Pod with the same name',
        involvedObjectKind: 'Pod',
        involvedObjectName: 'web',
        namespace: 'default',
        count: 1,
        lastSeen: '2026-01-01T00:00:00Z',
      },
    ])

    renderSection()

    expect(await screen.findByText('EndpointsUpdated')).toBeInTheDocument()
    expect(screen.queryByText('Created')).not.toBeInTheDocument()
  })

  it('shows an empty message when there are no matching events', async () => {
    listEvents.mockResolvedValue([])
    renderSection()

    expect(await screen.findByText(/no events for this service/i)).toBeInTheDocument()
  })
})
