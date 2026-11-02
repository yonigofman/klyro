import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '#/components/ui/empty-state'

export const Route = createFileRoute('/_shell/operations')({ component: Operations })

function Operations() {
  return (
    <EmptyState
      title="No operations pending"
      description="Proposed changes, approvals and the audit trail land here once mutations are wired up."
    />
  )
}
