import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

/**
 * Renders a TanStack Query result's loading/error/empty/loaded states
 * consistently, so every list in the app doesn't reimplement the same
 * four-state ternary.
 */
export function QueryState<T>({
  query,
  loadingLabel,
  skeleton,
  isEmpty,
  empty,
  children,
}: {
  query: UseQueryResult<T>;
  loadingLabel: string;
  /** Rendered while loading, in place of the default text message. */
  skeleton?: ReactNode;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) {
    return (
      skeleton ?? (
        <p role="status" className="text-sm text-muted-foreground">
          {loadingLabel}
        </p>
      )
    );
  }

  if (query.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {query.error.message}
      </p>
    );
  }

  if (!query.data) {
    return null;
  }

  if (isEmpty?.(query.data)) {
    return <>{empty}</>;
  }

  return <>{children(query.data)}</>;
}
