import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrowserQRCodeSvgWriter } from '@zxing/browser'
import { isDemoMode } from '../../store'

/** 手機或平板（觸控為主的裝置）。桌機加了觸控螢幕仍算桌機。 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(pointer: coarse)').matches
}

function useTouchDevice() {
  const [touch, setTouch] = useState(isTouchDevice)
  useEffect(() => {
    const mq = window.matchMedia?.('(pointer: coarse)')
    if (!mq) return
    const on = () => setTouch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return touch
}

/**
 * 市民端只在手機上用：要走到樹旁、開後鏡頭、用 GPS。
 * 桌機看到「請用手機開啟」與 QR Code；加 ?demo=1 才能在桌機試玩。
 */
export function MobileOnly({ children }: { children: ReactNode }) {
  const touch = useTouchDevice()
  if (touch || isDemoMode()) return <>{children}</>
  return <DesktopNotice />
}

function DesktopNotice() {
  const qr = useRef<HTMLDivElement>(null)
  const url = location.href.split('#')[0]

  useEffect(() => {
    const box = qr.current
    if (!box) return
    const svg = new BrowserQRCodeSvgWriter().write(url, 220, 220)
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-label', `這個頁面的 QR Code：${url}`)
    box.replaceChildren(svg)
  }, [url])

  return (
    <main className="desktop-notice">
      <h1>曦語要用手機開</h1>
      <p>走到樹旁、掃樹幹上的樹牌、用 GPS 確認你在現場，這些都要手機。</p>
      <div className="qr" ref={qr} />
      <p className="muted small">用手機相機掃這個 QR Code，就會開到同一頁。</p>
      <div className="row gap wrap justify-center">
        <a className="btn primary" href={`${import.meta.env.BASE_URL}?demo=1`}>
          在電腦上試玩（Demo 模式）
        </a>
        <Link className="btn" to="/gov">
          政府端（桌機）
        </Link>
        <Link className="btn" to="/more">
          其他後台
        </Link>
      </div>
      <p className="muted small">Demo 模式用模擬定位，可以掃示範樹牌，不需要相機。</p>
    </main>
  )
}
