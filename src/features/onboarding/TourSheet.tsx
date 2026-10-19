import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Art } from '../../components/ui'
import { isDemoMode, useStore, useUserReady } from '../../store'
import { externalBrowserUrl, inAppBrowser, useAuth } from '../../lib/firebase'
import { CHECKIN } from '../../config'
import { useGameConfig } from '../game/config'
import { firstLightEarned, patchOnboarding, useOnboarding } from '../game/onboarding'
import { Celebration } from './Celebration'
import { promptInstall, useCanInstall } from './install'
import { installPlatform, isStandalone, STEP_CELEBRATE, STEP_DONE, STEP_HOME, STEP_INTRO, STEP_SCAN, tourView } from './tour'
import { useGoogleLink } from './useGoogleLink'

/** 地圖頁用：引導要不要開、在哪一步（開著但還沒存過步驟時，補存第 1 步） */
export function useTourView() {
  const ob = useOnboarding()
  const firstLight = useStore((s) => firstLightEarned(s))
  const ready = useUserReady()
  const view = tourView({ ob, firstLight, ready, demo: isDemoMode() })
  const init = view.open && view.needsInit
  useEffect(() => {
    if (init) patchOnboarding({ tourStep: STEP_INTRO })
  }, [init])
  return view
}

const go = (step: number) => patchOnboarding({ tourStep: step })
const dismiss = () => patchOnboarding({ tourDismissedAt: Date.now() })
const finish = () => patchOnboarding({ tourStep: STEP_DONE })

/** 「收集光點」新手引導：地圖下方的小抽屜，不擋住地圖操作，隨時可以「之後再說」 */
export function TourSheet({ step }: { step: number }) {
  return (
    <div
      className="sheet tour-sheet"
      role="dialog"
      aria-modal="false"
      aria-label="新手引導：收集光點"
      data-testid="tour-sheet"
      data-step={step}
    >
      <p className="tour-progress" aria-label={`第 ${step} 步，共 4 步`}>
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={n === step ? 'on' : n < step ? 'past' : ''} aria-hidden />
        ))}
      </p>
      {step === STEP_INTRO && <StepIntro />}
      {step === STEP_SCAN && <StepScan />}
      {step === STEP_CELEBRATE && <StepCelebrate />}
      {step === STEP_HOME && <StepHome />}
    </div>
  )
}

function Later() {
  return (
    <button className="btn ghost" onClick={dismiss}>
      之後再說
    </button>
  )
}

function StepIntro() {
  const cfg = useGameConfig()
  const p = cfg.points
  const rows: [string, string][] = [
    ['在樹旁打卡', `+${p.checkin}（白天再 +${p.sun}）`],
    ['遠觀模式打卡', `+${p.farView}`],
    ['在樹洞留一句話', `+${p.whisper}`],
    ['在空樹穴許願', `+${p.wish}`],
    ['幫別人的願望澆水', `+${p.water}`],
  ]
  return (
    <>
      <h2>收集光點</h2>
      <p>光點是你陪伴樹、幫城市做事留下的小光。只能在現場或幫城市得到，不能用錢買。</p>
      <table className="tour-table">
        <caption className="sr-only">怎麼得到光點</caption>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">光點可以換小芽的造型，也能捐給城市（示意）。</p>
      <div className="tour-actions">
        <button className="btn primary" onClick={() => go(STEP_SCAN)}>
          下一步
        </button>
        <Later />
      </div>
    </>
  )
}

function StepScan() {
  const demo = isDemoMode()
  return (
    <>
      <h2>去掃一張樹牌</h2>
      <p>找一棵行道樹，掃它樹幹上的樹牌 QR Code。到樹旁邊（GPS 約 {CHECKIN.nearMeters} 公尺內）就能打卡，拿到第一道光。</p>
      <details className="tour-details">
        <summary>附近沒有樹牌？</summary>
        {demo ? (
          <p className="small">你現在是 Demo 模式：掃描頁會用模擬定位，不用站在樹旁邊也能打卡。</p>
        ) : (
          <>
            <p className="small">
              可以開 Demo 模式：用模擬定位，不用站在樹旁邊也能打卡。想離開，到「選單 → Demo 工具」。
            </p>
            <a className="btn" href={`${import.meta.env.BASE_URL}?demo=1`}>
              開啟 Demo 模式
            </a>
          </>
        )}
      </details>
      <div className="tour-actions">
        <Link className="btn primary" to="/scan" onClick={() => go(STEP_SCAN)}>
          去掃樹牌
        </Link>
        <button className="btn" onClick={() => go(STEP_INTRO)}>
          上一步
        </button>
        <Later />
      </div>
    </>
  )
}

