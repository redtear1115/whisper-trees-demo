import { Link } from 'react-router-dom'
import { Card } from '../components/ui'
import { IconBack } from '../components/icons'

/** 示範後台入口：評審與承辦人用，不在市民端的導覽裡（從「我的」最下方的小連結進來）。 */
export default function DemoControlPage() {
  return (
    <div className="page">
      <header className="topbar">
        <Link className="btn ghost back" to="/me">
          <IconBack /> 我的
        </Link>
        <h1 className="topbar-title">示範後台</h1>
      </header>
      <p className="muted small">
        這些是桌機用的後台（政府端、發包商、遊戲營運、開放資料 API），手機也能開。後台寫入限白名單 Google 帳號；其他人看到的是「示範：只在這台裝置」，改動只留在自己的裝置，不會影響別人。
      </p>
      <Card>
        <Link className="menu-link" to="/gov">
          政府端：補種優先排序、樹況回報
        </Link>
        <Link className="menu-link" to="/vendor">
          發包商後台：補種與養護工單
        </Link>
        <Link className="menu-link" to="/gm">
          遊戲營運後台（GM）：活動、光點規則、客服
        </Link>
        <Link className="menu-link" to="/developers">
          開放資料 API
        </Link>
      </Card>
    </div>
  )
}
