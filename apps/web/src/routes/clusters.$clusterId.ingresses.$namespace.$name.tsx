import { createFileRoute } from '@tanstack/react-router'
import type { IngressRuleDetail } from '@klyro/api-client'
import { QueryState } from '#/components/shared/QueryState'
import { ResourceDetailLayout, DetailSection } from '#/components/shared/ResourceDetailLayout'
import { ResourceTable  } from '#/components/shared/ResourceTable'
import type {ResourceTableColumn} from '#/components/shared/ResourceTable';
import { useIngressDetail } from '#/features/clusters/queries'

export const Route = createFileRoute('/clusters/$clusterId/ingresses/$namespace/$name')({
  component: () => {
    const params = Route.useParams()
    return <IngressDetailPage {...params} />
  },
})

const ruleColumns: ResourceTableColumn<IngressRuleDetail>[] = [
  { header: 'Host', cellClassName: 'font-mono font-medium text-foreground', render: (r) => r.host || '*' },
  { header: 'Path', cellClassName: 'font-mono text-sm text-muted-foreground', render: (r) => r.path || '/' },
  {
    header: 'Service',
    cellClassName: 'font-mono text-sm text-muted-foreground',
    render: (r) => `${r.serviceName}:${r.servicePort}`,
  },
]

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
        </ResourceDetailLayout>
      )}
    </QueryState>
  )
}
