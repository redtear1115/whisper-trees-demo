import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { DEMO } from '../../config'
import { isDemoMode } from '../../store'
import type { Tree } from '../../lib/trees'
import { IconBack, IconCamera } from '../../components/icons'

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
  const [typing, setTyping] = useState(false)
  const [code, setCode] = useState('')
  const demo = isDemoMode()

  const finish = (text: string) => {
    if (done.current) return
    done.current = true
    onResult(text)
  }

  useEffect(() => {
    let controls: IScannerControls | undefined
    let cancelled = false
    const reader = new BrowserQRCodeReader()
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('這個瀏覽器開不了相機。可以拍下樹牌再「從相簿選照片」，或手動輸入編號。')
      return
    }
    reader
      .decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current!, (result) => {
        if (result) finish(result.getText())
      })
      .then((c) => {
        if (cancelled) c.stop()
        else controls = c
      })
      .catch(() =>
        setError(
          '沒有相機權限。iPhone：設定 → Safari → 相機 → 允許；Android：網址列左邊的鎖頭 → 權限 → 相機。也可以先拍照，再從相簿選。',
        ),
      )
    return () => {
      cancelled = true
      controls?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      <div className="scanner-frame" aria-hidden />
      <div className="scanner-top">
        <button className="btn ghost light" onClick={onClose}>
          <IconBack /> 返回
        </button>
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
