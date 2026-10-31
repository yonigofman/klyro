import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@klyro/api-client'

const { getIngress, getIngressManifest, listEvents } = vi.hoisted(() => ({
  getIngress: vi.fn(),
  getIngressManifest: vi.fn(),
  listEvents: vi.fn(),
}))

vi.mock('#/lib/api-client', () => ({
  apiClient: { getIngress, getIngressManifest, listEvents },
}))

const { IngressDetailPage } = await import('./clusters.$clusterId.ingresses.$namespace.$name')

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <IngressDetailPage clusterId="c1" namespace="default" name="web" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  getIngress.mockReset()
  getIngressManifest.mockReset()
  listEvents.mockReset().mockResolvedValue([])
})

describe('Ingress detail page', () => {
  it('shows backend rules linking to their Service, and TLS hosts', async () => {
    getIngress.mockResolvedValue({
      name: 'web',
      namespace: 'default',
      hosts: ['web.example.com'],
      createdAt: '2026-01-01T00:00:00Z',
      rules: [{ host: 'web.example.com', path: '/', serviceName: 'web-svc', servicePort: '80' }],
      tlsHosts: ['web.example.com'],
    })

    renderPage()

    const row = (await screen.findByText('web.example.com', { selector: 'td' })).closest('tr')!
    const serviceLink = within(row).getByRole('link', { name: 'web-svc:80' })
    expect(serviceLink).toHaveAttribute('href', '/clusters/c1/services/default/web-svc')
  })

  it('shows a message when no TLS is configured', async () => {
    getIngress.mockResolvedValue({
      name: 'web',
      namespace: 'default',
      hosts: ['web.example.com'],
      createdAt: '2026-01-01T00:00:00Z',
      rules: [],
      tlsHosts: [],
    })

    renderPage()

    expect(await screen.findByText(/no tls configured/i)).toBeInTheDocument()
    expect(await screen.findByText(/no backend rules configured/i)).toBeInTheDocument()
  })

  it('shows a specific not-found message for a deleted ingress', async () => {
    getIngress.mockRejectedValue(new ApiError(404, 'resource not found'))
    renderPage()

    expect(await screen.findByText(/no longer exists/i)).toBeInTheDocument()
  })

  it('fetches and shows the Manifest only once expanded', async () => {
    getIngress.mockResolvedValue({
      name: 'web',
      namespace: 'default',
      hosts: ['web.example.com'],
      createdAt: '2026-01-01T00:00:00Z',
      rules: [],
      tlsHosts: [],
    })
    getIngressManifest.mockResolvedValue('apiVersion: networking.k8s.io/v1\nkind: Ingress\n')

    renderPage()
    await screen.findByText('Manifest')
    expect(getIngressManifest).not.toHaveBeenCalled()

    await userEvent.click(screen.getByText('Manifest'))

    expect(await screen.findByText(/kind: Ingress/)).toBeInTheDocument()
    expect(getIngressManifest).toHaveBeenCalledWith('c1', 'default', 'web')
  })
})
