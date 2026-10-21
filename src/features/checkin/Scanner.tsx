import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { DEMO } from '../../config'
import { isDemoMode } from '../../store'
import type { Tree } from '../../lib/trees'
import { IconBack, IconCamera } from '../../components/icons'
import { inAppBrowser } from '../../lib/firebase'
import { cameraHelp, classifyCameraError, detectPlatform, NO_FRAMES_MS, PROMPT_GIVE_UP_MS, PROMPT_HINT_MS, shouldRetryAnyCamera, type CameraProblem } from './camera'

interface Props {
  onResult: (text: string) => void
  onClose: () => void
  /** 從地圖上某棵樹的行動圈過來：提示要掃的樹；Demo 的示範按鈕也掃這一棵 */
  hint?: Tree | null
  /**
   * 要掃的樹的編號（一進頁面就有）。樹種、路名要等 hint 載入，但 Demo 按鈕不能等：
   * 不然載入前按下去會掃到預設示範樹，人已經走到別棵樹旁就變成「太遠」。
   */
  hintId?: string
}

/** 在網頁裡開後鏡頭掃樹牌 QR Code；也可以從相簿選照片。 */
export function Scanner({ onResult, onClose, hint, hintId }: Props) {
  const demoTreeId = hint?.id ?? hintId
  const video = useRef<HTMLVideoElement>(null)
  const done = useRef(false)
  const [error, setError] = useState<string | null>(null)
  /** 相機開不起來的原因（null = 正在開或已經有畫面） */
  const [problem, setProblem] = useState<CameraProblem | null>(null)
  /** 權限視窗跳出來還沒按 */
  const [waiting, setWaiting] = useState(false)
  /** 每按一次「重新開相機」加一，重跑開相機的 effect */
  const [attempt, setAttempt] = useState(0)
  const [platform] = useState(() => detectPlatform(navigator.userAgent, inAppBrowser()))
  const [typing, setTyping] = useState(false)
  const [code, setCode] = useState('')
  const demo = isDemoMode()

  const finish = (text: string) => {
    if (done.current) return
    done.current = true
    onResult(text)
  }

  // 開後鏡頭。開不了、或開了沒畫面（全黑），都在取景框的位置說明怎麼打開權限（見 camera.ts）
  useEffect(() => {
    let controls: IScannerControls | undefined
    let cancelled = false
    const timers: number[] = []
    let permission: PermissionStatus | undefined
    const reader = new BrowserQRCodeReader()
    setProblem(null)
    setWaiting(false)
    if (!navigator.mediaDevices?.getUserMedia) {
      setProblem(window.isSecureContext === false ? 'insecure' : 'unsupported')
      return
    }
    const fail = (p: CameraProblem) => {
      if (cancelled) return
      timers.forEach((t) => clearInterval(t))
      setWaiting(false)
      setProblem(p)
    }
    const onDecode = (result: { getText(): string } | undefined) => {
      if (result) finish(result.getText())
    }
    const start = (constraints: MediaTrackConstraints | boolean) =>
      reader.decodeFromConstraints({ video: constraints }, video.current!, onDecode).then((c) => {
        if (cancelled) return c.stop()
        controls = c
      })
    // 看守：權限視窗還沒按（影片還沒拿到串流）→ 提醒「按允許」，太久就給說明；
    // 拿到串流了，但幾秒都沒有畫面（全黑，有些手機開了相機卻一直不出畫面，連 play() 都不會結束）→ 說明怎麼處理
    const startedAt = Date.now()
    let streamAt = 0
    const watch = window.setInterval(() => {
      const v = video.current
      if (cancelled || !v) return
      const now = Date.now()
      if (!v.srcObject) {
        if (now - startedAt >= PROMPT_GIVE_UP_MS) fail('unknown')
        else if (now - startedAt >= PROMPT_HINT_MS) setWaiting(true)
        return
      }
      setWaiting(false)
      if (v.videoWidth > 0 && v.readyState >= 2) return window.clearInterval(watch)
      streamAt ||= now
      if (now - streamAt >= NO_FRAMES_MS) fail('noFrames')
    }, 500)
    timers.push(watch)
    const run = async () => {
      // 先問瀏覽器權限狀態（不支援就跳過）：已經被拒絕就直接說明，不用等錯誤；在設定裡改成允許時自動重開
      try {
        permission = await navigator.permissions?.query({ name: 'camera' as PermissionName })
        if (permission && !cancelled) {
          permission.onchange = () => permission?.state === 'granted' && setAttempt((n) => n + 1)
          if (permission.state === 'denied') return fail('denied')
        }
      } catch {
        // Firefox 等不認得 camera 這個權限名稱
      }
      if (cancelled) return
      try {
        await start({ facingMode: 'environment' })
      } catch (err) {
        if (cancelled) return
        if (!shouldRetryAnyCamera(err)) return fail(classifyCameraError(err))
        // 沒有後鏡頭（桌機、部分平板）：用任何一個鏡頭
        try {
          await start(true)
        } catch (err2) {
          fail(classifyCameraError(err2))
        }
      }
    }
    void run()
    return () => {
      cancelled = true
      timers.forEach((t) => clearInterval(t))
      if (permission) permission.onchange = null
      controls?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const help = problem ? cameraHelp(problem, platform) : null

  const fromFile = async (file: File) => {
    const url = URL.createObjectURL(file)
    try {
      const result = await new BrowserQRCodeReader().decodeFromImageUrl(url)
      finish(result.getText())
    } catch {
      setError('照片裡找不到 QR Code。靠近一點、讓 QR Code 佔滿畫面再拍一次，或手動輸入樹牌上的編號。')
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="scanner" role="dialog" aria-label="掃樹牌">
      <video ref={video} className="scanner-video" playsInline muted />
      <div className="scanner-top">
        <button className="btn ghost light" onClick={onClose} aria-label="關閉掃描，回地圖">
          <IconBack /> 回地圖
        </button>
      </div>
      {/* 取景框在頂端列與下面的提示之間剩下的空間裡置中，空間不夠就縮小：提示卡再長也蓋不到它 */}
      <div className="scanner-stage">
        {help ? (
          <section className="camera-help" role="alert" data-testid="camera-help" data-problem={problem}>
            <h2>{help.title}</h2>
            <ol>
              {help.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            {help.retry && (
              <button type="button" className="btn primary" data-testid="camera-retry" onClick={() => setAttempt((n) => n + 1)}>
                重新開相機
              </button>
            )}
          </section>
        ) : (
          <div className="scanner-frame" aria-hidden />
        )}
        {waiting && !help && (
          <p className="camera-waiting" role="status" data-testid="camera-waiting">
            看到「要使用相機嗎？」請按「允許」。
          </p>
        )}
      </div>
      <div className="scanner-bottom">
        {hint && (
          <p className="scanner-hint" data-testid="scan-hint">
            要打卡的是：{hint.species}
            {hint.place && `・${hint.place}`}。找到它樹幹上的樹牌，對準 QR Code。
          </p>
        )}
        <figure className="tag-guide">
          <img src={`${import.meta.env.BASE_URL}assets/photo/tree-tag.jpg`} alt="公園處樹牌：白色金屬牌，右邊是 QR Code" />
          <figcaption>找樹幹上這塊白色金屬牌，對準右邊的 QR Code，不用按快門。</figcaption>
        </figure>
        {error && (
          <p className="scanner-error" role="status">
            {error}
          </p>
        )}
        {typing ? (
          <form
            className="code-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (code.trim()) finish(code)
            }}
          >
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="例如 SL0560111023"
              aria-label="樹牌上的編號"
              autoCapitalize="characters"
              autoFocus
            />
            <button className="btn light" disabled={!code.trim()}>
              查這棵樹
            </button>
          </form>
        ) : (
          <div className="row gap wrap justify-center">
            <label className="btn light file-btn">
              <IconCamera /> 從相簿選照片
              <input
                type="file"
                accept="image/*"
                className="visually-hidden"
                onChange={(e) => e.target.files?.[0] && fromFile(e.target.files[0])}
              />
            </label>
            <button className="btn light" onClick={() => setTyping(true)}>
              輸入編號
            </button>
            {demo && (
              <button className="btn primary demo-scan" onClick={() => finish(demoTreeId ? `http://trees.gov.taipei/show/?treeid=${demoTreeId}` : DEMO.qrText)}>
                {demoTreeId ? '掃這棵樹的樹牌（Demo）' : '掃示範樹牌（Demo）'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
