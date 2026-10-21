// 掃描頁的相機問題：把 getUserMedia 的錯誤、權限狀態、「開了但沒有畫面」分類，給對應的一步步說明。
// 相機畫面全黑時只能從相簿上傳。純函式，有單元測試。規格：docs/specs/03-checkin.md「相機打不開時」。

import { IN_APP_NAME, type InAppBrowser } from '../../lib/firebase'

export type CameraProblem =
  /** 使用者或系統拒絕了相機權限 */
  | 'denied'
  /** 找不到相機（或沒有後鏡頭，改用任何鏡頭也失敗） */
  | 'notFound'
  /** 相機被別的 App 佔用、或硬體打不開 */
  | 'busy'
  /** 不是 HTTPS（或 localhost） */
  | 'insecure'
  /** 這個瀏覽器沒有 getUserMedia */
  | 'unsupported'
  /** 相機開了，但幾秒過去都沒有畫面（全黑） */
  | 'noFrames'
  | 'unknown'

/** 等多久還沒有畫面就當作「全黑」（毫秒） */
export const NO_FRAMES_MS = 4000
/** 權限視窗跳出來多久還沒按，就提醒「按允許」（毫秒） */
export const PROMPT_HINT_MS = 3000
/** 等了這麼久還是沒有拿到相機（沒按允許、也沒有錯誤），就改成說明卡（毫秒） */
export const PROMPT_GIVE_UP_MS = 12000

/** getUserMedia 失敗的原因（DOMException.name） */
export function classifyCameraError(err: unknown): CameraProblem {
  const name = (err as { name?: string } | null)?.name ?? ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'denied'
    case 'SecurityError':
      return typeof window !== 'undefined' && window.isSecureContext === false ? 'insecure' : 'denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'notFound'
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'busy'
    default:
      return 'unknown'
  }
}

/** 沒有後鏡頭（或後鏡頭的條件不符）時，改用任何一個鏡頭再試一次 */
export function shouldRetryAnyCamera(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name ?? ''
  return name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError' || name === 'NotFoundError'
}

export interface Platform {
  ios: boolean
  android: boolean
  /** iOS 上的 Chrome（CriOS）；權限在 iOS 設定 → Chrome */
  iosChrome: boolean
  /** App 內建瀏覽器（LINE、IG…） */
  inApp: InAppBrowser | null
}

export function detectPlatform(ua: string, inApp: InAppBrowser | null): Platform {
  // iPadOS 13+ 的 Safari 自稱 Macintosh；有觸控就當 iPad
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)
  return { ios, android: /Android/i.test(ua), iosChrome: ios && /CriOS/i.test(ua), inApp }
}

export interface CameraHelp {
  title: string
  steps: string[]
  /** 顯示「重新開相機」：改了設定、關掉別的 App 之後可以再試 */
  retry: boolean
}

const FALLBACK = '也可以先用手機相機拍下樹牌，再按「從相簿選照片」。'

/** 開不了相機時的說明：先說發生什麼，再一步步教怎麼打開，最後一定給「從相簿選照片」的退路 */
export function cameraHelp(problem: CameraProblem, p: Platform): CameraHelp {
  // App 內建瀏覽器多半根本不給網頁用相機：不管哪一種錯誤，先請他換瀏覽器
  if (p.inApp && problem !== 'insecure') {
    const browser = p.android ? 'Chrome' : 'Safari'
    return {
      title: `${IN_APP_NAME[p.inApp]} 裡開不了相機`,
      steps: [`請改用 ${browser} 打開曦語（點右上角的「⋯」，選「在 ${browser} 中開啟」）。`, FALLBACK],
      retry: false,
    }
  }
  switch (problem) {
    case 'denied':
      return { title: '曦語還沒有相機權限', steps: [...allowSteps(p), '改好之後回到這裡，按「重新開相機」。', FALLBACK], retry: true }
    case 'noFrames':
      return {
        title: '相機開了，但沒有畫面',
        steps: [
          '先按「重新開相機」。',
          '還是黑的：關掉正在用相機的其他 App（視訊、相機、掃碼），再回來試一次。',
          ...(p.ios || p.android ? [`再不行：確認曦語有相機權限。${allowSteps(p)[0]}`] : []),
          FALLBACK,
        ],
        retry: true,
      }
    case 'busy':
      return { title: '相機被別的 App 佔用', steps: ['關掉正在用相機的 App（視訊通話、相機、掃碼），再按「重新開相機」。', FALLBACK], retry: true }
    case 'notFound':
      return { title: '找不到相機', steps: ['這台裝置好像沒有可以用的鏡頭。', FALLBACK], retry: true }
    case 'insecure':
      return { title: '這個網址不能開相機', steps: ['相機只能在 https:// 開頭的網址使用，請用正式網址打開。', FALLBACK], retry: false }
    case 'unsupported':
      return {
        title: '這個瀏覽器開不了相機',
        steps: [`請用 ${p.android ? 'Chrome' : 'Safari'} 打開曦語。`, FALLBACK],
        retry: false,
      }
    default:
      return { title: '相機打不開', steps: ['按「重新開相機」再試一次。', ...allowSteps(p).slice(0, 1), FALLBACK], retry: true }
  }
}

/** 依手機與瀏覽器，打開相機權限的步驟 */
export function allowSteps(p: Platform): string[] {
  if (p.iosChrome)
    return ['到 iPhone 的「設定」→「Chrome」→ 打開「相機」。']
  if (p.ios)
    return [
      'Safari：點網址列左邊的「大小」(ᴀA) →「網站設定」→「相機」選「允許」。',
      '沒有這個選項：到 iPhone 的「設定」→「Safari」→「相機」選「允許」或「詢問」。',
    ]
  if (p.android)
    return [
      'Chrome：點網址列左邊的圖示 →「權限」→「相機」選「允許」。',
      '還是不行：到手機的「設定」→「應用程式」→「Chrome」→「權限」→ 允許「相機」。',
    ]
  return ['點網址列左邊的圖示，把「相機」改成「允許」。']
}
