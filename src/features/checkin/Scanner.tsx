import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { DEMO } from '../../config'
import { isDemoMode } from '../../store'

interface Props {
  onResult: (text: string) => void
  onClose: () => void
}

/** 在網頁裡開後鏡頭掃樹牌 QR Code；也可以從相簿選照片。 */
export function Scanner({ onResult, onClose }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const done = useRef(false)
  const [error, setError] = useState<string | null>(null)
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
      setError('這個瀏覽器無法開相機，請改用「從相簿選照片」。')
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
      .catch(() => setError('沒有相機權限。可以在瀏覽器設定開啟，或改用「從相簿選照片」。'))
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
      setError('照片裡找不到 QR Code，換一張清楚一點的試試。')
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
          關閉
        </button>
      </div>
      <div className="scanner-bottom">
        <p className="scanner-hint">對準樹牌上的 QR Code，不用按快門</p>
        {error && <p className="scanner-error">{error}</p>}
        <div className="row gap">
          <label className="btn light">
            從相簿選照片
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && fromFile(e.target.files[0])}
            />
          </label>
          {demo && (
            <button className="btn light" onClick={() => finish(DEMO.qrText)}>
              掃示範樹牌
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
