import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { EmptyState } from '#/components/ui/empty-state'
import type { Column } from '#/components/ui/resource-table'
import { ResourceTable } from '#/components/ui/resource-table'
import type { Status } from '#/components/ui/status-pip'
import { StatusPip } from '#/components/ui/status-pip'
import { Tabs } from '#/components/ui/tabs'
import type { ClusterSummary, ResourceRow } from '#/lib/api'
import { listClusters, listResources } from '#/lib/api'

export const Route = createFileRoute('/_shell/infrastructure')({ component: Infrastructure })

const KINDS = [
  { id: 'Pod', label: 'Pods' },
  { id: 'Deployment', label: 'Deployments' },
  { id: 'Service', label: 'Services' },
  { id: 'Node', label: 'Nodes' },
]

type Row = ResourceRow & { id: string }

function statusToPip(status: string): Status {
  switch (status) {
    case 'Running':
    case 'Ready':
    case 'Succeeded':
      return 'healthy'
    case 'Pending':
    case 'NotReady':
      return 'warning'
    case 'Failed':
    case 'CrashLoopBackOff':
    case 'OOMKilled':
      return 'danger'
    default:
      return 'neutral'
  }
}

function age(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function columnsFor(kind: string): Column<Row>[] {
  const nameCol: Column<Row> = {
    key: 'name',
    label: 'Name',
    mono: true,
    render: (r) => (
      <span className="flex items-center gap-1.5">
        <StatusPip status={statusToPip(r.status)} />
        <span>{r.name}</span>
      </span>
    ),
  }
  const ageCol: Column<Row> = { key: 'age', label: 'Age', align: 'right', mono: true, render: (r) => age(r.createdAt) }

  switch (kind) {
    case 'Pod':
      return [
        nameCol,
        { key: 'namespace', label: 'Namespace', mono: true },
        { key: 'ready', label: 'Ready', align: 'right', mono: true, render: (r) => r.extra?.ready ?? '' },
        { key: 'restarts', label: 'Restarts', align: 'right', mono: true, render: (r) => r.extra?.restarts ?? '0' },
        { key: 'node', label: 'Node', mono: true, render: (r) => r.extra?.node ?? '' },
        { key: 'status', label: 'Status', render: (r) => <Badge tone="neutral">{r.status}</Badge> },
        ageCol,
      ]
    case 'Deployment':
      return [
        nameCol,
        { key: 'namespace', label: 'Namespace', mono: true },
        { key: 'ready', label: 'Ready', align: 'right', mono: true, render: (r) => r.extra?.ready ?? '' },
        { key: 'status', label: 'Status', render: (r) => <Badge tone="neutral">{r.status}</Badge> },
        ageCol,
      ]
    case 'Service':
      return [
        nameCol,
        { key: 'namespace', label: 'Namespace', mono: true },
        { key: 'type', label: 'Type', render: (r) => <Badge tone="outline">{r.status}</Badge> },
        { key: 'clusterIP', label: 'Cluster IP', mono: true, render: (r) => r.extra?.clusterIP ?? '' },
        { key: 'ports', label: 'Ports', mono: true, render: (r) => r.extra?.ports ?? '' },
        ageCol,
      ]
    case 'Node':
      return [
        nameCol,
        { key: 'version', label: 'Version', mono: true, render: (r) => r.extra?.version ?? '' },
        { key: 'status', label: 'Status', render: (r) => <Badge tone="neutral">{r.status}</Badge> },
        ageCol,
      ]
    default:
      return [nameCol, ageCol]
  }
}

function Infrastructure() {
  const [clusters, setClusters] = React.useState<ClusterSummary[]>([])
  const [clustersLoaded, setClustersLoaded] = React.useState(false)
  const [kind, setKind] = React.useState('Pod')
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    listClusters()
      .then(setClusters)
      .catch(() => setClusters([]))
      .finally(() => setClustersLoaded(true))
  }, [])

  const cluster = clusters.find((c) => c.connected)

  const refresh = React.useCallback(() => {
    if (!cluster) return
    setLoading(true)
    setError(null)
    listResources(cluster.id, kind)
      .then((result) => {
        if (result.error) {
          setError(result.error)
          setRows([])
        } else {
          setRows(result.resources.map((r) => ({ ...r, id: `${r.namespace ?? ''}/${r.name}` })))
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [cluster, kind])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  if (clustersLoaded && !cluster) {
    return (
      <EmptyState
        title="No clusters connected"
        description="Register a cluster and run the agent to browse its resources here."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <Tabs items={KINDS} value={kind} onChange={setKind} />
        <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={refresh} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error ? (
        <EmptyState compact title="Couldn't load resources" description={error} />
      ) : (
        <ResourceTable
          columns={columnsFor(kind)}
          rows={rows}
          loading={loading}
          caption={cluster ? `${rows.length} ${kind.toLowerCase()}${rows.length === 1 ? '' : 's'} in ${cluster.name}` : undefined}
        />
      )}
    </div>
  )
}
