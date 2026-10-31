import { createFileRoute } from '@tanstack/react-router'
import { QueryState } from '#/components/shared/QueryState'
import { ResourceDetailLayout, DetailSection } from '#/components/shared/ResourceDetailLayout'
import { useNodeDetail } from '#/features/clusters/queries'

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
        >
          <DetailSection title="Overview">
            <dl className="grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Ready</dt>
                <dd className="text-foreground">{node.ready ? 'Ready' : 'Not Ready'}</dd>
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
              <ul className="flex flex-col gap-1 font-mono text-sm text-muted-foreground">
                {node.conditions.map((condition) => (
                  <li key={condition.type}>
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
        </ResourceDetailLayout>
      )}
    </QueryState>
  )
}
