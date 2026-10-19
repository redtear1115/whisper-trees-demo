import { describe, expect, it } from 'vitest'
import { tabKeyTarget } from '../tabsKeys'

describe('tabKeyTarget', () => {
  it('arrow keys move one step and wrap around', () => {
    expect(tabKeyTarget('ArrowRight', 0, 2)).toBe(1)
    expect(tabKeyTarget('ArrowRight', 1, 2)).toBe(0)
    expect(tabKeyTarget('ArrowLeft', 0, 2)).toBe(1)
    expect(tabKeyTarget('ArrowLeft', 2, 3)).toBe(1)
  })
  it('Home and End jump to the ends', () => {
    expect(tabKeyTarget('Home', 2, 3)).toBe(0)
    expect(tabKeyTarget('End', 0, 3)).toBe(2)
  })
  it('other keys are not handled', () => {
    expect(tabKeyTarget('Enter', 0, 2)).toBeNull()
    expect(tabKeyTarget('a', 0, 2)).toBeNull()
    expect(tabKeyTarget('Tab', 0, 2)).toBeNull()
    expect(tabKeyTarget('ArrowDown', 0, 2)).toBeNull()
  })
  it('no tabs, no target', () => {
    expect(tabKeyTarget('ArrowRight', 0, 0)).toBeNull()
  })
})
