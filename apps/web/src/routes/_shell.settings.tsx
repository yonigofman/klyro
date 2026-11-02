import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '#/components/ui/empty-state'

export const Route = createFileRoute('/_shell/settings')({ component: Settings })

function Settings() {
  return (
    <EmptyState
      compact
      title="Nothing to configure yet"
      description="Account, organization and integration settings land in a later phase."
    />
  )
}
