import type { NamespaceSummary } from '@klyro/api-client'
import {
  selectedNamespaceFor,
  useNamespaceFilterStore,
} from '#/features/clusters/namespace-filter-store'

export function NamespaceFilter({
  clusterId,
  namespaces,
}: {
  clusterId: string
  namespaces: NamespaceSummary[]
}) {
  const selectedNamespace = useNamespaceFilterStore(
    selectedNamespaceFor(clusterId),
  )
  const selectNamespace = useNamespaceFilterStore(
    (state) => state.selectNamespace,
  )

  return (
    <select
      aria-label="Filter by namespace"
      value={selectedNamespace ?? ''}
      onChange={(event) =>
        selectNamespace(clusterId, event.target.value || null)
      }
      className="h-8 rounded-md border border-input bg-background px-2 font-mono text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <option value="">All namespaces</option>
      {namespaces.map((ns) => (
        <option key={ns.name} value={ns.name}>
          {ns.status === 'Active' ? ns.name : `${ns.name} (${ns.status})`}
        </option>
      ))}
    </select>
  )
}
