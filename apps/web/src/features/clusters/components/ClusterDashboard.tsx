import { useClusters } from "#/features/clusters/queries";
import { useClusterSelectionStore } from "#/features/clusters/selection-store";
import { ClusterRoster } from "#/features/clusters/components/ClusterRoster";
import { ClusterDetailPanel } from "#/features/clusters/components/ClusterDetailPanel";
import { EmptyState } from "#/features/clusters/components/EmptyState";
import { RegisterClusterForm } from "#/features/clusters/components/RegisterClusterForm";

export function ClusterDashboard() {
  const clustersQuery = useClusters();
  const selectedClusterId = useClusterSelectionStore((state) => state.selectedClusterId);
  const selectedCluster = clustersQuery.data?.find((cluster) => cluster.id === selectedClusterId);

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-background p-6 text-foreground">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="font-mono text-lg tracking-wide">Clusters</h1>
      </header>

      <RegisterClusterForm />

      <main aria-label="Cluster roster">
        {clustersQuery.isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading clusters…
          </p>
        )}
        {clustersQuery.isError && (
          <p role="alert" className="text-sm text-destructive">
            {clustersQuery.error.message}
          </p>
        )}
        {clustersQuery.data &&
          (clustersQuery.data.length === 0 ? (
            <EmptyState />
          ) : (
            <ClusterRoster clusters={clustersQuery.data} />
          ))}
      </main>

      {selectedCluster && <ClusterDetailPanel cluster={selectedCluster} />}
    </div>
  );
}
