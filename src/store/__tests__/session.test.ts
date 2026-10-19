import { afterEach, describe, expect, it, vi } from 'vitest'
import { setSession, whenUserReady } from '../session'

describe('whenUserReady', () => {
  afterEach(() => {
    vi.useRealTimers()
    setSession({ userReady: true })
  })

  it('resolves at once when the user doc is already loaded', async () => {
    setSession({ userReady: true })
    await expect(whenUserReady()).resolves.toBe(true)
  })

  it('waits for the user doc, then resolves true', async () => {
    setSession({ userReady: false })
    const p = whenUserReady(1000)
    setSession({ userReady: true })
    await expect(p).resolves.toBe(true)
  })

  it('gives up after the timeout and resolves false', async () => {
    vi.useFakeTimers()
    setSession({ userReady: false })
    const p = whenUserReady(500)
    vi.advanceTimersByTime(500)
    await expect(p).resolves.toBe(false)
  })
})
