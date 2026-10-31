import type { Cluster } from "@klyro/api-client";
import { Button } from "#/components/ui/button";
import { useDeleteCluster } from "#/features/clusters/queries";
import { useClusterSelectionStore } from "#/features/clusters/selection-store";

export function ClusterDetailPanel({ cluster }: { cluster: Cluster }) {
  const select = useClusterSelectionStore((state) => state.select);
  const deleteCluster = useDeleteCluster();

  return (
    <section
      aria-label={`${cluster.displayName} detail`}
      className="border border-border bg-card p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-sm tracking-wide text-foreground">{cluster.displayName}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
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
      <p className="mt-4 text-sm text-muted-foreground">
        Cluster detail views (namespaces, workloads, nodes) are coming in a future release.
      </p>
    </section>
  );
}
