import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { MoodAsk, MoodLine } from '../MoodCards'
import { MoodRowView } from '../MoodRow'
import { MOODS } from '../mood'

const noop = () => {}
const render = (el: React.ReactElement) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>)

describe('互動後的心情列', () => {
  const html = render(<MoodAsk selected={null} onPick={noop} onClear={noop} />)
  it('標題「現在的心情？」加「可以不選」，七個選項是 aria-pressed 的按鈕（不是 radio），每個有 emoji 與名稱', () => {
    expect(html).toContain('現在的心情？')
    expect(html).toContain('可以不選')
    expect(html).not.toContain('type="radio"')
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(7)
    for (const m of MOODS) {
      expect(html).toContain(m.emoji)
      expect(html).toContain(m.name)
    }
  })
  it('沒有「就這個」「略過」、沒有「建議」，也沒有光點或評價的字眼', () => {
    expect(html).not.toMatch(/就這個|略過|建議|還在規劃|你的光/)
    expect(html).not.toContain('光點 +')
    expect(html).not.toMatch(/不好|不開心|怎麼了/)
  })
  it('沒選時沒有回應那一句', () => {
    expect(html).not.toContain('data-testid="mood-response"')
    expect(html).toContain('data-value=""')
  })
  it('選了：那個按鈕 aria-pressed、有勾（實心樣式 .on），其他不是；只出現一句回應', () => {
    const out = render(<MoodAsk selected="tired" onPick={noop} onClear={noop} />)
    expect(out.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(out).toMatch(/class="mood-chip on"[^>]*aria-pressed="true"/)
    expect(out).toContain('mood-chip-check') // 勾
    expect(out.match(/data-testid="mood-response"/g)).toHaveLength(1)
    expect(out).toContain('樹蔭在你身邊大了一點，坐一下也可以。')
    expect(out).toContain('data-value="tired"')
  })
})

describe('森林的回應：一句，沒有「你的光」也沒有建議', () => {
  it('每種心情都寫出自己的那一句，不顯示光與姿態', () => {
    for (const m of MOODS) {
      const out = render(<MoodAsk selected={m.id} onPick={noop} onClear={noop} />)
      expect(out).toContain(m.response.replace(/"/g, '&quot;'))
      expect(out).not.toContain(m.light)
      expect(out).not.toMatch(/你的光|建議/)
    }
  })
  it('回應那一句沒有 emoji（臉部留白，emoji 只在選擇的按鈕上）', () => {
    const out = render(<MoodLine id="sad" />)
    expect(out).not.toContain('😢')
    expect(out).not.toMatch(/心情不好|不要難過/)
  })
  it('只有焦慮的那一句有呼吸圓點（aria-hidden）', () => {
    expect(render(<MoodLine id="anxious" />)).toContain('breath-dot')
    for (const m of MOODS.filter((x) => x.id !== 'anxious')) expect(render(<MoodLine id={m.id} />)).not.toContain('breath-dot')
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
  it('選過：顯示名稱與相對時間（這一列沒有 emoji，emoji 只在選擇器裡），按鈕是「換心情」', () => {
    const out = render(<MoodRowView state={{ current: { id: 'happy', at: Date.now() - 2 * 3_600_000 } }} />)
    expect(out).not.toContain('😊')
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
