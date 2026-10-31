import { createFileRoute, Link } from '@tanstack/react-router'
import type { WorkloadKind } from '@klyro/api-client'
import { QueryState } from '#/components/shared/QueryState'
import { ResourceDetailLayout, DetailSection } from '#/components/shared/ResourceDetailLayout'
import { ManifestSection } from '#/components/shared/ManifestSection'
import { ResourceEventsSection } from '#/components/shared/ResourceEventsSection'
import { useWorkloadDetail, useWorkloadManifest } from '#/features/clusters/queries'

export const Route = createFileRoute(
  '/clusters/$clusterId/workloads/$namespace/$kind/$name',
)({
  component: () => {
    const params = Route.useParams()
    return <WorkloadDetailPage {...params} kind={params.kind as WorkloadKind} />
  },
})

export function WorkloadDetailPage({
  clusterId,
  namespace,
  kind,
  name,
}: {
  clusterId: string
  namespace: string
  kind: WorkloadKind
  name: string
}) {
  const workloadQuery = useWorkloadDetail(clusterId, namespace, kind, name)

  return (
    <QueryState
      query={workloadQuery}
      loadingLabel="Loading workload…"
      notFoundLabel="This workload no longer exists."
    >
      {(workload) => (
        <ResourceDetailLayout
          kind={workload.kind}
          name={workload.name}
          namespace={workload.namespace}
          createdAt={workload.createdAt}
          backHref="/"
          clusterId={clusterId}
        >
          <DetailSection title="Rollout">
            <dl className="grid grid-cols-2 gap-2 font-mono text-sm text-muted-foreground sm:grid-cols-4">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Desired</dt>
                <dd className="tabular-nums text-foreground">{workload.desired}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Ready</dt>
                <dd className="tabular-nums text-foreground">{workload.ready}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Update strategy</dt>
                <dd className="text-foreground">{workload.updateStrategy || '—'}</dd>
              </div>
            </dl>
          </DetailSection>

          <DetailSection title="Pods">
            {workload.podNames.length === 0 ? (
              <p className="text-sm text-muted-foreground">No Pods owned by this workload.</p>
            ) : (
              <ul className="flex flex-col gap-1 font-mono text-sm">
                {workload.podNames.map((podName) => (
                  <li key={podName}>
                    <Link
                      to="/clusters/$clusterId/pods/$namespace/$name"
                      params={{ clusterId, namespace, name: podName }}
                      className="text-foreground hover:underline"
                    >
                      {podName}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>

          <DetailSection title="Events">
            <ResourceEventsSection
              clusterId={clusterId}
              namespace={namespace}
              kind={workload.kind}
              name={workload.name}
            />
          </DetailSection>

          <ManifestSection
            useManifest={(enabled) => useWorkloadManifest(clusterId, namespace, kind, name, enabled)}
          />
        </ResourceDetailLayout>
      )}
    </QueryState>
  )
}
