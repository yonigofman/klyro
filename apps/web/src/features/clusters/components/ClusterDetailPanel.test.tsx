import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Cluster } from '@klyro/api-client'

const {
  listNamespaces,
  listPods,
  listWorkloads,
  listServices,
  listIngresses,
  listNodes,
  listEvents,
  deleteCluster,
} = vi.hoisted(() => ({
  listNamespaces: vi.fn(),
  listPods: vi.fn(),
  listWorkloads: vi.fn(),
  listServices: vi.fn(),
  listIngresses: vi.fn(),
  listNodes: vi.fn(),
  listEvents: vi.fn(),
  deleteCluster: vi.fn(),
}))

vi.mock('#/lib/api-client', () => ({
  apiClient: {
    listNamespaces,
    listPods,
    listWorkloads,
    listServices,
    listIngresses,
    listNodes,
    listEvents,
    deleteCluster,
  },
}))

const { ClusterDetailPanel } = await import('./ClusterDetailPanel')
const { useClusterSelectionStore } =
  await import('#/features/clusters/selection-store')
const { useNamespaceFilterStore } =
  await import('#/features/clusters/namespace-filter-store')
const { useResourceTabStore } =
  await import('#/features/clusters/resource-tab-store')

function renderPanel(clusterToRender: Cluster) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ClusterDetailPanel cluster={clusterToRender} />
    </QueryClientProvider>,
  )
}

function cluster(overrides: Partial<Cluster> = {}): Cluster {
  return {
    id: 'c1',
    displayName: 'prod',
    context: 'prod-ctx',
    kubernetesVersion: 'v1.30.1',
    connectionStatus: 'connected',
    health: 'green',
    nodeCount: 3,
    podCount: 12,
    lastSeen: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  listNamespaces.mockReset().mockResolvedValue([])
  listPods.mockReset().mockResolvedValue([])
  listWorkloads.mockReset().mockResolvedValue([])
  listServices.mockReset().mockResolvedValue([])
  listIngresses.mockReset().mockResolvedValue([])
  listNodes.mockReset().mockResolvedValue([])
  listEvents.mockReset().mockResolvedValue([])
  deleteCluster.mockReset()
  useClusterSelectionStore.setState({ selectedClusterId: null })
  useNamespaceFilterStore.setState({ selectedNamespaceByCluster: {} })
  useResourceTabStore.setState({ activeTabByCluster: {} })
})

