import { useState } from 'react'
import { externalBrowserUrl, inAppBrowser, IN_APP_NAME, type InAppBrowser } from '../../lib/firebase'
import { dismissInAppNotice, inAppNoticeDismissed } from '../../store'

/** 各 App 怎麼改用系統瀏覽器打開（LINE 另外有直接跳轉的按鈕） */
export function openInBrowserHow(app: InAppBrowser, android: boolean): string {
  const browser = android ? 'Chrome' : 'Safari'
  switch (app) {
    case 'line':
      return `按下面的按鈕，會直接用 ${browser} 打開。`
    case 'threads':
    case 'instagram':
    case 'messenger':
    case 'facebook':
    case 'wechat':
      return `點右上角的「⋯」，選「在 ${browser} 中開啟」（或「用外部瀏覽器開啟」）。`
    case 'tiktok':
    case 'x':
      return `點右上角的「⋯」或分享，選「在瀏覽器開啟」。`
    default:
      return `在選單裡找「在 ${browser} 中開啟」；找不到的話，複製網址貼到 ${browser}。`
  }
}

/**
 * 在 App 內建瀏覽器（LINE、Threads、IG…）裡打開時，頂端提醒改用 Safari／Chrome：
 * 內建瀏覽器常常開不了相機、定位，也不能用 Google 登入、加到主畫面。
 */
export function InAppNotice() {
  const [app] = useState(() => inAppBrowser())
  const [open, setOpen] = useState(() => !inAppNoticeDismissed())
  const [copied, setCopied] = useState(false)
  if (!app || !open) return null
  const android = /Android/i.test(navigator.userAgent)
  const browser = android ? 'Chrome' : 'Safari'
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="in-app-notice" role="note" data-testid="in-app-notice" data-app={app}>
      <p>
        <strong>請改用 {browser} 打開曦語。</strong>
        你現在在 {IN_APP_NAME[app]} 的內建瀏覽器，掃樹牌、定位、加到主畫面和 Google 登入都可能不能用。
      </p>
      <p className="small">{openInBrowserHow(app, android)}</p>
      <div className="in-app-actions">
        {app === 'line' ? (
          <a className="btn primary" href={externalBrowserUrl()} data-testid="in-app-open">
            用 {browser} 打開
          </a>
        ) : (
          <button className="btn" onClick={copy} data-testid="in-app-copy">
            {copied ? '已複製網址' : '複製網址'}
          </button>
        )}
        <button
          className="btn light"
          onClick={() => {
            dismissInAppNotice()
            setOpen(false)
          }}
        >
          先不用
        </button>
      </div>
    </div>
  )
}
