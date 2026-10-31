import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const {
  listClusters,
  listPods,
  listWorkloads,
  listServices,
  listIngresses,
  listNodes,
} = vi.hoisted(() => ({
  listClusters: vi.fn(),
  listPods: vi.fn(),
  listWorkloads: vi.fn(),
  listServices: vi.fn(),
  listIngresses: vi.fn(),
  listNodes: vi.fn(),
}))

vi.mock('#/lib/api-client', () => ({
  apiClient: { listClusters, listPods, listWorkloads, listServices, listIngresses, listNodes },
}))

const { CommandPalette } = await import('./CommandPalette')
const { useCommandPaletteStore } = await import(
  '#/features/clusters/command-palette-store'
)
const { useClusterSelectionStore } = await import('#/features/clusters/selection-store')
const { mockNavigate } = await import('../../../../vitest.setup')

function renderPalette() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CommandPalette />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  listClusters.mockReset().mockResolvedValue([])
  listPods.mockReset().mockResolvedValue([])
  listWorkloads.mockReset().mockResolvedValue([])
  listServices.mockReset().mockResolvedValue([])
  listIngresses.mockReset().mockResolvedValue([])
  listNodes.mockReset().mockResolvedValue([])
  mockNavigate.mockReset()
  useCommandPaletteStore.setState({ isOpen: false })
  useClusterSelectionStore.setState({ selectedClusterId: null })
})

describe('CommandPalette', () => {
  it('opens on Cmd+K', async () => {
    renderPalette()
    expect(screen.queryByPlaceholderText(/search clusters/i)).not.toBeInTheDocument()

    await userEvent.keyboard('{Meta>}k{/Meta}')

    expect(await screen.findByPlaceholderText(/search clusters/i)).toBeInTheDocument()
  })

  it('in roster mode, searches Clusters by name and selects one on choice', async () => {
    listClusters.mockResolvedValue([
      { id: 'c1', displayName: 'prod', context: 'prod-ctx' },
      { id: 'c2', displayName: 'staging', context: 'staging-ctx' },
    ])
    useCommandPaletteStore.setState({ isOpen: true })
    renderPalette()

    expect(await screen.findByText('prod')).toBeInTheDocument()
    expect(screen.getByText('staging')).toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText(/search clusters/i), 'stag')
    expect(screen.queryByText('prod')).not.toBeInTheDocument()

    await userEvent.click(screen.getByText('staging'))

    expect(useClusterSelectionStore.getState().selectedClusterId).toBe('c2')
    expect(useCommandPaletteStore.getState().isOpen).toBe(false)
  })

  it('in cluster mode, searches all 5 Resource kinds and navigates to the chosen one', async () => {
    listPods.mockResolvedValue([{ name: 'web-1', namespace: 'default' }])
    listWorkloads.mockResolvedValue([
      { kind: 'Deployment', name: 'web', namespace: 'default' },
    ])
    listServices.mockResolvedValue([{ name: 'web-svc', namespace: 'default' }])
    listIngresses.mockResolvedValue([{ name: 'web-ing', namespace: 'default' }])
    listNodes.mockResolvedValue([{ name: 'node-a' }])
    useClusterSelectionStore.setState({ selectedClusterId: 'c1' })
    useCommandPaletteStore.setState({ isOpen: true })
    renderPalette()

    expect(await screen.findByText('web-1')).toBeInTheDocument()
    expect(screen.getByText('web')).toBeInTheDocument()
    expect(screen.getByText('web-svc')).toBeInTheDocument()
    expect(screen.getByText('web-ing')).toBeInTheDocument()
    expect(screen.getByText('node-a')).toBeInTheDocument()
    expect(listPods).toHaveBeenCalledWith('c1', undefined)

    await userEvent.click(screen.getByText('web-svc'))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clusters/$clusterId/services/$namespace/$name',
      params: { clusterId: 'c1', namespace: 'default', name: 'web-svc' },
    })
    expect(useCommandPaletteStore.getState().isOpen).toBe(false)
  })

  it('navigates a chosen Workload to its $kind-scoped route', async () => {
    listWorkloads.mockResolvedValue([
      { kind: 'StatefulSet', name: 'db', namespace: 'default' },
    ])
    useClusterSelectionStore.setState({ selectedClusterId: 'c1' })
    useCommandPaletteStore.setState({ isOpen: true })
    renderPalette()

    await userEvent.click(await screen.findByText('db'))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clusters/$clusterId/workloads/$namespace/$kind/$name',
      params: { clusterId: 'c1', namespace: 'default', kind: 'StatefulSet', name: 'db' },
    })
  })

  it('navigates a chosen Node to its namespace-less route', async () => {
    listNodes.mockResolvedValue([{ name: 'node-a' }])
    useClusterSelectionStore.setState({ selectedClusterId: 'c1' })
    useCommandPaletteStore.setState({ isOpen: true })
    renderPalette()

    await userEvent.click(await screen.findByText('node-a'))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clusters/$clusterId/nodes/$name',
      params: { clusterId: 'c1', name: 'node-a' },
    })
  })
})
