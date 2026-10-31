import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@klyro/api-client'

const { getIngress } = vi.hoisted(() => ({
  getIngress: vi.fn(),
}))

vi.mock('#/lib/api-client', () => ({
  apiClient: { getIngress },
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
})

describe('Ingress detail page', () => {
  it('shows backend rules and TLS hosts', async () => {
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
    expect(within(row).getByText('web-svc:80')).toBeInTheDocument()
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
})
