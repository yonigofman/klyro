import { createFileRoute, Link } from '@tanstack/react-router'
import { QueryState } from '#/components/shared/QueryState'
import { ResourceDetailLayout, DetailSection } from '#/components/shared/ResourceDetailLayout'
import { ManifestSection } from '#/components/shared/ManifestSection'
import { ResourceEventsSection } from '#/components/shared/ResourceEventsSection'
import { useServiceDetail, useServiceManifest } from '#/features/clusters/queries'

export const Route = createFileRoute('/clusters/$clusterId/services/$namespace/$name')({
  component: () => {
    const params = Route.useParams()
    return <ServiceDetailPage {...params} />
  },
})

export function ServiceDetailPage({
  clusterId,
  namespace,
  name,
}: {
  clusterId: string
  namespace: string
  name: string
}) {
  const serviceQuery = useServiceDetail(clusterId, namespace, name)

  return (
    <QueryState
      query={serviceQuery}
      loadingLabel="Loading service…"
      notFoundLabel="This Service no longer exists."
    >
      {(service) => (
        <ResourceDetailLayout
          kind="Service"
          name={service.name}
          namespace={service.namespace}
          createdAt={service.createdAt}
          backHref="/"
          clusterId={clusterId}
        >
          <DetailSection title="Overview">
            <dl className="grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Type</dt>
                <dd className="text-foreground">{service.type}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Cluster IP</dt>
                <dd className="tabular-nums text-foreground">{service.clusterIP || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Ports</dt>
                <dd className="tabular-nums text-foreground">
                  {service.ports.length > 0 ? service.ports.join(', ') : '—'}
                </dd>
              </div>
            </dl>
          </DetailSection>

          <DetailSection title="Selector">
            {Object.keys(service.selector ?? {}).length === 0 ? (
              <p className="text-sm text-muted-foreground">No selector — not backed by Pods.</p>
            ) : (
              <ul className="flex flex-col gap-1 font-mono text-sm text-muted-foreground">
                {Object.entries(service.selector ?? {}).map(([key, value]) => (
                  <li key={key}>
                    {key}={value}
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>

          <DetailSection title="Endpoints">
            {service.endpoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">No endpoints — no matching Pods are ready.</p>
            ) : (
              <ul className="flex flex-col gap-1 font-mono text-sm">
                {service.endpoints.map((endpoint) => (
                  <li key={endpoint.podName}>
                    <Link
                      to="/clusters/$clusterId/pods/$namespace/$name"
                      params={{ clusterId, namespace, name: endpoint.podName }}
                      className="text-foreground hover:underline"
                    >
                      {endpoint.podName}
                    </Link>
                    <span className="ml-2 tabular-nums text-muted-foreground">{endpoint.ip}</span>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>

          <DetailSection title="Events">
            <ResourceEventsSection
              clusterId={clusterId}
              namespace={namespace}
              kind="Service"
              name={service.name}
            />
          </DetailSection>

          <ManifestSection
            useManifest={(enabled) => useServiceManifest(clusterId, namespace, name, enabled)}
          />
        </ResourceDetailLayout>
      )}
    </QueryState>
  )
}