function StepCelebrate() {
  const giftAt = useOnboarding().giftAt
  return (
    <>
      <Celebration badgeId="first-light">
        <div className="tour-gift">
          <Art id="item-hat-straw" alt="草帽" />
          <p>
            <strong>新手禮：草帽</strong>
            <br />
            {giftAt ? '送你一頂，不花光點。到小芽換上看看。' : '正在放進你的背包…'}
          </p>
        </div>
      </Celebration>
      <div className="tour-actions">
        <Link className="btn" to="/me">
          到小芽換上
        </Link>
        <Link className="btn" to="/shop">
          逛商店
        </Link>
        <button className="btn primary" onClick={() => go(STEP_HOME)}>
          下一步：加到主畫面
        </button>
      </div>
    </>
  )
}

function StepHome() {
  const auth = useAuth()
  const { msg, link } = useGoogleLink()
  const canInstall = useCanInstall()
  const app = inAppBrowser()
  const platform = installPlatform(navigator.userAgent, app !== null, navigator.maxTouchPoints)
  const standalone = isStandalone()
  const askGoogle = auth.status === 'ready' && !auth.google

  return (
    <>
      <h2>加到手機主畫面</h2>
      {standalone ? (
        <p>你已經是從主畫面打開的了，下次直接點圖示就好。</p>
      ) : (
        <>
          <p>下次想找樹，點主畫面的圖示就能直接進來。</p>
          {askGoogle && (
            <div className="tour-note" data-testid="tour-google">
              <p className="small">
                <strong>建議先用 Google 保留紀錄。</strong>
                iPhone 從主畫面圖示打開，是和 Safari 分開的儲存空間，目前的訪客紀錄不會跟過去；兩邊登入同一個 Google 帳號就找得回來。
              </p>
              {app ? (
                <p className="small" role="note">
                  請用 Safari／Chrome 開啟，才能用 Google 保留紀錄。
                </p>
              ) : (
                <button className="btn" onClick={link}>
                  用 Google 保留紀錄
                </button>
              )}
              {msg && (
                <p className="small" role="status">
                  {msg}
                </p>
              )}
            </div>
          )}
          <InstallHelp platform={platform} canInstall={canInstall} appName={app} />
        </>
      )}
      <div className="tour-actions">
        <button className="btn primary" onClick={finish}>
          {standalone ? '完成' : '我加好了'}
        </button>
        <Later />
      </div>
    </>
  )
}

function InstallHelp({ platform, canInstall, appName }: { platform: ReturnType<typeof installPlatform>; canInstall: boolean; appName: ReturnType<typeof inAppBrowser> }) {
  if (platform === 'in-app')
    return (
      <div className="tour-note" role="note" data-testid="tour-install-in-app">
        <p className="small">
          你現在在 LINE／Facebook／Instagram 的內建瀏覽器，這裡加不到主畫面。請先用 Safari（iPhone）或 Chrome（Android）打開這個網址，再回來做這一步。
        </p>
        {appName === 'line' && (
          <a className="btn" href={externalBrowserUrl()}>
            用瀏覽器開啟
          </a>
        )}
      </div>
    )
  if (platform === 'ios-safari' || platform === 'ios-other')
    return (
      <ol className="tour-steps" data-testid="tour-install-ios">
        <li>點瀏覽器下方（或右上角）的「分享」按鈕。</li>
        <li>往下找「加入主畫面」。</li>
        <li>按右上角「新增」。</li>
        {platform === 'ios-other' && <li className="muted">找不到的話，請改用 Safari 打開這個網址。</li>}
      </ol>
    )
  if (platform === 'android')
    return canInstall ? (
      <button className="btn primary block" onClick={() => void promptInstall()} data-testid="tour-install-button">
        安裝到主畫面
      </button>
    ) : (
      <ol className="tour-steps" data-testid="tour-install-android">
        <li>點 Chrome 右上角的選單（⋮）。</li>
        <li>選「加到主畫面」或「安裝應用程式」。</li>
        <li>確認「新增」。</li>
      </ol>
    )
  return <p className="small muted">請用手機打開這個網址，再加到主畫面。</p>
}
