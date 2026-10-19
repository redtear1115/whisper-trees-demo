import { Link, useNavigate } from 'react-router-dom'
import { Card } from '../components/ui'
import { exitDemoMode, isDemoMode, resetAll, signOutAccount, useSession } from '../store'
import { externalBrowserUrl, inAppBrowser, useAuth } from '../lib/firebase'
import { onboarding, patchOnboarding } from '../features/game/onboarding'
import { reopenPatch } from '../features/onboarding/tour'
import { useGoogleLink } from '../features/onboarding/useGoogleLink'
import { IconBack } from '../components/icons'

/** 帳號：訪客 / 已用 Google 保留。Google 綁定要在 click 事件裡同步呼叫（見 linkGoogle）。 */
function AccountCard() {
  const auth = useAuth()
  const { msg, link } = useGoogleLink()
  const app = inAppBrowser()

  return (
    <>
      <h2 className="section-title">帳號</h2>
      <Card>
        <p>
          目前：<strong>{auth.status !== 'ready' ? '連線中…' : auth.google ? '已用 Google 保留（不顯示 email）' : '訪客'}</strong>
        </p>
        {auth.status === 'ready' && !auth.google && (
          <p className="muted small">訪客的紀錄存在這個瀏覽器的雲端帳號；清掉瀏覽器資料就找不回來。</p>
        )}
        {auth.status === 'ready' && !auth.google &&
          (app ? (
            <p className="small" role="note">
              請用 Safari／Chrome 開啟，才能用 Google 保留紀錄。
              {app === 'line' && (
                <>
                  {' '}
                  <a href={externalBrowserUrl()}>用瀏覽器開啟</a>
                </>
              )}
            </p>
          ) : (
            <button className="btn primary" onClick={link}>
              用 Google 保留紀錄
            </button>
          ))}
        {auth.google && (
          <button
            className="btn"
            onClick={() => {
              if (confirm('登出後，這台裝置會回到新的訪客身分。你的紀錄還在雲端，再用 Google 登入就找得回來。')) signOutAccount()
            }}
          >
            登出
          </button>
        )}
        {msg && (
          <p className="small" role="status">
            {msg}
          </p>
        )}
      </Card>
    </>
  )
}

export default function MorePage() {
  const cloud = useSession().backend === 'cloud'
  const navigate = useNavigate()
  return (
    <div className="page">
      <header className="topbar">
        <Link className="btn ghost back" to="/">
          <IconBack /> 地圖
        </Link>
        <h1 className="topbar-title">選單</h1>
      </header>

      <h2 className="section-title">市民</h2>
      <Card>
        <Link className="menu-link" to="/wishes">
          我的許願
        </Link>
        <Link className="menu-link" to="/me">
          我的小芽：光點、徽章、換裝
        </Link>
        <Link className="menu-link" to="/shop">
          商店
        </Link>
        <Link className="menu-link" to="/codex">
          樹的圖鑑
        </Link>
        <button
          className="menu-link"
          onClick={() => {
            patchOnboarding(reopenPatch(onboarding()))
            navigate('/')
          }}
        >
          新手引導：收集光點、加到主畫面
        </button>
      </Card>

      {cloud && <AccountCard />}

      <h2 className="section-title">後台（示範）</h2>
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

      <h2 className="section-title">Demo 工具</h2>
      <Card>
        {isDemoMode() ? (
          <button
            className="menu-link"
            onClick={() => {
              if (!confirm('離開 Demo 模式？之後會用你真實的 GPS 位置。')) return
              exitDemoMode()
              location.href = import.meta.env.BASE_URL
            }}
          >
            離開 Demo 模式（目前：模擬定位）
          </button>
        ) : (
          <Link className="menu-link" to="/?demo=1">
            開啟 Demo 模式（模擬定位）
          </Link>
        )}
        <button
          className="menu-link danger"
          onClick={() => {
            const ok = cloud
              ? confirm('刪除你在雲端的樹洞與紀錄，然後登出？你送出的許願、澆水和回報會保留。這無法復原。')
              : confirm('清除這台裝置上的所有曦語資料？')
            if (ok) resetAll()
          }}
        >
          {cloud ? '刪除我的雲端資料並登出' : '清除本機資料'}
        </button>
      </Card>
      <p className="muted small">
        樹籍資料為臺北市政府 2026-10-16 開放資料；許願、澆水、微光人數、案件進度是示範用的模擬資料。
      </p>
    </div>
  )
}
