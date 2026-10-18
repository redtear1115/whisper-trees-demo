import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import jpeg from 'jpeg-js'
import { BinaryBitmap, DecodeHintType, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from '@zxing/library'
import { parseTreeId } from '../treeId'

describe('parseTreeId', () => {
  it.each([
    ['http://trees.gov.taipei/show/?treeid=SL0560111023', 'SL0560111023'],
    ['https://trees.gov.taipei/show/?treeid=SY0030551077', 'SY0030551077'],
    ['SL0560111023', 'SL0560111023'],
    ['http://trees.gov.taipei/show/?treeid=SL0174321005-001', 'SL0174321005-001'],
    ['樹籍 sl0174321005-001 測試', 'SL0174321005-001'],
    ['https://example.com/?a=1', null],
    ['asdf;lkj 123', null],
    ['', null],
  ])('%s → %s', (raw, want) => {
    expect(parseTreeId(raw)).toBe(want)
  })
})

describe('real tree tag photo', () => {
  it('zxing decodes material/samples/tree-tag-SL0560111023.jpg', () => {
    const img = jpeg.decode(readFileSync('material/samples/tree-tag-SL0560111023.jpg'), { useTArray: true })
    const lum = new Uint8ClampedArray(img.width * img.height)
    for (let i = 0; i < lum.length; i++) {
      const r = img.data[i * 4], g = img.data[i * 4 + 1], b = img.data[i * 4 + 2]
      lum[i] = (r * 299 + g * 587 + b * 114) / 1000
    }
    const source = new RGBLuminanceSource(lum, img.width, img.height)
    const hints = new Map([[DecodeHintType.TRY_HARDER, true]])
    const text = new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(source)), hints).getText()
    expect(parseTreeId(text)).toBe('SL0560111023')
  })
})
