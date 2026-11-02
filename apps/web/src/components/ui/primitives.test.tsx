import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Button } from './button'
import { Badge } from './badge'
import { StatusPip } from './status-pip'

describe('Button', () => {
  it('renders children and a kbd hint', () => {
    render(<Button kbd="⌘K">Approve &amp; run</Button>)
    expect(screen.getByRole('button', { name: /approve & run/i })).toBeInTheDocument()
    expect(screen.getByText('⌘K')).toBeInTheDocument()
  })

  it('disables itself while loading', () => {
    render(<Button loading>Scale up</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('Badge', () => {
  it('renders its tone and label', () => {
    render(<Badge tone="danger">CrashLoopBackOff</Badge>)
    expect(screen.getByText('CrashLoopBackOff')).toBeInTheDocument()
  })
})

describe('StatusPip', () => {
  it('exposes status via an accessible label when given one', () => {
    render(<StatusPip status="danger" label="CrashLoopBackOff" />)
    expect(screen.getByRole('img', { name: 'CrashLoopBackOff' })).toBeInTheDocument()
  })
})
