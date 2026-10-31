import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@klyro/api-client'

const { getWorkload } = vi.hoisted(() => ({
  getWorkload: vi.fn(),
}))

vi.mock('#/lib/api-client', () => ({
  apiClient: { getWorkload },
}))

const { WorkloadDetailPage } = await import(
  './clusters.$clusterId.workloads.$namespace.$kind.$name'
)

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkloadDetailPage clusterId="c1" namespace="default" kind="Deployment" name="web" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  getWorkload.mockReset()
})

describe('Workload detail page', () => {
  it('shows rollout status, update strategy, and links to owned pods', async () => {
    getWorkload.mockResolvedValue({
      kind: 'Deployment',
      name: 'web',
      namespace: 'default',
      desired: 3,
      ready: 2,
      createdAt: '2026-01-01T00:00:00Z',
      updateStrategy: 'RollingUpdate',
      podNames: ['web-abc', 'web-def'],
    })

    renderPage()

    expect(await screen.findByText('RollingUpdate')).toBeInTheDocument()
    const podLink = screen.getByRole('link', { name: 'web-abc' })
    expect(podLink).toHaveAttribute('href', '/clusters/c1/pods/default/web-abc')
  })

  it('shows a message when the workload owns no pods', async () => {
    getWorkload.mockResolvedValue({
      kind: 'Deployment',
      name: 'web',
      namespace: 'default',
      desired: 0,
      ready: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updateStrategy: 'RollingUpdate',
      podNames: [],
    })

    renderPage()

    expect(await screen.findByText(/no pods owned/i)).toBeInTheDocument()
  })

  it('shows a specific not-found message for a deleted workload', async () => {
    getWorkload.mockRejectedValue(new ApiError(404, 'resource not found'))
    renderPage()

    expect(await screen.findByText(/no longer exists/i)).toBeInTheDocument()
  })
})
