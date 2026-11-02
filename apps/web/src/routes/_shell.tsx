import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'

import { AppShell } from '#/components/ui/app-shell'
import { Breadcrumbs } from '#/components/ui/breadcrumbs'
import { Sidebar } from '#/components/ui/sidebar'
import { TopBar } from '#/components/ui/top-bar'

export const Route = createFileRoute('/_shell')({ component: ShellLayout })

const LABELS: Record<string, string> = {
  overview: 'Overview',
  'ai-workspace': 'AI Workspace',
  infrastructure: 'Infrastructure',
  observability: 'Observability',
  operations: 'Operations',
  clusters: 'Clusters',
  settings: 'Settings',
}

function activeIdFor(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  return segments.length > 0 ? segments[0] : 'overview'
}

function ShellLayout() {
  const location = useLocation()
  const active = activeIdFor(location.pathname)
  const label = LABELS[active] ?? active

  return (
    <AppShell
      sidebar={<Sidebar active={active} user={{ name: 'Jordan Lee', email: 'jordan@klyro.dev' }} />}
      topbar={<TopBar left={<Breadcrumbs items={[{ label }]} />} />}
    >
      <Outlet />
    </AppShell>
  )
}