describe('ClusterDetailPanel', () => {
  it('shows the Pods tab by default with the namespace filter and full pod summary', async () => {
    listNamespaces.mockResolvedValue([
      { name: 'default', status: 'Active', createdAt: '2026-01-01T00:00:00Z' },
      {
        name: 'old-stuff',
        status: 'Terminating',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])
    listPods.mockResolvedValue([
      {
        name: 'web-1',
        namespace: 'default',
        phase: 'Running',
        ready: '2/2',
        restarts: 3,
        node: 'node-a',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ])
    renderPanel(cluster())

    const podRow = (await screen.findByText('web-1')).closest('tr')!
    expect(within(podRow).getByText('Running')).toBeInTheDocument()
    expect(within(podRow).getByText('2/2')).toBeInTheDocument()
    expect(within(podRow).getByText('3')).toBeInTheDocument()
    expect(within(podRow).getByText('node-a')).toBeInTheDocument()
    expect(within(podRow).getByText('2h')).toBeInTheDocument()

    expect(
      screen.getByRole('option', { name: 'old-stuff (Terminating)' }),
    ).toBeInTheDocument()
  })

  it('shows loading and error states for namespaces and pods independently', async () => {
    listNamespaces.mockImplementation(() => new Promise(() => {})) // never resolves
    listPods.mockRejectedValue(new Error('pods fetch failed'))
    renderPanel(cluster())

    expect(await screen.findByText(/loading namespaces/i)).toBeInTheDocument()
    expect(await screen.findByText(/pods fetch failed/i)).toBeInTheDocument()
  })

  it('refetches pods scoped to the chosen namespace', async () => {
    listNamespaces.mockResolvedValue([
      { name: 'default', status: 'Active', createdAt: '2026-01-01T00:00:00Z' },
      { name: 'jobs', status: 'Active', createdAt: '2026-01-01T00:00:00Z' },
    ])
    renderPanel(cluster())

    await screen.findByRole('combobox', { name: /filter by namespace/i })
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /filter by namespace/i }),
      'jobs',
    )

    expect(await screen.findByText(/no pods in jobs/i)).toBeInTheDocument()
    expect(listPods).toHaveBeenCalledWith('c1', 'jobs')
  })

  it('removing a cluster calls delete and clears the selection', async () => {
    useClusterSelectionStore.setState({ selectedClusterId: 'c1' })
    renderPanel(cluster())

    await userEvent.click(
      await screen.findByRole('button', { name: /remove cluster/i }),
    )

    expect(deleteCluster).toHaveBeenCalledWith('c1')
    expect(useClusterSelectionStore.getState().selectedClusterId).toBeNull()
  })

  it("does not fetch an inactive tab's resource until it's selected", async () => {
    renderPanel(cluster())
    await screen.findByRole('tab', { name: 'Workloads' })

    expect(listWorkloads).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('tab', { name: 'Workloads' }))

    expect(
      await screen.findByText(/no workloads in this cluster/i),
    ).toBeInTheDocument()
    expect(listWorkloads).toHaveBeenCalledWith('c1', undefined)
  })

  it('shows the Workloads tab with kind, replica counts, and age', async () => {
    listWorkloads.mockResolvedValue([
      {
        kind: 'Deployment',
        name: 'web',
        namespace: 'default',
        desired: 3,
        ready: 2,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])
    renderPanel(cluster())

    await userEvent.click(await screen.findByRole('tab', { name: 'Workloads' }))

    const row = (await screen.findByText('web')).closest('tr')!
    expect(within(row).getByText('Deployment')).toBeInTheDocument()
    expect(within(row).getByText('2/3')).toBeInTheDocument()
  })

  it('shows the Services tab with type, cluster IP, and ports', async () => {
    listServices.mockResolvedValue([
      {
        name: 'web',
        namespace: 'default',
        type: 'ClusterIP',
        clusterIP: '10.0.0.1',
        ports: ['80/TCP'],
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])
    renderPanel(cluster())

    await userEvent.click(await screen.findByRole('tab', { name: 'Services' }))

    const row = (await screen.findByText('web')).closest('tr')!
    expect(within(row).getByText('ClusterIP')).toBeInTheDocument()
    expect(within(row).getByText('10.0.0.1')).toBeInTheDocument()
    expect(within(row).getByText('80/TCP')).toBeInTheDocument()
  })

  it('shows the Ingresses tab with routed hosts', async () => {
    listIngresses.mockResolvedValue([
      {
        name: 'web',
        namespace: 'default',
        hosts: ['web.example.com'],
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])
    renderPanel(cluster())

    await userEvent.click(await screen.findByRole('tab', { name: 'Ingresses' }))

    expect(await screen.findByText('web.example.com')).toBeInTheDocument()
  })

  it('shows the Nodes tab and hides the namespace filter', async () => {
    listNodes.mockResolvedValue([
      {
        name: 'node-a',
        ready: true,
        kubernetesVersion: 'v1.30.1',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])
    renderPanel(cluster())

    await userEvent.click(await screen.findByRole('tab', { name: 'Nodes' }))

    const row = (await screen.findByText('node-a')).closest('tr')!
    expect(within(row).getByText('Ready')).toBeInTheDocument()
    expect(
      screen.queryByRole('combobox', { name: /filter by namespace/i }),
    ).not.toBeInTheDocument()
  })

  it('shows the Events tab with type, reason, and involved object', async () => {
    listEvents.mockResolvedValue([
      {
        type: 'Warning',
        reason: 'BackOff',
        message: 'container crashed',
        involvedObjectKind: 'Pod',
        involvedObjectName: 'web-1',
        namespace: 'default',
        count: 3,
        lastSeen: '2026-01-01T00:00:00Z',
      },
    ])
    renderPanel(cluster())

    await userEvent.click(await screen.findByRole('tab', { name: 'Events' }))

    const row = (await screen.findByText('BackOff')).closest('tr')!
    expect(within(row).getByText('Warning')).toBeInTheDocument()
    expect(within(row).getByText('Pod/web-1')).toBeInTheDocument()
    expect(within(row).getByText('3')).toBeInTheDocument()
  })

  it('applies the same namespace filter to Workloads as it does to Pods', async () => {
    listNamespaces.mockResolvedValue([
      { name: 'default', status: 'Active', createdAt: '2026-01-01T00:00:00Z' },
      { name: 'jobs', status: 'Active', createdAt: '2026-01-01T00:00:00Z' },
    ])
    renderPanel(cluster())

    await screen.findByRole('combobox', { name: /filter by namespace/i })
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /filter by namespace/i }),
      'jobs',
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Workloads' }))

    expect(await screen.findByText(/no workloads in jobs/i)).toBeInTheDocument()
    expect(listWorkloads).toHaveBeenCalledWith('c1', 'jobs')
  })

  it('shows loading and error states on the Workloads tab independently of Pods', async () => {
    listWorkloads.mockImplementation(() => new Promise(() => {}))
    renderPanel(cluster())

    await userEvent.click(await screen.findByRole('tab', { name: 'Workloads' }))

    expect(
      await screen.findByRole('status', { name: /loading workloads/i }),
    ).toBeInTheDocument()
  })

  it('shows loading and error states on the Services tab independently of Pods', async () => {
    listServices.mockRejectedValue(new Error('services fetch failed'))
    renderPanel(cluster())

    await userEvent.click(await screen.findByRole('tab', { name: 'Services' }))

    expect(await screen.findByText(/services fetch failed/i)).toBeInTheDocument()
  })

  it('shows loading and error states on the Ingresses tab independently of Pods', async () => {
    listIngresses.mockRejectedValue(new Error('ingresses fetch failed'))
    renderPanel(cluster())

    await userEvent.click(await screen.findByRole('tab', { name: 'Ingresses' }))

    expect(await screen.findByText(/ingresses fetch failed/i)).toBeInTheDocument()
  })

  it('shows loading and error states on the Nodes tab independently of Pods', async () => {
    listNodes.mockRejectedValue(new Error('nodes fetch failed'))
    renderPanel(cluster())

    await userEvent.click(await screen.findByRole('tab', { name: 'Nodes' }))

    expect(await screen.findByText(/nodes fetch failed/i)).toBeInTheDocument()
  })

  it('shows loading and error states on the Events tab independently of Pods', async () => {
    listEvents.mockRejectedValue(new Error('events fetch failed'))
    renderPanel(cluster())

    await userEvent.click(await screen.findByRole('tab', { name: 'Events' }))

    expect(await screen.findByText(/events fetch failed/i)).toBeInTheDocument()
  })

  it('applies the same namespace filter to Services as it does to Pods', async () => {
    listNamespaces.mockResolvedValue([
      { name: 'default', status: 'Active', createdAt: '2026-01-01T00:00:00Z' },
      { name: 'jobs', status: 'Active', createdAt: '2026-01-01T00:00:00Z' },
    ])
    renderPanel(cluster())

    await screen.findByRole('combobox', { name: /filter by namespace/i })
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /filter by namespace/i }),
      'jobs',
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Services' }))

    expect(await screen.findByText(/no services in jobs/i)).toBeInTheDocument()
    expect(listServices).toHaveBeenCalledWith('c1', 'jobs')
  })

  it('applies the same namespace filter to Ingresses as it does to Pods', async () => {
    listNamespaces.mockResolvedValue([
      { name: 'default', status: 'Active', createdAt: '2026-01-01T00:00:00Z' },
      { name: 'jobs', status: 'Active', createdAt: '2026-01-01T00:00:00Z' },
    ])
    renderPanel(cluster())

    await screen.findByRole('combobox', { name: /filter by namespace/i })
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /filter by namespace/i }),
      'jobs',
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Ingresses' }))

    expect(await screen.findByText(/no ingresses in jobs/i)).toBeInTheDocument()
    expect(listIngresses).toHaveBeenCalledWith('c1', 'jobs')
  })

  it('applies the same namespace filter to Events as it does to Pods', async () => {
    listNamespaces.mockResolvedValue([
      { name: 'default', status: 'Active', createdAt: '2026-01-01T00:00:00Z' },
      { name: 'jobs', status: 'Active', createdAt: '2026-01-01T00:00:00Z' },
    ])
    renderPanel(cluster())

    await screen.findByRole('combobox', { name: /filter by namespace/i })
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /filter by namespace/i }),
      'jobs',
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Events' }))

    expect(await screen.findByText(/no events in jobs/i)).toBeInTheDocument()
    expect(listEvents).toHaveBeenCalledWith('c1', 'jobs')
  })
})
