import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeSvgWriter } from '@zxing/browser'
import { Link } from 'react-router-dom'
import { Art } from '../../components/ui'
import { isDemoMode, useStore, useUserReady } from '../../store'
import { externalBrowserUrl, inAppBrowser, useAuth } from '../../lib/firebase'
import { CHECKIN } from '../../config'
import { pointRows, useGameConfig } from '../game/config'
import { firstLightEarned, homeDistrictOf, patchOnboarding, useOnboarding } from '../game/onboarding'
import { Celebration } from './Celebration'
import { promptInstall, useCanInstall } from './install'
import { defaultInstallGuide, installPlatform, isStandalone, type InstallGuide, STEP_ANIMAL, STEP_CELEBRATE, STEP_DONE, STEP_HOME, STEP_INTRO, STEP_SCAN, TOUR_DOTS, tourPosition, tourSub, tourView } from './tour'
import { useGoogleLink } from './useGoogleLink'
import { AnimalPicker } from '../avatar/AnimalPicker'
import { DistrictPicker } from './DistrictPicker'
import { useAnimal } from '../avatar/useAnimal'

/** 地圖頁用：引導要不要開、在哪一步（開著但還沒存過步驟時，補存第 0 步「選動物」） */
export function useTourView() {
  const ob = useOnboarding()
  const firstLight = useStore((s) => firstLightEarned(s))
  const ready = useUserReady()
  const view = tourView({ ob, firstLight, ready, demo: isDemoMode() })
  const init = view.open && view.needsInit
  useEffect(() => {
    if (init) patchOnboarding({ tourStep: STEP_ANIMAL })
  }, [init])
  return view
}

const go = (step: number) => patchOnboarding({ tourStep: step })
const dismiss = () => patchOnboarding({ tourDismissedAt: Date.now() })
const finish = () => patchOnboarding({ tourStep: STEP_DONE })

