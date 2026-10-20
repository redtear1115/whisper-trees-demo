import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import AboutPage from '../../../pages/AboutPage'
import { TEAM } from '../about'

const html = renderToStaticMarkup(
  <MemoryRouter>
    <AboutPage />
  </MemoryRouter>,
)

describe('關於曦語', () => {
  it('團隊 6 位，圓形徽章的字是 愛 R M 佳 薄 克', () => {
    expect(TEAM).toHaveLength(6)
    expect(TEAM.map((m) => m.initial)).toEqual(['愛', 'R', 'M', '佳', '薄', '克'])
    expect(html.match(/data-testid="team-member"/g)).toHaveLength(6)
    for (const m of TEAM) {
      expect(html).toContain(m.name)
      expect(html).toContain(m.title.replace('&', '&amp;'))
    }
  })
  it('名字、品牌精神與雙向含義', () => {
    expect(html).toContain('「曦」是清晨第一道陽光，音近「細語」：白天走到樹下，輕聲說心事。')
    expect(html).toContain('xī yǔ')
    expect(html).toContain('曦光細語，蘊憩身心')
    expect(html).toContain('Trees that whisper')
    expect(html).toContain('Trees you whisper to')
    for (const s of ['慢下來', '無壓陪伴', '共好城市']) expect(html).toContain(s)
    expect(html).toContain('6 位隊員・設計 2・工程 3・計畫管理 1')
    expect(html).toContain('台北市政 Debug 松・題目 #1 把樹種回來')
  })
  it('返回「我的」，沒有聯絡方式', () => {
    expect(html).toContain('href="/me"')
    expect(html).not.toMatch(/@|mailto:|tel:|https?:\/\//)
  })
})
