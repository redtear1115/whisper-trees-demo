import { describe, expect, it } from 'vitest'
import { authRetryDelay, CONNECTION_TEXT, connectionAfter, PROBE_FIRST_MS, PROBE_MAX_MS, probeResultOf, QUOTA_RETRY_MS, retryDelay, unavailableStep } from '../unavailable'

describe('unavailableStep（寬限到期時）', () => {
  it('in the background: wait until the page is visible again (timers freeze there)', () => {
    expect(unavailableStep({ hidden: true })).toBe('wait-visible')
  })
  it('visible: always ask the server (navigator.onLine can be wrong)', () => {
    expect(unavailableStep({ hidden: false })).toBe('probe')
  })
})

describe('probe result → connection status', () => {
  it('maps Firestore codes', () => {
    expect(probeResultOf(undefined)).toBe('ok')
    expect(probeResultOf('permission-denied')).toBe('ok')
    expect(probeResultOf('unavailable')).toBe('unreachable')
    expect(probeResultOf('deadline-exceeded')).toBe('unreachable')
    expect(probeResultOf('resource-exhausted')).toBe('exhausted')
  })
  it('never falls back to local mode: only shows a status', () => {
    expect(connectionAfter('ok')).toBe('ok')
    expect(connectionAfter('unreachable')).toBe('reconnecting')
    expect(connectionAfter('unreachable', false)).toBe('offline')
    expect(connectionAfter('ok', false)).toBe('ok')
    expect(connectionAfter('exhausted')).toBe('quota')
  })
})

describe('retry timing', () => {
  it('backs off from 8 s by ×1.5 up to 30 s, forever', () => {
    expect(retryDelay(1)).toBe(PROBE_FIRST_MS)
    expect(retryDelay(2)).toBe(12_000)
    expect(retryDelay(3)).toBe(18_000)
    expect(retryDelay(10)).toBe(PROBE_MAX_MS)
    expect(retryDelay(1, 'exhausted')).toBe(QUOTA_RETRY_MS)
  })
  it('sign-in retries from 1.5 s doubling up to 30 s, and never gives up', () => {
    expect([0, 1, 2, 3, 4, 5, 20].map(authRetryDelay)).toEqual([1_500, 3_000, 6_000, 12_000, 24_000, 30_000, 30_000])
  })
  it('every non-ok status has a calm sentence', () => {
    for (const t of Object.values(CONNECTION_TEXT)) expect(t.length).toBeGreaterThan(5)
    expect(CONNECTION_TEXT.reconnecting).toContain('重新連線')
  })
})
