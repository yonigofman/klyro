import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@klyro/api-client'

const { getPod, getPodManifest, listEvents, podLogsUrl } = vi.hoisted(() => ({
  getPod: vi.fn(),
  getPodManifest: vi.fn(),
  listEvents: vi.fn(),
  podLogsUrl: vi.fn(),
}))

vi.mock('#/lib/api-client', () => ({
  apiClient: { getPod, getPodManifest, listEvents, podLogsUrl },
}))

const { PodDetailPage } = await import('./clusters.$clusterId.pods.$namespace.$name')
const { MockEventSource } = await import('../../vitest.setup')

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
  getPodManifest.mockReset()
  listEvents.mockReset().mockResolvedValue([])
  podLogsUrl.mockReset().mockReturnValue('http://test/logs')
  MockEventSource.instances = []
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
      {
        type: 'Normal',
        reason: 'ServiceCreated',
        message: 'a Service with the same name as this Pod',
        involvedObjectKind: 'Service',
        involvedObjectName: 'web-1',
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
    // Same name, different kind — must not leak into this Pod's Events.
    expect(screen.queryByText('ServiceCreated')).not.toBeInTheDocument()
  })

  it('fetches and shows the Manifest only once expanded', async () => {
    getPod.mockResolvedValue({
      name: 'web-1',
      namespace: 'default',
      phase: 'Running',
      ready: '1/1',
      restarts: 0,
      node: 'node-a',
      createdAt: '2026-01-01T00:00:00Z',
      containers: [],
      conditions: [],
    })
    getPodManifest.mockResolvedValue('apiVersion: v1\nkind: Pod\nmetadata:\n  name: web-1\n')

    renderPage()
    await screen.findByText('Manifest')
    expect(getPodManifest).not.toHaveBeenCalled()

    await userEvent.click(screen.getByText('Manifest'))

    expect(await screen.findByText(/kind: Pod/)).toBeInTheDocument()
    expect(getPodManifest).toHaveBeenCalledWith('c1', 'default', 'web-1')
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

  it('streams logs live by default, with no container selector for a single-container pod', async () => {
    getPod.mockResolvedValue({
      name: 'web-1',
      namespace: 'default',
      phase: 'Running',
      ready: '1/1',
      restarts: 0,
      node: 'node-a',
      createdAt: '2026-01-01T00:00:00Z',
      containers: [{ name: 'web', image: 'nginx:1.25', ready: true, restartCount: 0 }],
      conditions: [],
    })

    renderPage()
    await screen.findByText('Logs')
    expect(podLogsUrl).toHaveBeenCalledWith('c1', 'default', 'web-1', { container: undefined })
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()

    const source = MockEventSource.instances[0]
    act(() => {
      source.emitOpen()
      source.emitMessage('starting up')
      source.emitMessage('ready to serve')
    })

    expect(await screen.findByText('starting up')).toBeInTheDocument()
    expect(screen.getByText('ready to serve')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('pauses the stream, then resumes, without losing lines received while paused', async () => {
    getPod.mockResolvedValue({
      name: 'web-1',
      namespace: 'default',
      phase: 'Running',
      ready: '1/1',
      restarts: 0,
      node: 'node-a',
      createdAt: '2026-01-01T00:00:00Z',
      containers: [{ name: 'web', image: 'nginx:1.25', ready: true, restartCount: 0 }],
      conditions: [],
    })

    renderPage()
    await screen.findByText('Logs')
    const source = MockEventSource.instances[0]
    act(() => {
      source.emitOpen()
      source.emitMessage('line one')
    })

    await userEvent.click(screen.getByText('Pause'))
    expect(screen.getByText('Paused')).toBeInTheDocument()

    act(() => {
      source.emitMessage('line two')
    })
    // Paused freezes the view — the stream keeps receiving, but line two
    // shouldn't appear on screen until Resume.
    expect(screen.queryByText('line two')).not.toBeInTheDocument()

    await userEvent.click(screen.getByText('Resume'))
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(await screen.findByText('line two')).toBeInTheDocument()
  })

  it('shows a container selector for a multi-container pod and reconnects on switch', async () => {
    getPod.mockResolvedValue({
      name: 'web-1',
      namespace: 'default',
      phase: 'Running',
      ready: '2/2',
      restarts: 0,
      node: 'node-a',
      createdAt: '2026-01-01T00:00:00Z',
      containers: [
        { name: 'web', image: 'nginx:1.25', ready: true, restartCount: 0 },
        { name: 'sidecar', image: 'envoy:1.28', ready: true, restartCount: 0 },
      ],
      conditions: [],
    })

    renderPage()
    await screen.findByText('Logs')
    expect(podLogsUrl).toHaveBeenCalledWith('c1', 'default', 'web-1', { container: 'web' })

    await userEvent.click(screen.getByRole('tab', { name: 'sidecar' }))

    expect(podLogsUrl).toHaveBeenCalledWith('c1', 'default', 'web-1', { container: 'sidecar' })
  })

  it('shows a disconnected message when the stream fails permanently', async () => {
    getPod.mockResolvedValue({
      name: 'web-1',
      namespace: 'default',
      phase: 'Running',
      ready: '1/1',
      restarts: 0,
      node: 'node-a',
      createdAt: '2026-01-01T00:00:00Z',
      containers: [{ name: 'web', image: 'nginx:1.25', ready: true, restartCount: 0 }],
      conditions: [],
    })

    renderPage()
    await screen.findByText('Logs')
    const source = MockEventSource.instances[0]
    act(() => {
      source.emitError(MockEventSource.CLOSED)
    })

    expect(await screen.findByText('Disconnected')).toBeInTheDocument()
  })

  it('shows a disconnected message on a mid-stream upstream failure, not just a permanent connection failure', async () => {
    getPod.mockResolvedValue({
      name: 'web-1',
      namespace: 'default',
      phase: 'Running',
      ready: '1/1',
      restarts: 0,
      node: 'node-a',
      createdAt: '2026-01-01T00:00:00Z',
      containers: [{ name: 'web', image: 'nginx:1.25', ready: true, restartCount: 0 }],
      conditions: [],
    })

    renderPage()
    await screen.findByText('Logs')
    const source = MockEventSource.instances[0]
    act(() => {
      source.emitOpen()
      // A real EventSource never reaches readyState CLOSED after a normal
      // 200 SSE response ends — it just keeps auto-reconnecting. The
      // backend's own "log-error" event is the only signal a mid-stream
      // upstream failure (container crash, connection drop) actually has.
      source.emitEvent('log-error', 'container crashed')
    })

    expect(await screen.findByText('Disconnected')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('container crashed')
  })
})
