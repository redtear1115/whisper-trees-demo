import { describe, expect, it } from 'vitest'
import { angleDiff } from '../heading'

describe('angleDiff', () => {
  it('takes the short way round', () => {
    expect(angleDiff(350, 10)).toBe(20)
    expect(angleDiff(10, 350)).toBe(20)
    expect(angleDiff(-20, 340)).toBe(0)
    expect(angleDiff(0, 180)).toBe(180)
  })
})
