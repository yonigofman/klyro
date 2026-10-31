import { createFileRoute, Link } from '@tanstack/react-router'
import type { IngressRuleDetail } from '@klyro/api-client'
import { QueryState } from '#/components/shared/QueryState'
import { ResourceDetailLayout, DetailSection } from '#/components/shared/ResourceDetailLayout'
import { ResourceTable  } from '#/components/shared/ResourceTable'
import type {ResourceTableColumn} from '#/components/shared/ResourceTable';
import { ManifestSection } from '#/components/shared/ManifestSection'
import { ResourceEventsSection } from '#/components/shared/ResourceEventsSection'
import { useIngressDetail, useIngressManifest } from '#/features/clusters/queries'

export const Route = createFileRoute('/clusters/$clusterId/ingresses/$namespace/$name')({
  component: () => {
    const params = Route.useParams()
    return <IngressDetailPage {...params} />
  },
})

export function IngressDetailPage({
  clusterId,
  namespace,
  name,
}: {
  clusterId: string
  namespace: string
  name: string
}) {
  const ingressQuery = useIngressDetail(clusterId, namespace, name)

  // Backend Services referenced by an Ingress rule are assumed to live in
  // the same namespace as the Ingress — true for standard Ingress backends
  // (see issue #6's Implementation Decisions).
  const ruleColumns: ResourceTableColumn<IngressRuleDetail>[] = [
    { header: 'Host', cellClassName: 'font-mono font-medium text-foreground', render: (r) => r.host || '*' },
    { header: 'Path', cellClassName: 'font-mono text-sm text-muted-foreground', render: (r) => r.path || '/' },
    {
      header: 'Service',
      cellClassName: 'font-mono text-sm text-muted-foreground',
      render: (r) => (
        <Link
          to="/clusters/$clusterId/services/$namespace/$name"
          params={{ clusterId, namespace, name: r.serviceName }}
          className="hover:underline"
        >
          {r.serviceName}:{r.servicePort}
        </Link>
      ),
    },
  ]

  return (
    <QueryState
      query={ingressQuery}
      loadingLabel="Loading ingress…"
      notFoundLabel="This Ingress no longer exists."
    >
      {(ingress) => (
        <ResourceDetailLayout
          kind="Ingress"
          name={ingress.name}
          namespace={ingress.namespace}
          createdAt={ingress.createdAt}
          backHref="/"
          clusterId={clusterId}
        >
          <DetailSection title="Backend rules">
            {ingress.rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No backend rules configured.</p>
            ) : (
              <ResourceTable
                rows={ingress.rules}
                rowKey={(rule, index) => `${rule.host}/${rule.path}/${index}`}
                columns={ruleColumns}
              />
            )}
          </DetailSection>

          <DetailSection title="TLS">
            {ingress.tlsHosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No TLS configured.</p>
            ) : (
              <ul className="flex flex-col gap-1 font-mono text-sm text-muted-foreground">
                {ingress.tlsHosts.map((host) => (
                  <li key={host}>{host}</li>
                ))}
              </ul>
            )}
          </DetailSection>

          <DetailSection title="Events">
            <ResourceEventsSection
              clusterId={clusterId}
              namespace={namespace}
              kind="Ingress"
              name={ingress.name}
            />
          </DetailSection>

          <ManifestSection
            useManifest={(enabled) => useIngressManifest(clusterId, namespace, name, enabled)}
          />
        </ResourceDetailLayout>
      )}
    </QueryState>
  )
}
