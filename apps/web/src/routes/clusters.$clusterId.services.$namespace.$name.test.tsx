import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@klyro/api-client'

const { getService } = vi.hoisted(() => ({
  getService: vi.fn(),
}))

vi.mock('#/lib/api-client', () => ({
  apiClient: { getService },
}))

const { ServiceDetailPage } = await import('./clusters.$clusterId.services.$namespace.$name')

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ServiceDetailPage clusterId="c1" namespace="default" name="web" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  getService.mockReset()
})

describe('Service detail page', () => {
  it('shows selector and endpoints when backed by pods', async () => {
    getService.mockResolvedValue({
      name: 'web',
      namespace: 'default',
      type: 'ClusterIP',
      clusterIP: '10.0.0.1',
      ports: ['80/TCP'],
      createdAt: '2026-01-01T00:00:00Z',
      selector: { app: 'web' },
      endpoints: ['10.1.2.3', '10.1.2.4'],
    })

    renderPage()

    expect(await screen.findByText('app=web')).toBeInTheDocument()
    expect(screen.getByText('10.1.2.3')).toBeInTheDocument()
    expect(screen.getByText('10.1.2.4')).toBeInTheDocument()
  })

  it('shows a null selector as not backed by pods, not a crash', async () => {
    getService.mockResolvedValue({
      name: 'external',
      namespace: 'default',
      type: 'ExternalName',
      clusterIP: '',
      ports: [],
      createdAt: '2026-01-01T00:00:00Z',
      selector: null,
      endpoints: [],
    })

    renderPage()

    expect(await screen.findByText(/not backed by pods/i)).toBeInTheDocument()
  })

  it('shows a specific not-found message for a deleted service', async () => {
    getService.mockRejectedValue(new ApiError(404, 'resource not found'))
    renderPage()

    expect(await screen.findByText(/no longer exists/i)).toBeInTheDocument()
  })
})
