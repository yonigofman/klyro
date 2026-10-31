import { createFileRoute } from '@tanstack/react-router'
import type { ContainerDetail } from '@klyro/api-client'
import { QueryState } from '#/components/shared/QueryState'
import { ResourceDetailLayout, DetailSection } from '#/components/shared/ResourceDetailLayout'
import { ResourceTable } from '#/components/shared/ResourceTable'
import type { ResourceTableColumn } from '#/components/shared/ResourceTable'
import { ManifestSection } from '#/components/shared/ManifestSection'
import { ResourceEventsSection } from '#/components/shared/ResourceEventsSection'
import { usePodDetail, usePodManifest } from '#/features/clusters/queries'

export const Route = createFileRoute('/clusters/$clusterId/pods/$namespace/$name')({
  component: () => {
    const params = Route.useParams()
    return <PodDetailPage {...params} />
  },
})

const containerColumns: ResourceTableColumn<ContainerDetail>[] = [
  { header: 'Name', cellClassName: 'font-mono font-medium text-foreground', render: (c) => c.name },
  { header: 'Image', cellClassName: 'font-mono text-sm text-muted-foreground', render: (c) => c.image },
  {
    header: 'Ready',
    cellClassName: 'font-mono text-sm uppercase text-muted-foreground',
    render: (c) => (c.ready ? 'Ready' : 'Not Ready'),
  },
  {
    header: 'Restarts',
    cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
    render: (c) => c.restartCount,
  },
  {
    header: 'CPU (req/limit)',
    cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
    render: (c) => `${c.cpuRequest || '—'} / ${c.cpuLimit || '—'}`,
  },
  {
    header: 'Memory (req/limit)',
    cellClassName: 'font-mono text-sm tabular-nums text-muted-foreground',
    render: (c) => `${c.memoryRequest || '—'} / ${c.memoryLimit || '—'}`,
  },
]

export function PodDetailPage({
  clusterId,
  namespace,
  name,
}: {
  clusterId: string
  namespace: string
  name: string
}) {
  const podQuery = usePodDetail(clusterId, namespace, name)

  return (
    <QueryState
      query={podQuery}
      loadingLabel="Loading pod…"
      notFoundLabel="This Pod no longer exists."
    >
      {(pod) => (
        <ResourceDetailLayout
          kind="Pod"
          name={pod.name}
          namespace={pod.namespace}
          createdAt={pod.createdAt}
          backHref="/"
          clusterId={clusterId}
        >
          <DetailSection title="Containers">
            <ResourceTable
              rows={pod.containers}
              rowKey={(container) => container.name}
              columns={containerColumns}
            />
          </DetailSection>

          <DetailSection title="Conditions">
            {pod.conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conditions reported.</p>
            ) : (
              <ul className="flex flex-col gap-1 font-mono text-sm text-muted-foreground">
                {pod.conditions.map((condition) => (
                  <li key={condition.type}>
                    {condition.type}: {condition.status}
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>

          <DetailSection title="Events">
            <ResourceEventsSection
              clusterId={clusterId}
              namespace={namespace}
              kind="Pod"
              name={pod.name}
            />
          </DetailSection>

          <ManifestSection
            useManifest={(enabled) => usePodManifest(clusterId, namespace, name, enabled)}
          />
        </ResourceDetailLayout>
      )}
    </QueryState>
  )
}
