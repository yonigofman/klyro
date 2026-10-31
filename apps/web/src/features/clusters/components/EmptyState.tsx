export function EmptyState() {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 border border-dashed border-border py-24 text-center"
    >
      <p className="text-sm font-medium text-foreground">No clusters registered yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Register your first cluster's kubeconfig above to see it appear on the board.
      </p>
    </div>
  );
}
