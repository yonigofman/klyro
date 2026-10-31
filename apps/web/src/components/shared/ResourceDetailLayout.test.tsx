import { beforeEach, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { ResourceDetailLayout } from './ResourceDetailLayout'
import { useClusterSelectionStore } from '#/features/clusters/selection-store'

beforeEach(() => {
  useClusterSelectionStore.setState({ selectedClusterId: null })
})

describe('ResourceDetailLayout', () => {
  it('selects the Cluster on mount, so the back-link reopens the right panel', () => {
    render(
      <ResourceDetailLayout
        kind="Pod"
        name="web-1"
        createdAt="2026-01-01T00:00:00Z"
        backHref="/"
        clusterId="c1"
      >
        <p>content</p>
      </ResourceDetailLayout>,
    )

    expect(useClusterSelectionStore.getState().selectedClusterId).toBe('c1')
  })
})
