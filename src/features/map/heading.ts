// 手機的指南針方向（0 = 北，順時針度數）。iOS 要在點擊當下請求權限。

type IOSOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

/** 必須在使用者點擊的處理函式裡呼叫（iOS 規定） */
export async function requestHeadingPermission(): Promise<boolean> {
  const E = (globalThis as { DeviceOrientationEvent?: IOSOrientationEvent }).DeviceOrientationEvent
  if (!E) return false
  if (typeof E.requestPermission === 'function') {
    try {
      return (await E.requestPermission()) === 'granted'
    } catch {
      return false
    }
  }
  return true
}

/** 開始監聽方向；回傳停止函式。onHeading 收到 0–360 的方位角。 */
export function watchHeading(onHeading: (deg: number) => void): () => void {
  const handler = (e: DeviceOrientationEvent) => {
    const ios = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
    if (typeof ios === 'number' && !Number.isNaN(ios)) return onHeading(ios)
    // Android：deviceorientationabsolute 的 alpha 是逆時針，轉成順時針方位角
    if (e.absolute && e.alpha !== null) onHeading((360 - e.alpha) % 360)
  }
  const absolute = 'ondeviceorientationabsolute' in window
  const type = absolute ? 'deviceorientationabsolute' : 'deviceorientation'
  window.addEventListener(type, handler as EventListener)
  return () => window.removeEventListener(type, handler as EventListener)
}

/** 兩個角度的最小差（0–180） */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}
