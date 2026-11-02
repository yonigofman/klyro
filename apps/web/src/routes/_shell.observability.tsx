import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '#/components/ui/empty-state'

export const Route = createFileRoute('/_shell/observability')({ component: Observability })

function Observability() {
  return (
    <EmptyState
      title="No metrics, logs or traces yet"
      description="Observability data streams in once a cluster is connected and discovery runs."
    />
  )
}
