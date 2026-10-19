import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { InsectList } from '../InsectSection'

const render = (insects: Parameters<typeof InsectList>[0]['insects'] = {}) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <InsectList insects={insects} />
    </MemoryRouter>,
  )

describe('圖鑑：樹上住戶', () => {
  it('還沒遇見：三個都是虛線剪影，標「模擬」', () => {
    const html = render()
    expect(html).toContain('樹上住戶')
    expect(html).toContain('模擬')
    expect(html.match(/data-testid="insect-unseen"/g)).toHaveLength(3)
    expect(html).not.toContain('insect-seen')
    for (const n of ['瓢蟲', '獨角仙', '蟬']) expect(html).toContain(n)
    expect(html).toContain('還沒有遇見，不用急')
  })
  it('遇見的顯示第一次的日期與樹的連結，其餘維持剪影', () => {
    const html = render({ beetle: { treeId: 'DT0162080001', at: new Date('2026-10-19T12:00:00+08:00').getTime() } })
    expect(html.match(/data-testid="insect-seen"/g)).toHaveLength(1)
    expect(html.match(/data-testid="insect-unseen"/g)).toHaveLength(2)
    expect(html).toContain('/tree/DT0162080001')
    expect(html).toContain('10月19日')
    expect(html).toContain('遇見了 1 位')
  })
})
