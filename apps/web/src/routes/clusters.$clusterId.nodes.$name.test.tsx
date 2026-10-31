import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@klyro/api-client'

const { getNode } = vi.hoisted(() => ({
  getNode: vi.fn(),
}))

vi.mock('#/lib/api-client', () => ({
  apiClient: { getNode },
}))

const { NodeDetailPage } = await import('./clusters.$clusterId.nodes.$name')

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <NodeDetailPage clusterId="c1" name="node-a" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  getNode.mockReset()
})

describe('Node detail page', () => {
  it('shows capacity/allocatable, conditions, and taints', async () => {
    getNode.mockResolvedValue({
      name: 'node-a',
      ready: true,
      kubernetesVersion: 'v1.30.1',
      createdAt: '2026-01-01T00:00:00Z',
      capacity: { cpu: '4', memory: '16Gi' },
      allocatable: { cpu: '3800m', memory: '15Gi' },
      conditions: [{ type: 'Ready', status: 'True' }],
      taints: [{ key: 'dedicated', value: 'gpu', effect: 'NoSchedule' }],
    })

    renderPage()

    expect(await screen.findByText('4 / 3800m')).toBeInTheDocument()
    expect(screen.getByText('Ready: True')).toBeInTheDocument()
    expect(screen.getByText('dedicated=gpu:NoSchedule')).toBeInTheDocument()
  })

  it('shows a message when there are no taints', async () => {
    getNode.mockResolvedValue({
      name: 'node-a',
      ready: true,
      kubernetesVersion: 'v1.30.1',
      createdAt: '2026-01-01T00:00:00Z',
      capacity: {},
      allocatable: {},
      conditions: [],
      taints: [],
    })

    renderPage()

    expect(await screen.findByText(/no taints/i)).toBeInTheDocument()
  })

  it('shows a specific not-found message for a deleted node', async () => {
    getNode.mockRejectedValue(new ApiError(404, 'resource not found'))
    renderPage()

    expect(await screen.findByText(/no longer exists/i)).toBeInTheDocument()
  })
})
