import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '#/components/ui/empty-state'

export const Route = createFileRoute('/_shell/')({ component: Overview })

function Overview() {
  return (
    <EmptyState
      title="No clusters connected yet"
      description="Register a cluster to see its health, resources and recent activity here."
    />
  )
}
