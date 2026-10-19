import { describe, expect, it } from 'vitest'
import { indexFromScroll, photoAlt, slideLabel, wrapIndex } from '../carousel'

describe('carousel index', () => {
  it('wraps both ways', () => {
    expect(wrapIndex(0, 5)).toBe(0)
    expect(wrapIndex(5, 5)).toBe(0)
    expect(wrapIndex(-1, 5)).toBe(4)
    expect(wrapIndex(-6, 5)).toBe(4)
    expect(wrapIndex(7, 5)).toBe(2)
  })
  it('is 0 for an empty carousel', () => {
    expect(wrapIndex(3, 0)).toBe(0)
  })
  it('turns a scroll position into a slide, clamped', () => {
    expect(indexFromScroll(0, 320, 4)).toBe(0)
    expect(indexFromScroll(150, 320, 4)).toBe(0)
    expect(indexFromScroll(170, 320, 4)).toBe(1)
    expect(indexFromScroll(960, 320, 4)).toBe(3)
    expect(indexFromScroll(5000, 320, 4)).toBe(3)
    expect(indexFromScroll(-20, 320, 4)).toBe(0)
    expect(indexFromScroll(100, 0, 4)).toBe(0)
  })
})

describe('carousel text', () => {
  it('alt text is 樹種，攝影：name', () => {
    expect(photoAlt('榕樹', { by: 'Kiwi Shen' })).toBe('榕樹，攝影：Kiwi Shen')
  })
  it('slide label', () => {
    expect(slideLabel(0, 5)).toBe('第 1 張，共 5 張')
    expect(slideLabel(4, 5)).toBe('第 5 張，共 5 張')
  })
})