/** 「收集光點」新手引導：地圖下方的小抽屜，不擋住地圖操作，隨時可以「之後再說」 */
export function TourSheet({ step }: { step: number }) {
  const ob = useOnboarding()
  const sub = step === STEP_ANIMAL ? tourSub(ob) : undefined
  const pos = tourPosition(step, ob)
  return (
    <div
      className="sheet tour-sheet"
      role="dialog"
      aria-modal="false"
      aria-label="新手引導：收集光點"
      data-testid="tour-sheet"
      data-step={step}
      data-sub={sub}
    >
      <p className="tour-progress" aria-label={`第 ${pos + 1} 步，共 ${TOUR_DOTS} 步`}>
        {Array.from({ length: TOUR_DOTS }, (_, n) => (
          <span key={n} className={n === pos ? 'on' : n < pos ? 'past' : ''} aria-hidden />
        ))}
      </p>
      {sub === 'animal' && <StepAnimal />}
      {sub === 'district' && <StepDistrict />}
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

function StepAnimal() {
  const animal = useAnimal()
  return (
    <>
      <h2>選一隻陪你的動物</h2>
      <p>牠會在地圖上代表你，走到哪裡都跟著。</p>
      <AnimalPicker name="tour-animal" />
      <p className="muted small">之後可以在「我的」換。</p>
      <div className="tour-actions sticky">
        {/* 沒點過也把目前的（預設穿山甲）存下來，再進「你在哪一區？」 */}
        <button className="btn primary" onClick={() => patchOnboarding({ animal: animal.id, tourSub: 'district' })}>
          就牠了
        </button>
        <Later />
      </div>
    </>
  )
}

function StepDistrict() {
  const chosen = homeDistrictOf(useOnboarding())
  return (
    <>
      <h2>你在哪一區？</h2>
      <p className="tour-why muted small" data-testid="district-why">
        集章冊會先從這一區開始，之後可以在「我的」換。
      </p>
      <DistrictPicker name="tour-district" />
      <div className="tour-actions sticky">
        <button className="btn primary" disabled={!chosen} onClick={() => go(STEP_INTRO)}>
          好了，出發
        </button>
        <button className="btn" onClick={() => go(STEP_INTRO)}>
          先跳過
        </button>
      </div>
    </>
  )
}

function StepIntro() {
  const cfg = useGameConfig()
  const rows = pointRows(cfg)
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
        <button className="btn" onClick={() => patchOnboarding({ tourStep: STEP_ANIMAL, tourSub: 'district' })}>
          上一步
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
              可以開 Demo 模式：用模擬定位，不用站在樹旁邊也能打卡。想離開，到「我的 → 設定與其他 → Demo 工具」。
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
          <Art id="item-hat-acorn" alt="橡實帽" />
          <p>
            <strong>新手禮：橡實帽</strong>
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

const GUIDE_TABS: { id: InstallGuide; label: string }[] = [
  { id: 'ios-safari', label: 'iPhone（Safari）' },
  { id: 'ios-chrome', label: 'iPhone（Chrome）' },
  { id: 'android', label: 'Android' },
]

function InstallHelp({ platform, canInstall, appName }: { platform: ReturnType<typeof installPlatform>; canInstall: boolean; appName: ReturnType<typeof inAppBrowser> }) {
  const [guide, setGuide] = useState<InstallGuide>(() => defaultInstallGuide(platform))
  return (
    <>
      {platform === 'in-app' && (
        <div className="tour-note" role="note" data-testid="tour-install-in-app">
          <p className="small">
            你現在在 App 的內建瀏覽器，這裡加不到主畫面。請先用 Safari（iPhone）或 Chrome（Android）打開這個網址，再照下面做（頂端的提醒有做法）。
          </p>
          {appName === 'line' && (
            <a className="btn" href={externalBrowserUrl()}>
              用瀏覽器開啟
            </a>
          )}
        </div>
      )}
      {platform === 'other' && <PhoneQr />}
      <div className="install-tabs" role="tablist" aria-label="選擇你的手機" data-testid="tour-install-tabs">
        {GUIDE_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={guide === t.id}
            data-testid={`tour-install-tab-${t.id}`}
            onClick={() => setGuide(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {guide === 'ios-safari' && (
        <ol className="tour-steps" role="tabpanel" data-testid="tour-install-ios">
          <li>
            點畫面下方的「分享」按鈕（方框加向上的箭頭）。沒看到的話，先點「⋯」，再點「分享」。
          </li>
          <li>分享選單出來後往上滑，再往下找到「加入主畫面」。</li>
          <li>按右上角「新增」，主畫面就會多一個曦語的圖示。</li>
        </ol>
      )}
      {guide === 'ios-chrome' && (
        <ol className="tour-steps" role="tabpanel" data-testid="tour-install-ios-chrome">
          <li>點網址列右邊的「分享」按鈕（方框加向上的箭頭）。</li>
          <li>往下找到「加入主畫面」。</li>
          <li>按「新增」。找不到的話，改用 Safari 打開這個網址再加。</li>
        </ol>
      )}
      {guide === 'android' &&
        (platform === 'android' && canInstall ? (
          <button className="btn primary block" onClick={() => void promptInstall()} data-testid="tour-install-button">
            安裝到主畫面
          </button>
        ) : (
          <ol className="tour-steps" role="tabpanel" data-testid="tour-install-android">
            <li>點 Chrome 右上角的選單（⋮）。</li>
            <li>選「加到主畫面」或「安裝應用程式」。</li>
            <li>按「安裝」或「新增」。</li>
            <li className="muted">三星瀏覽器：點下方「≡」→「新增頁面至」→「主畫面」。</li>
          </ol>
        ))}
    </>
  )
}

/** 在電腦上看到這一步：給一個 QR Code，用手機相機掃就開到網站，再照下面的步驟加 */
function PhoneQr() {
  const box = useRef<HTMLDivElement>(null)
  const url = new URL(import.meta.env.BASE_URL, location.origin).href
  useEffect(() => {
    if (!box.current) return
    const svg = new BrowserQRCodeSvgWriter().write(url, 140, 140)
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-label', `曦語網址的 QR Code：${url}`)
    box.current.replaceChildren(svg)
  }, [url])
  return (
    <div className="install-qr" data-testid="tour-install-qr">
      <div className="qr" ref={box} />
      <p className="small muted">這一步要在手機上做：用手機相機掃這個 QR Code 打開曦語，再照下面的步驟加到主畫面。</p>
    </div>
  )
}
