import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { Tree } from '../../../lib/trees'
import { ReportBox } from '../ReportBox'

// 把 Link 換成會把 to 與 state 印出來的 <a>：靜態輸出看不到 router state
vi.mock('react-router-dom', async (orig) => {
  const mod = await orig<typeof import('react-router-dom')>()
  return {
    ...mod,
    Link: ({ to, state, children, ...rest }: { to: string; state?: unknown; children: React.ReactNode }) => (
      <a href={to} data-state={JSON.stringify(state ?? null)} {...rest}>
        {children}
      </a>
    ),
  }
})

// useSession 用 useSyncExternalStore，沒有 getServerSnapshot，靜態輸出會丟錯
vi.mock('../../../store', async (orig) => ({
  ...(await orig<typeof import('../../../store')>()),
  useSession: () => ({ backend: 'local' }),
}))

const tree: Tree = {
  id: 'DA0030211045-001',
  lngLat: [121.54, 25.03],
  species: '茄苳',
  diameter: 30,
  height: 8,
  place: '信義路三段',
  remark: '',
  kind: 'street',
  surveyDate: '',
  district: '大安區',
}

const html = (onSite: boolean) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <ReportBox tree={tree} onSite={onSite} />
    </MemoryRouter>,
  )

describe('ReportBox off site', () => {
  it('ends in a 去掃樹牌 link (secondary; the page keeps one primary) to /scan instead of text only', () => {
    const out = html(false)
    expect(out).toContain('data-testid="report-scan"')
    expect(out).toContain('href="/scan"')
    expect(out).toContain(`data-state="${JSON.stringify({ hintTreeId: tree.id, openCard: 'report' }).replace(/"/g, '&quot;')}"`)
    expect(out).toContain('去掃樹牌')
    expect(out).toMatch(/class="btn block report-scan"/)
    expect(out).not.toContain('回報問題')
  })
  it('on site there is the report form entry, not the scan link', () => {
    const out = html(true)
    expect(out).toContain('回報問題')
    expect(out).not.toContain('report-scan')
  })
})
