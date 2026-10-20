import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { TAIPEI_DISTRICTS, type Checkin } from '../../../store/types'
import type { Village } from '../../../lib/villages'
import { stampBook } from '../../game/districts'
import { WAITING_INVITATION, asDistrict, homeSummaryText, isWaiting, selectedDistrict, splitUntouched, stampCountText, villageCountText, villageUntouched } from '../home'
import { TIER_TONES, toneOf } from '../colors'
import { KEEP_MAP_PX, fitDelta, revealDelta } from '../reveal'
import { DistrictCard } from '../DistrictCard'

const ck = (i: number): Checkin => ({ treeId: `DA${String(i).padStart(10, '0')}`, result: 'success', at: 1_700_000_000_000 + i })

describe('home district', () => {
  it('accepts only the 12 real district names', () => {
    for (const d of TAIPEI_DISTRICTS) expect(asDistrict(d)).toBe(d)
    expect(asDistrict(undefined)).toBeNull()
    expect(asDistrict('其他')).toBeNull()
    expect(asDistrict('大安')).toBeNull()
    expect(asDistrict(42)).toBeNull()
  })

  it('the atlas opens on the home district; nothing set keeps the blank city', () => {
    expect(selectedDistrict(null, '大安區')).toBe('大安區')
    expect(selectedDistrict(null, undefined)).toBeNull()
    expect(selectedDistrict(null, 'garbage')).toBeNull()
  })

  it('a district the user tapped wins over the home district', () => {
    expect(selectedDistrict('信義區', '大安區')).toBe('信義區')
  })
})

describe('home summary line', () => {
  it('says how many trees, or that the district is still a blank sheet', () => {
    expect(homeSummaryText('大安區', 3)).toBe('我的區：大安區・3 棵')
    expect(homeSummaryText('文山區', 0)).toBe('我的區：文山區・還是一張白紙')
  })
})

describe('untouched wording', () => {
  it('the legend and the district label say 還沒走過, not 未開始', () => {
    expect(TIER_TONES[0].name).toBe('還沒走過')
    expect(toneOf(null).name).toBe('還沒走過')
    expect(TIER_TONES.map((t) => t.name)).not.toContain('未開始')
  })

  it('a stamped district card still says its tier', () => {
    const book = stampBook([ck(1)])
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DistrictCard b={book.find((x) => x.district === '大安區')!} light={undefined} onEnter={() => {}} />
      </MemoryRouter>,
    )
    expect(html).toContain('鐵章')
    expect(html).not.toContain('未開始')
  })
})

describe('zero state of a district', () => {
  const book = stampBook([])
  const bookWith = stampBook([ck(1), ck(2)])
  const da = (b: typeof book) => b.find((x) => x.district === '大安區')!

  it('waiting means no distinct tree yet', () => {
    expect(isWaiting(da(book))).toBe(true)
    expect(isWaiting(da(bookWith))).toBe(false)
    expect(isWaiting(undefined)).toBe(false)
  })

  it('an empty district shows the invitation, the scan action and the village map, not six zeros', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DistrictCard b={da(book)} light={undefined} onEnter={() => {}} />
      </MemoryRouter>,
    )
    expect(html).toContain(WAITING_INVITATION)
    expect(html).toContain('這一區還是一張白紙。走到任何一棵樹旁掃樹牌，就會蓋上第一個章。')
    expect(html).toContain('data-waiting="true"')
    expect(html).toContain('href="/scan"')
    expect(html).toContain('去掃樹牌')
    expect(html).toContain('進入里地圖')
    expect(html).not.toContain('district-count')
    expect(html).not.toContain('district-light-total')
    expect(html).not.toContain('未開始')
    expect(html).not.toContain('還沒有章')
  })

  it('a district with a stamp keeps the numbers', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DistrictCard b={da(bookWith)} light={undefined} onEnter={() => {}} />
      </MemoryRouter>,
    )
    expect(html).toContain('district-count')
    expect(html).not.toContain('data-waiting')
  })
})

describe('untouched villages', () => {
  const v = (id: string, name: string, total: number): Village => ({ id, name, total, bbox: [0, 0, 1, 1], geometry: { type: 'Polygon', coordinates: [] } }) as Village

  it('helpers: no 0／N for untouched, no-tree villages still say so', () => {
    expect(villageUntouched(v('a', 'A里', 100), 0)).toBe(true)
    expect(villageUntouched(v('a', 'A里', 100), 3)).toBe(false)
    expect(villageUntouched(v('b', 'B里', 0), 0)).toBe(false)
    expect(villageCountText(v('a', 'A里', 100), 0)).toBe('')
    expect(villageCountText(v('a', 'A里', 100), 3)).toBe('3／100 棵')
    expect(villageCountText(v('b', 'B里', 0), 0)).toBe('沒有樹木資料')
  })
})

describe('village list split', () => {
  it('walked villages up front, untouched ones collapse, no-data villages are neither walked nor untouched; order unchanged', () => {
    const rows = [
      { village: { total: 100 }, lit: 5, id: 'a' },
      { village: { total: 100 }, lit: 0, id: 'b' },
      { village: { total: 0 }, lit: 0, id: 'c' },
      { village: { total: 50 }, lit: 0, id: 'd' },
    ]
    const { active, untouched, noData } = splitUntouched(rows)
    expect(active.map((r) => r.id)).toEqual(['a'])
    expect(untouched.map((r) => r.id)).toEqual(['b', 'd'])
    expect(noData.map((r) => r.id)).toEqual(['c'])
    expect(splitUntouched([]).untouched).toEqual([])
  })
})

describe('stamp count text', () => {
  it('is merged into the home summary; none yet means nothing to show', () => {
    expect(stampCountText(0)).toBe('')
    expect(stampCountText(3)).toBe('已集 3 枚章')
  })
})

describe('fitDelta (看我的區)', () => {
  const band = { topEdge: 50, bottomEdge: 540 }
  it('does nothing when the whole card is already between the edges', () => {
    expect(fitDelta({ cardTop: 100, cardBottom: 400, ...band })).toBe(0)
  })
  it('scrolls down until the card bottom clears the nav and the raised scan button', () => {
    expect(fitDelta({ cardTop: 519, cardBottom: 773, ...band })).toBe(233)
    // after scrolling, the card ends exactly at the bottom edge and still starts below the top edge
    expect(519 - 233).toBeGreaterThanOrEqual(band.topEdge)
  })
  it('scrolls back up when the card top is under the top bar', () => {
    expect(fitDelta({ cardTop: 10, cardBottom: 200, ...band })).toBe(-40)
  })
  it('a card taller than the band lines up its top, so the heading and main button come first', () => {
    expect(fitDelta({ cardTop: 400, cardBottom: 1000, ...band })).toBe(350)
  })
})

describe('reveal scroll', () => {
  it('does not scroll when the card header is already visible', () => {
    expect(revealDelta({ headingBottom: 500, viewBottom: 700, anchorBottom: 400 })).toBe(0)
  })

  it('scrolls just enough to show the header row', () => {
    expect(revealDelta({ headingBottom: 760, viewBottom: 700, anchorBottom: 600 })).toBe(60)
  })

  it('never scrolls the map’s lower edge out of view', () => {
    const d = revealDelta({ headingBottom: 1400, viewBottom: 700, anchorBottom: 300 })
    expect(300 - d).toBeGreaterThanOrEqual(KEEP_MAP_PX)
    expect(revealDelta({ headingBottom: 1400, viewBottom: 700, anchorBottom: 30 })).toBe(0)
  })
})
