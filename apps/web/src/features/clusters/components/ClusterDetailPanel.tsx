import type { Cluster } from "@klyro/api-client";
import { Button } from "#/components/ui/button";
import { QueryState } from "#/components/shared/QueryState";
import { useDeleteCluster, useNamespaces, usePods } from "#/features/clusters/queries";
import { useClusterSelectionStore } from "#/features/clusters/selection-store";
import { selectedNamespaceFor, useNamespaceFilterStore } from "#/features/clusters/namespace-filter-store";
import { NamespaceFilter } from "#/features/clusters/components/NamespaceFilter";
import { PodList } from "#/features/clusters/components/PodList";
import { PodListSkeleton } from "#/features/clusters/components/PodListSkeleton";

export function ClusterDetailPanel({ cluster }: { cluster: Cluster }) {
  const select = useClusterSelectionStore((state) => state.select);
  const deleteCluster = useDeleteCluster();

  const selectedNamespace = useNamespaceFilterStore(selectedNamespaceFor(cluster.id));

  const namespacesQuery = useNamespaces(cluster.id);
  const podsQuery = usePods(cluster.id, selectedNamespace ?? undefined);

  return (
    <section
      aria-label={`${cluster.displayName} detail`}
      className="border border-border bg-card p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-sm tracking-wide text-foreground">{cluster.displayName}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={deleteCluster.isPending}
            onClick={() => {
              deleteCluster.mutate(cluster.id);
              select(null);
            }}
          >
            Remove cluster
          </Button>
          <Button variant="ghost" size="sm" onClick={() => select(null)}>
            Close
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Pods</h3>
        <QueryState query={namespacesQuery} loadingLabel="Loading namespaces…">
          {(namespaces) => <NamespaceFilter clusterId={cluster.id} namespaces={namespaces} />}
        </QueryState>
      </div>

      <div className="mt-2">
        <QueryState
          query={podsQuery}
          loadingLabel="Loading pods…"
          skeleton={<PodListSkeleton />}
          isEmpty={(pods) => pods.length === 0}
          empty={
            <p role="status" className="text-sm text-muted-foreground">
              {selectedNamespace ? `No pods in ${selectedNamespace}.` : "No pods in this cluster."}
            </p>
          }
        >
          {(pods) => <PodList pods={pods} />}
        </QueryState>
      </div>
    </section>
  );
}
