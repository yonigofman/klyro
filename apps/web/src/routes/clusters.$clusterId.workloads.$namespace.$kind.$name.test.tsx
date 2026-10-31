import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@klyro/api-client'

const { getWorkload, getWorkloadManifest, listEvents } = vi.hoisted(() => ({
  getWorkload: vi.fn(),
  getWorkloadManifest: vi.fn(),
  listEvents: vi.fn(),
}))

vi.mock('#/lib/api-client', () => ({
  apiClient: { getWorkload, getWorkloadManifest, listEvents },
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
  getWorkloadManifest.mockReset()
  listEvents.mockReset().mockResolvedValue([])
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

  it('shows events scoped to this workload by kind and name', async () => {
    getWorkload.mockResolvedValue({
      kind: 'Deployment',
      name: 'web',
      namespace: 'default',
      desired: 1,
      ready: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updateStrategy: 'RollingUpdate',
      podNames: [],
    })
    listEvents.mockResolvedValue([
      {
        type: 'Normal',
        reason: 'ScalingReplicaSet',
        message: 'scaled up',
        involvedObjectKind: 'Deployment',
        involvedObjectName: 'web',
        namespace: 'default',
        count: 1,
        lastSeen: '2026-01-01T00:00:00Z',
      },
      {
        type: 'Normal',
        reason: 'Created',
        message: 'a StatefulSet with the same name',
        involvedObjectKind: 'StatefulSet',
        involvedObjectName: 'web',
        namespace: 'default',
        count: 1,
        lastSeen: '2026-01-01T00:00:00Z',
      },
    ])

    renderPage()

    expect(await screen.findByText('ScalingReplicaSet')).toBeInTheDocument()
    expect(screen.queryByText('Created')).not.toBeInTheDocument()
  })

  it('fetches and shows the Manifest only once expanded', async () => {
    getWorkload.mockResolvedValue({
      kind: 'Deployment',
      name: 'web',
      namespace: 'default',
      desired: 1,
      ready: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updateStrategy: 'RollingUpdate',
      podNames: [],
    })
    getWorkloadManifest.mockResolvedValue('apiVersion: apps/v1\nkind: Deployment\n')

    renderPage()
    await screen.findByText('Manifest')
    expect(getWorkloadManifest).not.toHaveBeenCalled()

    await userEvent.click(screen.getByText('Manifest'))

    expect(await screen.findByText(/kind: Deployment/)).toBeInTheDocument()
    expect(getWorkloadManifest).toHaveBeenCalledWith('c1', 'default', 'Deployment', 'web')
  })
})
