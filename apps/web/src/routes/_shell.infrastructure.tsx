import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '#/components/ui/empty-state'

export const Route = createFileRoute('/_shell/infrastructure')({ component: Infrastructure })

function Infrastructure() {
  return (
    <EmptyState
      title="No resources to browse yet"
      description="Kubernetes resource exploration lands once a cluster agent is connected."
    />
  )
}
