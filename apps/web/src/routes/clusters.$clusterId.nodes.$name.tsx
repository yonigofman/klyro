import { createFileRoute } from '@tanstack/react-router'
import { QueryState } from '#/components/shared/QueryState'
import { ResourceDetailLayout, DetailSection } from '#/components/shared/ResourceDetailLayout'
import { ManifestSection } from '#/components/shared/ManifestSection'
import { ResourceEventsSection } from '#/components/shared/ResourceEventsSection'
import { Dot } from '#/components/shared/Dot'
import { conditionHealth, readyHealth } from '#/features/clusters/health'
import { useNodeDetail, useNodeManifest } from '#/features/clusters/queries'

export const Route = createFileRoute('/clusters/$clusterId/nodes/$name')({
  component: () => {
    const params = Route.useParams()
    return <NodeDetailPage {...params} />
  },
})

export function NodeDetailPage({ clusterId, name }: { clusterId: string; name: string }) {
  const nodeQuery = useNodeDetail(clusterId, name)

  return (
    <QueryState
      query={nodeQuery}
      loadingLabel="Loading node…"
      notFoundLabel="This Node no longer exists."
    >
      {(node) => (
        <ResourceDetailLayout
          kind="Node"
          name={node.name}
          createdAt={node.createdAt}
          backHref="/"
          clusterId={clusterId}
          health={readyHealth(node.ready)}
        >
          <DetailSection title="Overview">
            <dl className="grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Ready</dt>
                <dd className="inline-flex items-center gap-2 text-foreground">
                  <Dot health={readyHealth(node.ready)} />
                  {node.ready ? 'Ready' : 'Not Ready'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Version</dt>
                <dd className="tabular-nums text-foreground">{node.kubernetesVersion || '—'}</dd>
              </div>
            </dl>
          </DetailSection>

          <DetailSection title="Capacity / Allocatable">
            <dl className="grid grid-cols-2 gap-2 font-mono text-sm tabular-nums text-muted-foreground sm:grid-cols-4">
              {Object.entries(node.capacity).map(([resourceName, value]) => (
                <div key={resourceName}>
                  <dt className="text-xs uppercase text-muted-foreground">{resourceName}</dt>
                  <dd className="text-foreground">
                    {value} / {node.allocatable[resourceName]}
                  </dd>
                </div>
              ))}
            </dl>
          </DetailSection>

          <DetailSection title="Conditions">
            {node.conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conditions reported.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 font-mono text-sm text-muted-foreground">
                {node.conditions.map((condition) => (
                  <li key={condition.type} className="inline-flex items-center gap-2">
                    <Dot health={conditionHealth(condition.type, condition.status)} />
                    {condition.type}: {condition.status}
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>

          <DetailSection title="Taints">
            {node.taints.length === 0 ? (
              <p className="text-sm text-muted-foreground">No taints.</p>
            ) : (
              <ul className="flex flex-col gap-1 font-mono text-sm text-muted-foreground">
                {node.taints.map((taint) => (
                  <li key={`${taint.key}-${taint.effect}`}>
                    {taint.key}={taint.value}:{taint.effect}
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>

          <DetailSection title="Events">
            {/* Nodes are Cluster-scoped, but Events about them are
                Namespace-scoped (CONTEXT.md) — fetch across all namespaces
                and filter by name. */}
            <ResourceEventsSection clusterId={clusterId} namespace="" kind="Node" name={node.name} />
          </DetailSection>

          <ManifestSection useManifest={(enabled) => useNodeManifest(clusterId, name, enabled)} />
        </ResourceDetailLayout>
      )}
    </QueryState>
  )
}
