import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@klyro/api-client'

const { getPod, listEvents } = vi.hoisted(() => ({
  getPod: vi.fn(),
  listEvents: vi.fn(),
}))

vi.mock('#/lib/api-client', () => ({
  apiClient: { getPod, listEvents },
}))

const { PodDetailPage } = await import('./clusters.$clusterId.pods.$namespace.$name')

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <PodDetailPage clusterId="c1" namespace="default" name="web-1" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  getPod.mockReset()
  listEvents.mockReset().mockResolvedValue([])
})

describe('Pod detail page', () => {
  it('shows containers, conditions, and events scoped to this pod', async () => {
    getPod.mockResolvedValue({
      name: 'web-1',
      namespace: 'default',
      phase: 'Running',
      ready: '1/1',
      restarts: 0,
      node: 'node-a',
      createdAt: '2026-01-01T00:00:00Z',
      containers: [
        {
          name: 'web',
          image: 'nginx:1.25',
          ready: true,
          restartCount: 1,
          cpuRequest: '100m',
          cpuLimit: '200m',
          memoryRequest: '64Mi',
          memoryLimit: '128Mi',
        },
      ],
      conditions: [{ type: 'Ready', status: 'True' }],
    })
    listEvents.mockResolvedValue([
      {
        type: 'Warning',
        reason: 'BackOff',
        message: 'crashed',
        involvedObjectKind: 'Pod',
        involvedObjectName: 'web-1',
        namespace: 'default',
        count: 2,
        lastSeen: '2026-01-01T00:00:00Z',
      },
      {
        type: 'Normal',
        reason: 'Scheduled',
        message: 'scheduled',
        involvedObjectKind: 'Pod',
        involvedObjectName: 'other-pod',
        namespace: 'default',
        count: 1,
        lastSeen: '2026-01-01T00:00:00Z',
      },
    ])

    renderPage()

    const row = (await screen.findByText('nginx:1.25')).closest('tr')!
    expect(within(row).getByText('100m / 200m')).toBeInTheDocument()

    expect(screen.getByText('Ready: True')).toBeInTheDocument()

    expect(await screen.findByText('BackOff')).toBeInTheDocument()
    expect(screen.queryByText('Scheduled')).not.toBeInTheDocument()
  })

  it('shows a specific not-found message for a deleted pod', async () => {
    getPod.mockRejectedValue(new ApiError(404, 'resource not found'))
    renderPage()

    expect(await screen.findByText(/no longer exists/i)).toBeInTheDocument()
  })

  it('shows a generic error for a non-404 failure', async () => {
    getPod.mockRejectedValue(new Error('network down'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('network down')
  })
})
