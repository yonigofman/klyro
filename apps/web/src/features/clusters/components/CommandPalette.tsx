import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '#/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { useCommandPaletteStore } from '#/features/clusters/command-palette-store'
import { useClusterSelectionStore } from '#/features/clusters/selection-store'
import {
  useClusters,
  useIngresses,
  useNodes,
  usePods,
  useServices,
  useWorkloads,
} from '#/features/clusters/queries'

// Plain case-insensitive substring match — no fuzzy-ranked scoring (see the
// Shape Brief). cmdk's default filter does fuzzy scoring; override it.
function substringFilter(value: string, search: string): number {
  return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
}

export function CommandPalette() {
  const isOpen = useCommandPaletteStore((state) => state.isOpen)
  const closePalette = useCommandPaletteStore((state) => state.close)
  const togglePalette = useCommandPaletteStore((state) => state.toggle)
  const selectedClusterId = useClusterSelectionStore(
    (state) => state.selectedClusterId,
  )
  const selectCluster = useClusterSelectionStore((state) => state.select)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        togglePalette()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePalette])

  useEffect(() => {
    if (!isOpen) setQuery('')
  }, [isOpen])

  const clusterScoped = selectedClusterId !== null
  const clustersQuery = useClusters()
  // Eager-fetch every kind on open, regardless of which tab is active, so
  // results are complete no matter which tab the operator has clicked.
  const podsQuery = usePods(selectedClusterId ?? '', undefined, isOpen && clusterScoped)
  const workloadsQuery = useWorkloads(
    selectedClusterId ?? '',
    undefined,
    isOpen && clusterScoped,
  )
  const servicesQuery = useServices(
    selectedClusterId ?? '',
    undefined,
    isOpen && clusterScoped,
  )
  const ingressesQuery = useIngresses(
    selectedClusterId ?? '',
    undefined,
    isOpen && clusterScoped,
  )
  const nodesQuery = useNodes(selectedClusterId ?? '', isOpen && clusterScoped)

  function goTo(action: () => void) {
    action()
    closePalette()
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) closePalette()
      }}
    >
      <DialogHeader className="sr-only">
        <DialogTitle>Command palette</DialogTitle>
        <DialogDescription>Jump to a Cluster or Resource by name</DialogDescription>
      </DialogHeader>
      <DialogContent className="overflow-hidden p-0">
      <Command filter={substringFilter}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={
            clusterScoped
              ? 'Search Pods, Workloads, Services, Ingresses, Nodes…'
              : 'Search Clusters…'
          }
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {!clusterScoped && (
            <CommandGroup heading="Clusters">
              {(clustersQuery.data ?? []).map((cluster) => (
                <CommandItem
                  key={cluster.id}
                  value={cluster.displayName}
                  onSelect={() => goTo(() => selectCluster(cluster.id))}
                >
                  {cluster.displayName}
                  <CommandShortcut>{cluster.context}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {clusterScoped && (podsQuery.data ?? []).length > 0 && (
            <CommandGroup heading="Pods">
              {(podsQuery.data ?? []).map((pod) => (
                <CommandItem
                  key={`${pod.namespace}/${pod.name}`}
                  value={pod.name}
                  onSelect={() =>
                    goTo(() =>
                      navigate({
                        to: '/clusters/$clusterId/pods/$namespace/$name',
                        params: {
                          clusterId: selectedClusterId,
                          namespace: pod.namespace,
                          name: pod.name,
                        },
                      }),
                    )
                  }
                >
                  {pod.name}
                  <CommandShortcut>{pod.namespace}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {clusterScoped && (workloadsQuery.data ?? []).length > 0 && (
            <CommandGroup heading="Workloads">
              {(workloadsQuery.data ?? []).map((workload) => (
                <CommandItem
                  key={`${workload.namespace}/${workload.kind}/${workload.name}`}
                  value={workload.name}
                  onSelect={() =>
                    goTo(() =>
                      navigate({
                        to: '/clusters/$clusterId/workloads/$namespace/$kind/$name',
                        params: {
                          clusterId: selectedClusterId,
                          namespace: workload.namespace,
                          kind: workload.kind,
                          name: workload.name,
                        },
                      }),
                    )
                  }
                >
                  {workload.name}
                  <CommandShortcut>{workload.namespace}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {clusterScoped && (servicesQuery.data ?? []).length > 0 && (
            <CommandGroup heading="Services">
              {(servicesQuery.data ?? []).map((service) => (
                <CommandItem
                  key={`${service.namespace}/${service.name}`}
                  value={service.name}
                  onSelect={() =>
                    goTo(() =>
                      navigate({
                        to: '/clusters/$clusterId/services/$namespace/$name',
                        params: {
                          clusterId: selectedClusterId,
                          namespace: service.namespace,
                          name: service.name,
                        },
                      }),
                    )
                  }
                >
                  {service.name}
                  <CommandShortcut>{service.namespace}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {clusterScoped && (ingressesQuery.data ?? []).length > 0 && (
            <CommandGroup heading="Ingresses">
              {(ingressesQuery.data ?? []).map((ingress) => (
                <CommandItem
                  key={`${ingress.namespace}/${ingress.name}`}
                  value={ingress.name}
                  onSelect={() =>
                    goTo(() =>
                      navigate({
                        to: '/clusters/$clusterId/ingresses/$namespace/$name',
                        params: {
                          clusterId: selectedClusterId,
                          namespace: ingress.namespace,
                          name: ingress.name,
                        },
                      }),
                    )
                  }
                >
                  {ingress.name}
                  <CommandShortcut>{ingress.namespace}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {clusterScoped && (nodesQuery.data ?? []).length > 0 && (
            <CommandGroup heading="Nodes">
              {(nodesQuery.data ?? []).map((node) => (
                <CommandItem
                  key={node.name}
                  value={node.name}
                  onSelect={() =>
                    goTo(() =>
                      navigate({
                        to: '/clusters/$clusterId/nodes/$name',
                        params: { clusterId: selectedClusterId, name: node.name },
                      }),
                    )
                  }
                >
                  {node.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
      </DialogContent>
    </Dialog>
  )
}
