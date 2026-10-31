import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@klyro/api-client'

const { getService, getServiceManifest, listEvents } = vi.hoisted(() => ({
  getService: vi.fn(),
  getServiceManifest: vi.fn(),
  listEvents: vi.fn(),
}))

vi.mock('#/lib/api-client', () => ({
  apiClient: { getService, getServiceManifest, listEvents },
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
  getServiceManifest.mockReset()
  listEvents.mockReset().mockResolvedValue([])
})

describe('Service detail page', () => {
  it('shows selector and endpoints linking to their Pods when backed by pods', async () => {
    getService.mockResolvedValue({
      name: 'web',
      namespace: 'default',
      type: 'ClusterIP',
      clusterIP: '10.0.0.1',
      ports: ['80/TCP'],
      createdAt: '2026-01-01T00:00:00Z',
      selector: { app: 'web' },
      endpoints: [
        { podName: 'web-1', ip: '10.1.2.3' },
        { podName: 'web-2', ip: '10.1.2.4' },
      ],
    })

    renderPage()

    expect(await screen.findByText('app=web')).toBeInTheDocument()
    expect(screen.getByText('10.1.2.3')).toBeInTheDocument()
    expect(screen.getByText('10.1.2.4')).toBeInTheDocument()
    const podLink = screen.getByRole('link', { name: 'web-1' })
    expect(podLink).toHaveAttribute('href', '/clusters/c1/pods/default/web-1')
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

  it('fetches and shows the Manifest only once expanded', async () => {
    getService.mockResolvedValue({
      name: 'web',
      namespace: 'default',
      type: 'ClusterIP',
      clusterIP: '10.0.0.1',
      ports: ['80/TCP'],
      createdAt: '2026-01-01T00:00:00Z',
      selector: { app: 'web' },
      endpoints: [],
    })
    getServiceManifest.mockResolvedValue('apiVersion: v1\nkind: Service\n')

    renderPage()
    await screen.findByText('Manifest')
    expect(getServiceManifest).not.toHaveBeenCalled()

    await userEvent.click(screen.getByText('Manifest'))

    expect(await screen.findByText(/kind: Service/)).toBeInTheDocument()
    expect(getServiceManifest).toHaveBeenCalledWith('c1', 'default', 'web')
  })
})
