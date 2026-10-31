import type { Cluster } from '@klyro/api-client'
import { Button } from '#/components/ui/button'
import { QueryState } from '#/components/shared/QueryState'
import { ResourceListSkeleton } from '#/components/shared/ResourceListSkeleton'
import {
  useDeleteCluster,
  useEvents,
  useIngresses,
  useNamespaces,
  useNodes,
  usePods,
  useServices,
  useWorkloads,
} from '#/features/clusters/queries'
import { useClusterSelectionStore } from '#/features/clusters/selection-store'
import {
  selectedNamespaceFor,
  useNamespaceFilterStore,
} from '#/features/clusters/namespace-filter-store'
import {
  activeTabFor,
  useResourceTabStore,
} from '#/features/clusters/resource-tab-store'
import { NamespaceFilter } from '#/features/clusters/components/NamespaceFilter'
import { ResourceTabs } from '#/features/clusters/components/ResourceTabs'
import { PodList } from '#/features/clusters/components/PodList'
import { WorkloadList } from '#/features/clusters/components/WorkloadList'
import { ServiceList } from '#/features/clusters/components/ServiceList'
import { IngressList } from '#/features/clusters/components/IngressList'
import { NodeList } from '#/features/clusters/components/NodeList'
import { EventList } from '#/features/clusters/components/EventList'

export function ClusterDetailPanel({ cluster }: { cluster: Cluster }) {
  const select = useClusterSelectionStore((state) => state.select)
  const deleteCluster = useDeleteCluster()

  const activeTab = useResourceTabStore(activeTabFor(cluster.id))
  const selectedNamespace = useNamespaceFilterStore(
    selectedNamespaceFor(cluster.id),
  )
  const namespace = selectedNamespace ?? undefined

  const namespacesQuery = useNamespaces(cluster.id)
  const podsQuery = usePods(cluster.id, namespace, activeTab === 'pods')
  const workloadsQuery = useWorkloads(
    cluster.id,
    namespace,
    activeTab === 'workloads',
  )
  const servicesQuery = useServices(
    cluster.id,
    namespace,
    activeTab === 'services',
  )
  const ingressesQuery = useIngresses(
    cluster.id,
    namespace,
    activeTab === 'ingresses',
  )
  const nodesQuery = useNodes(cluster.id, activeTab === 'nodes')
  const eventsQuery = useEvents(cluster.id, namespace, activeTab === 'events')

  const showNamespaceFilter = activeTab !== 'nodes'

  return (
    <section
      aria-label={`${cluster.displayName} detail`}
      className="border border-border bg-card p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-sm tracking-wide text-foreground">
          {cluster.displayName}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={deleteCluster.isPending}
            onClick={() => {
              deleteCluster.mutate(cluster.id)
              select(null)
            }}
          >
            Remove cluster
          </Button>
          <Button variant="ghost" size="sm" onClick={() => select(null)}>
            Close
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <ResourceTabs clusterId={cluster.id} />
      </div>

      {showNamespaceFilter && (
        <div className="mt-3 flex items-center justify-end">
          <QueryState
            query={namespacesQuery}
            loadingLabel="Loading namespaces…"
          >
            {(namespaces) => (
              <NamespaceFilter clusterId={cluster.id} namespaces={namespaces} />
            )}
          </QueryState>
        </div>
      )}

      <div className="mt-2 h-[22rem] overflow-y-auto">
        {activeTab === 'pods' && (
          <QueryState
            query={podsQuery}
            loadingLabel="Loading pods…"
            skeleton={<ResourceListSkeleton label="Loading pods" />}
            isEmpty={(pods) => pods.length === 0}
            empty={
              <p role="status" className="text-sm text-muted-foreground">
                {selectedNamespace
                  ? `No pods in ${selectedNamespace}.`
                  : 'No pods in this cluster.'}
              </p>
            }
          >
            {(pods) => <PodList clusterId={cluster.id} pods={pods} />}
          </QueryState>
        )}

        {activeTab === 'workloads' && (
          <QueryState
            query={workloadsQuery}
            loadingLabel="Loading workloads…"
            skeleton={<ResourceListSkeleton label="Loading workloads" />}
            isEmpty={(workloads) => workloads.length === 0}
            empty={
              <p role="status" className="text-sm text-muted-foreground">
                {selectedNamespace
                  ? `No workloads in ${selectedNamespace}.`
                  : 'No workloads in this cluster.'}
              </p>
            }
          >
            {(workloads) => (
              <WorkloadList clusterId={cluster.id} workloads={workloads} />
            )}
          </QueryState>
        )}

        {activeTab === 'services' && (
          <QueryState
            query={servicesQuery}
            loadingLabel="Loading services…"
            skeleton={<ResourceListSkeleton label="Loading services" />}
            isEmpty={(services) => services.length === 0}
            empty={
              <p role="status" className="text-sm text-muted-foreground">
                {selectedNamespace
                  ? `No services in ${selectedNamespace}.`
                  : 'No services in this cluster.'}
              </p>
            }
          >
            {(services) => (
              <ServiceList clusterId={cluster.id} services={services} />
            )}
          </QueryState>
        )}

        {activeTab === 'ingresses' && (
          <QueryState
            query={ingressesQuery}
            loadingLabel="Loading ingresses…"
            skeleton={<ResourceListSkeleton label="Loading ingresses" />}
            isEmpty={(ingresses) => ingresses.length === 0}
            empty={
              <p role="status" className="text-sm text-muted-foreground">
                {selectedNamespace
                  ? `No ingresses in ${selectedNamespace}.`
                  : 'No ingresses in this cluster.'}
              </p>
            }
          >
            {(ingresses) => (
              <IngressList clusterId={cluster.id} ingresses={ingresses} />
            )}
          </QueryState>
        )}

        {activeTab === 'nodes' && (
          <QueryState
            query={nodesQuery}
            loadingLabel="Loading nodes…"
            skeleton={<ResourceListSkeleton label="Loading nodes" />}
            isEmpty={(nodes) => nodes.length === 0}
            empty={
              <p role="status" className="text-sm text-muted-foreground">
                No nodes in this cluster.
              </p>
            }
          >
            {(nodes) => <NodeList clusterId={cluster.id} nodes={nodes} />}
          </QueryState>
        )}

        {activeTab === 'events' && (
          <QueryState
            query={eventsQuery}
            loadingLabel="Loading events…"
            skeleton={<ResourceListSkeleton label="Loading events" />}
            isEmpty={(events) => events.length === 0}
            empty={
              <p role="status" className="text-sm text-muted-foreground">
                {selectedNamespace
                  ? `No events in ${selectedNamespace}.`
                  : 'No events in this cluster.'}
              </p>
            }
          >
            {(events) => <EventList events={events} />}
          </QueryState>
        )}
      </div>
    </section>
  )
}
