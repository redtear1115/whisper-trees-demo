import { Link, Navigate } from 'react-router-dom'
import { Card } from '../components/ui'
import { exitDemoMode, isDemoMode } from '../store'

/** 切換台上的一個去處 */
interface Stop {
  to: string
  label: string
  note: string
}

const CITIZEN: Stop[] = [
  { to: '/', label: '首頁地圖', note: '人物、感應範圍、點樹的行動圈、掃樹牌' },
  { to: '/stamps', label: '集章冊', note: '全市 → 區 → 里，建議路線；探索分頁有迷霧、新手任務、圖鑑' },

  { to: '/journal', label: '樹洞', note: '我的日記、我的許願、附近的樹' },
  { to: '/me', label: '我的', note: '小芽、光點、徽章、設定' },
]

const BACK_OFFICE: Stop[] = [
  { to: '/gov', label: '政府端', note: '補種優先排序、案件狀態、樹況回報、API 用戶端' },
  { to: '/vendor', label: '發包商後台', note: '補種與養護工單、我的 API 用戶端' },
  { to: '/gm', label: '遊戲營運（GM）', note: '活動、光點規則、商店、客服' },
  { to: '/developers', label: '開放 API', note: 'OAuth 授權、端點文件、試打、MCP' },
]

/**
 * Demo 切換台：只在 Demo 模式（?demo=1）出現，在市民端與各後台之間切換。
 * 獨立頁面，市民端不放入口；不是 Demo 模式就回首頁。
 */
export default function DemoControlPage() {
  if (!isDemoMode()) return <Navigate to="/" replace />
  return (
    <div className="page demo-control">
      <header className="topbar">
        <h1 className="topbar-title">Demo 切換台</h1>
      </header>
      <p className="muted small">
        在市民端和各後台之間切換。市民端在電腦上也維持手機寬度、用模擬定位。後台寫入限白名單 Google 帳號；其他人看到的是「示範：只在這台裝置」，改動只留在自己的裝置，不會影響別人。
      </p>

      <h2 className="section-title">市民端（手機版）</h2>
      <StopList stops={CITIZEN} testid="demo-citizen" />

      <h2 className="section-title">後台</h2>
      <StopList stops={BACK_OFFICE} testid="demo-back-office" />

      <button
        className="btn block demo-exit"
        data-testid="demo-exit"
        onClick={() => {
          if (!confirm('離開 Demo 模式？之後會用你真實的 GPS 位置。')) return
          exitDemoMode()
          location.href = import.meta.env.BASE_URL
        }}
      >
        離開 Demo 模式
      </button>
    </div>
  )
}

function StopList({ stops, testid }: { stops: Stop[]; testid: string }) {
  return (
    <Card>
      <ul className="demo-stops" data-testid={testid}>
        {stops.map((s) => (
          <li key={s.to}>
            <Link className="menu-link" to={s.to}>
              <span className="demo-stop-label">{s.label}</span>
              <span className="muted small">{s.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
