import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { exitDemoMode, isDemoMode, resetAll, signOutAccount, useSession, useStore } from '../../store'
import { MockTag } from '../../components/ui'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { externalBrowserUrl, inAppBrowser, useAuth } from '../../lib/firebase'
import { homeDistrictOf, onboarding, patchOnboarding, useOnboarding } from '../game/onboarding'
import { reopenPatch } from '../onboarding/tour'
import { useGoogleLink } from '../onboarding/useGoogleLink'
import { DistrictPicker } from '../onboarding/DistrictPicker'
import { balance, useEarned } from '../game/ledger'
import { stageOf } from '../game/character'
import { badges } from '../game/badges'

/** 要確認的動作：登出、離開 Demo、刪除雲端資料、清除本機資料 */
type Ask = 'signout' | 'exitDemo' | 'wipe' | null

/** 我的區（2026-10-21 critique 從頂部的卡移來）：決定集章冊預設打開哪一區 */
function DistrictRow() {
  const district = homeDistrictOf(useOnboarding())
  const [open, setOpen] = useState(false)
  const boxId = useId()
  const box = useRef<HTMLDivElement>(null)
  // 展開後把目前選的那格捲進看得到的範圍；底部導覽中間凸起的掃樹牌鈕會蓋住最下面一截，
  // 所以格子帶 scroll-margin-bottom（導覽高 + 40 px，見 index.css）。
  useEffect(() => {
    if (!open) return
    const target = box.current?.querySelector<HTMLElement>('.district-chip.on') ?? box.current
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    target?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [open])
  return (
    <div className="me-district" data-testid="me-district" data-value={district ?? ''}>
      <button
        type="button"
        className="menu-link me-district-row"
        aria-expanded={open}
        aria-controls={boxId}
        onClick={() => setOpen((v) => !v)}
        data-testid="swap-district"
      >
        <span>
          <span>
            我的區：<strong>{district ?? '還沒選'}</strong>
          </span>
          <span className="muted small me-district-why">集章冊先打開這一區</span>
        </span>
        <span className="me-district-act">{open ? '收起' : district ? '換一區' : '選一區'}</span>
      </button>
      <div id={boxId} ref={box} className="me-district-box" hidden={!open}>
        {open && <DistrictPicker name="me-district" where="me" />}
      </div>
    </div>
  )
}

/** 帳號：訪客 / 已用 Google 保留。Google 綁定要在 click 事件裡同步呼叫（見 linkGoogle）。 */
function AccountBlock({ onSignOut }: { onSignOut: () => void }) {
  const auth = useAuth()
  const { msg, link } = useGoogleLink()
  const app = inAppBrowser()

  return (
    <div className="me-account" data-testid="me-account">
      <p>
        目前：
        <strong>
          {auth.status !== 'ready' ? '連線中…' : auth.google ? '已用 Google 保留（不顯示 email）' : '訪客'}
        </strong>
      </p>
      {auth.status === 'ready' && !auth.google && (
        <p className="muted small">訪客的紀錄存在這個瀏覽器的雲端帳號；清掉瀏覽器資料就找不回來。</p>
      )}
      {auth.status === 'ready' &&
        !auth.google &&
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
        <button className="btn" onClick={onSignOut}>
          登出
        </button>
      )}
      {msg && (
        <p className="small" role="status">
          {msg}
        </p>
      )}
    </div>
  )
}

/** /me 最下面的安靜一區：新手引導、帳號、Demo 工具、資料說明；刪除資料的紅字放在這一區的最後 */
export function SettingsSection() {
  const cloud = useSession().backend === 'cloud'
  const navigate = useNavigate()
  const [ask, setAsk] = useState<Ask>(null)
  const earned = useEarned()
  const points = useStore((s) => balance(s))
  const badgeCount = useStore((s) => badges(s).filter((b) => b.earned).length)
  const whisperCount = useStore((s) => Object.values(s.whispers).reduce((n, l) => n + l.filter((w) => !w.mock).length, 0))
  const { stage: cur } = stageOf(earned)
  const stage = cur.name
  const stageIsFirst = cur.min === 0
  const close = () => setAsk(null)
  return (
    <section className="me-settings" aria-labelledby="me-settings-title" data-testid="me-settings">
      <h2 id="me-settings-title" className="me-settings-title">
        設定與其他
      </h2>
      <div className="me-settings-list">
        <DistrictRow />

        <button
          className="menu-link"
          data-testid="reopen-tour"
          onClick={() => {
            patchOnboarding(reopenPatch(onboarding()))
            navigate('/')
          }}
        >
          新手引導：收集光點、加到主畫面
        </button>

        {cloud && <AccountBlock onSignOut={() => setAsk('signout')} />}

        <Link className="menu-link" to="/about" data-testid="about-link">
          關於曦語
        </Link>

        {isDemoMode() ? (
          <button className="menu-link" onClick={() => setAsk('exitDemo')}>
            離開 Demo 模式（目前：模擬定位）
          </button>
        ) : (
          <Link className="menu-link" to="/?demo=1">
            開啟 Demo 模式（模擬定位）
          </Link>
        )}

        <p className="muted small me-data-note">
          樹籍資料為臺北市政府 2026-10-16 開放資料。<MockTag />{' '}
          小芽、光點與徽章（存在你的裝置上）、許願、澆水、微光人數、案件進度，都是示範用的模擬資料。
        </p>

        <button className="menu-link danger" onClick={() => setAsk('wipe')}>
          {cloud ? '刪除我的雲端資料並登出' : '清除本機資料'}
        </button>
      </div>

      {ask === 'signout' && (
        <ConfirmDialog
          title="登出？"
          lines={['這台裝置會回到新的訪客身分。', '你的紀錄還在雲端，再用 Google 登入就找得回來。']}
          confirmLabel="登出"
          onCancel={close}
          onConfirm={() => {
            close()
            signOutAccount()
          }}
        />
      )}
      {ask === 'exitDemo' && (
        <ConfirmDialog
          title="離開 Demo 模式？"
          lines={['之後會用你真實的 GPS 位置，要走到樹旁才能打卡。', '想再試玩，可以從這裡重新開啟。']}
          confirmLabel="離開 Demo"
          onCancel={close}
          onConfirm={() => {
            close()
            exitDemoMode()
            location.href = import.meta.env.BASE_URL
          }}
        />
      )}
      {ask === 'wipe' && (
        <ConfirmDialog
          title={cloud ? '刪除你的雲端資料並登出？' : '清除這台裝置上的曦語資料？'}
          lines={[
            earned <= 0
              ? '小芽、光點與徽章都會回到一開始。'
              : stageIsFirst
                ? `小芽的成長、${points} 光點、${badgeCount} 枚徽章都會歸零。`
                : `小芽會從${stage}回到初心樹精，${points} 光點、${badgeCount} 枚徽章都會歸零。`,
            whisperCount > 0 ? `你在樹洞留的 ${whisperCount} 句話會刪掉。` : '打卡、心情與日記也會清掉。',
            ...(cloud ? ['你送出的許願、澆水和回報會保留。'] : []),
            <strong key="undo">這無法復原。</strong>,
          ]}
          confirmLabel={cloud ? '刪除並登出' : '清除'}
          danger
          onCancel={close}
          onConfirm={() => {
            close()
            resetAll()
          }}
        />
      )}
    </section>
  )
}
