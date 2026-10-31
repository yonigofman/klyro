import { createFileRoute } from '@tanstack/react-router'
import { ClusterDashboard } from '#/features/clusters/components/ClusterDashboard'

export const Route = createFileRoute('/')({ component: ClusterDashboard })
