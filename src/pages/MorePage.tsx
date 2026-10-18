import { Link } from 'react-router-dom'
import { Card } from '../components/ui'
import { resetAll } from '../store'

export default function MorePage() {
  return (
    <div className="page">
      <header className="topbar">
        <Link className="btn ghost" to="/">
          ← 地圖
        </Link>
        <span className="topbar-title">更多</span>
      </header>

      <h2 className="section-title">市民</h2>
      <Card>
        <Link className="menu-link" to="/wishes">
          我的許願
        </Link>
      </Card>

      <h2 className="section-title">後台（示範）</h2>
      <Card>
        <Link className="menu-link" to="/gov">
          政府端：補種優先排序
        </Link>
      </Card>

      <h2 className="section-title">Demo 工具</h2>
      <Card>
        <Link className="menu-link" to="/?demo=1">
          開啟 Demo 模式（模擬定位）
        </Link>
        <button
          className="menu-link danger"
          onClick={() => {
            if (confirm('清除這台裝置上的所有曦語資料？')) resetAll()
          }}
        >
          清除本機資料
        </button>
      </Card>
      <p className="muted small">
        樹籍資料為臺北市政府 2026-10-16 開放資料；許願、澆水、微光人數、案件進度為模擬資料，見 README。
      </p>
    </div>
  )
}
