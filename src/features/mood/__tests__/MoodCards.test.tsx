import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { MoodPrompt, MoodResponse } from '../MoodCards'
import { MoodRowView } from '../MoodRow'
import { MOODS, moodById } from '../mood'

const render = (el: React.ReactElement) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>)

describe('打卡後的詢問卡', () => {
  const html = render(<MoodPrompt />)
  it('標題「現在的心情？」，七個選項是 radiogroup 裡的 radio，每個都有 emoji 與名稱', () => {
    expect(html).toContain('現在的心情？')
    expect(html).toContain('role="radiogroup"')
    expect(html.match(/type="radio"/g)).toHaveLength(7)
    for (const m of MOODS) {
      expect(html).toContain(m.emoji)
      expect(html).toContain(m.name)
    }
  })
  it('有清楚的「略過」，沒選前「就這個」是停用的', () => {
    expect(html).toContain('略過')
    expect(html).toMatch(/disabled=""[^>]*data-testid="mood-confirm"|data-testid="mood-confirm"[^>]*disabled=""/)
  })
  it('說清楚只有自己看得到，沒有光點或評價的字眼', () => {
    expect(html).toContain('只有你自己看得到')
    expect(html).not.toContain('光點 +')
    expect(html).not.toMatch(/不好|不開心|怎麼了/)
  })
})

describe('選好之後的回應卡', () => {
  it('每種心情都寫出森林的回應、光與姿態，並標「建議」互動', () => {
    for (const m of MOODS) {
      const out = render(<MoodResponse mood={m} />)
      expect(out).toContain(m.response.replace(/"/g, '&quot;'))
      expect(out).toContain(m.light)
      expect(out).toContain('建議')
    }
  })
  it('不用評價心情的話；emoji 不出現在回應卡（臉部留白）', () => {
    const out = render(<MoodResponse mood={moodById('sad')!} />)
    expect(out).not.toContain('😢')
    expect(out).not.toMatch(/心情不好|不要難過/)
  })
  it('回應卡不能換心情，只指路到「我的」', () => {
    const out = render(<MoodResponse mood={moodById('calm')!} />)
    expect(out).not.toContain('type="radio"')
    expect(out).toContain('href="/me"')
  })
})

describe('我的：心情列', () => {
  it('沒選過：一行安靜的邀請，按鈕是「選心情」，沒有清除', () => {
    const out = render(<MoodRowView state={{}} />)
    expect(out).toContain('還沒選心情')
    expect(out).toContain('選心情')
    expect(out).not.toContain('換心情')
    expect(out).toContain('data-value=""')
  })
  it('選過：顯示 emoji、名稱與相對時間，按鈕是「換心情」', () => {
    const out = render(<MoodRowView state={{ current: { id: 'happy', at: Date.now() - 2 * 3_600_000 } }} />)
    expect(out).toContain('😊')
    expect(out).toContain('開心')
    expect(out).toContain('2 小時前')
    expect(out).toContain('換心情')
    expect(out).toContain('data-value="happy"')
  })
})

describe('我的：心情列的其他狀態', () => {
  it('清除過（current 是 null）或存了不認得的心情，都當作沒選', () => {
    expect(render(<MoodRowView state={{ current: null, askedAt: 1 }} />)).toContain('還沒選心情')
    expect(render(<MoodRowView state={{ current: { id: 'bored', at: 1 } }} />)).toContain('還沒選心情')
  })
})
