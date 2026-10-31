import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FlipValue } from './FlipValue'

describe('FlipValue', () => {
  it('renders its content synchronously, with no placeholder gap', () => {
    render(<FlipValue watch="green">Healthy</FlipValue>)
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })

  it('keeps showing the latest content when watch changes', () => {
    const { rerender } = render(<FlipValue watch="green">Healthy</FlipValue>)
    expect(screen.getByText('Healthy')).toBeInTheDocument()

    rerender(<FlipValue watch="red">Down</FlipValue>)

    expect(screen.getByText('Down')).toBeInTheDocument()
    expect(screen.queryByText('Healthy')).not.toBeInTheDocument()
  })

  it('does not remount (or re-flip) when watch stays the same', () => {
    const { rerender } = render(<FlipValue watch="green">Healthy</FlipValue>)
    const firstNode = screen.getByText('Healthy')

    rerender(<FlipValue watch="green">Healthy</FlipValue>)

    expect(screen.getByText('Healthy')).toBe(firstNode)
  })
})
