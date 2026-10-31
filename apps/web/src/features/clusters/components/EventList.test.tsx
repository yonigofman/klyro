import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { EventSummary } from '@klyro/api-client'
import { EventList } from './EventList'

function event(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    type: 'Normal',
    reason: 'Scheduled',
    message: 'scheduled',
    involvedObjectKind: 'Pod',
    involvedObjectName: 'web-1',
    namespace: 'default',
    count: 1,
    lastSeen: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('EventList', () => {
  it('shows Namespace and Object columns by default (full variant)', () => {
    render(<EventList events={[event()]} />)

    expect(screen.getByText('Namespace')).toBeInTheDocument()
    expect(screen.getByText('Object')).toBeInTheDocument()
    expect(screen.getByText('Pod/web-1')).toBeInTheDocument()
  })

  it('drops Namespace and Object columns in compact variant', () => {
    render(<EventList events={[event()]} variant="compact" />)

    expect(screen.queryByText('Namespace')).not.toBeInTheDocument()
    expect(screen.queryByText('Object')).not.toBeInTheDocument()
    expect(screen.queryByText('Pod/web-1')).not.toBeInTheDocument()
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
  })
})
