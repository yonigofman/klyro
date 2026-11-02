import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '#/components/ui/empty-state'

export const Route = createFileRoute('/_shell/ai-workspace')({ component: AIWorkspace })

function AIWorkspace() {
  return (
    <EmptyState
      title="Ask Klyro about your infrastructure"
      description="The investigation workspace lands in a later phase — ask a question once a cluster is connected."
    />
  )
}
