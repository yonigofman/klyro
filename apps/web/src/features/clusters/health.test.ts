import { describe, expect, it } from 'vitest'
import { conditionHealth, rolloutHealth } from './health'

describe('conditionHealth', () => {
  it('treats True as healthy for an ordinary condition like Ready', () => {
    expect(conditionHealth('Ready', 'True')).toBe('green')
    expect(conditionHealth('Ready', 'False')).toBe('red')
  })

  it('inverts pressure/unavailable conditions, where False is healthy', () => {
    expect(conditionHealth('MemoryPressure', 'False')).toBe('green')
    expect(conditionHealth('MemoryPressure', 'True')).toBe('red')
    expect(conditionHealth('DiskPressure', 'False')).toBe('green')
    expect(conditionHealth('PIDPressure', 'False')).toBe('green')
    expect(conditionHealth('NetworkUnavailable', 'False')).toBe('green')
  })

  it('treats an unrecognized status as amber', () => {
    expect(conditionHealth('Ready', 'Unknown')).toBe('amber')
  })
})

describe('rolloutHealth', () => {
  it('is green when ready meets or exceeds desired', () => {
    expect(rolloutHealth(3, 3)).toBe('green')
    expect(rolloutHealth(0, 0)).toBe('green')
  })

  it('is amber when partially ready', () => {
    expect(rolloutHealth(1, 3)).toBe('amber')
  })

  it('is red when nothing is ready but something is desired', () => {
    expect(rolloutHealth(0, 3)).toBe('red')
  })
})
