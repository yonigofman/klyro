export function EmptyState({
  reason,
}: {
  reason: 'no-clusters' | 'no-matches'
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 border border-dashed border-border py-24 text-center"
    >
      <p className="text-sm font-medium text-foreground">
        {reason === 'no-clusters'
          ? 'No clusters registered yet'
          : 'No clusters match your search'}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {reason === 'no-clusters'
          ? "Use Add cluster to connect your first cluster's kubeconfig."
          : 'Try a different name or context.'}
      </p>
    </div>
  )
}
