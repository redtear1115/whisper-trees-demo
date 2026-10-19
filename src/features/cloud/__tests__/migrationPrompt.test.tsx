import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const session: { migration: unknown } = { migration: null }
vi.mock('../../../store', () => ({
  useSession: () => session,
  migrateToCloud: vi.fn(),
}))
vi.mock('../../../store/migrate', () => ({ declineMigration: vi.fn() }))

import { MigrationPrompt } from '../Banners'

const summary = { wishes: 2, reports: 0, checkins: 5, progress: true, whispers: 3 }

describe('遷移提示（不是對話框）', () => {
  it('沒有要搬的紀錄就什麼都不畫', () => {
    session.migration = null
    expect(renderToStaticMarkup(<MigrationPrompt />)).toBe('')
  })

  it('是小卡：不是 modal、不鎖背景、沒有全螢幕遮罩', () => {
    session.migration = { summary, running: false }
    const html = renderToStaticMarkup(<MigrationPrompt />)
    expect(html).not.toContain('role="dialog"')
    expect(html).not.toContain('aria-modal')
    expect(html).not.toContain('modal-back')
    expect(html).toContain('data-testid="migrate-banner"')
    expect(html).toContain('aria-labelledby="mig-title"')
  })

  it('內容與動作不變：摘要、樹洞勾選、存到雲端、先不要', () => {
    session.migration = { summary, running: false }
    const html = renderToStaticMarkup(<MigrationPrompt />)
    expect(html).toContain('把這台裝置上的紀錄存到雲端？')
    expect(html).toContain('2 個許願')
    expect(html).toContain('5 次打卡')
    expect(html).toContain('光點與造型')
    expect(html).toContain('3 則樹洞')
    expect(html).toContain('存到雲端')
    expect(html).toContain('先不要')
  })

  it('沒有樹洞就沒有勾選；存放中按鈕停用並改字；錯誤要顯示', () => {
    session.migration = { summary: { ...summary, whispers: 0 }, running: true, error: '網路不穩' }
    const html = renderToStaticMarkup(<MigrationPrompt />)
    expect(html).not.toContain('checkbox')
    expect(html).toContain('存放中…')
    expect(html.match(/disabled/g)?.length).toBe(2)
    expect(html).toContain('網路不穩')
  })
})
