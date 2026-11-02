import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '#/components/ui/empty-state'

export const Route = createFileRoute('/_shell/clusters')({ component: Clusters })

function Clusters() {
  return (
    <EmptyState
      title="No clusters registered"
      description="Register a Kubernetes or OpenShift cluster to connect its agent and start exploring."
    />
  )
}
