import { createFileRoute } from '@tanstack/react-router'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { StatusPip } from '#/components/ui/status-pip'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="p-8 flex flex-col gap-6">
      <h1 className="font-display text-display text-ink">Klyro</h1>
      <p className="text-body text-ink-muted">
        Phase 2 token + primitive showcase. Replace once the app shell (Phase 3) lands.
      </p>

      <div className="flex items-center gap-3">
        <Button variant="primary">Approve &amp; run</Button>
        <Button variant="secondary">Scale up</Button>
        <Button variant="outline">Dry run</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger">Delete</Button>
        <Button variant="primary" loading>
          Running
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Badge tone="success">Running</Badge>
        <Badge tone="warning">Pending</Badge>
        <Badge tone="danger">CrashLoopBackOff</Badge>
        <Badge tone="info">Normal</Badge>
        <Badge tone="volt" dot>
          Klyro is working
        </Badge>
        <Badge tone="outline" mono>
          v1.29.3
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-ui text-ink-muted">
        <span className="flex items-center gap-1.5">
          <StatusPip status="healthy" label="Running" /> Running
        </span>
        <span className="flex items-center gap-1.5">
          <StatusPip status="warning" label="Pressure" /> Pressure
        </span>
        <span className="flex items-center gap-1.5">
          <StatusPip status="danger" label="CrashLoopBackOff" /> CrashLoopBackOff
        </span>
        <span className="flex items-center gap-1.5">
          <StatusPip status="neutral" label="Terminating" /> Terminating
        </span>
        <span className="flex items-center gap-1.5">
          <StatusPip status="progress" label="ContainerCreating" /> ContainerCreating
        </span>
        <span className="flex items-center gap-1.5">
          <StatusPip status="info" label="Normal" /> Normal
        </span>
      </div>
    </div>
  )
}
