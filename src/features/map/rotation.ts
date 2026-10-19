// 桌機的地圖旋轉：左轉／右轉按鈕與可拖曳的羅盤圈。

/** 每按一次左轉／右轉轉幾度 */
export const ROTATE_STEP = 15

/** 把方位角收斂到 0–360 */
export function normalizeBearing(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/** 指標相對圓心的角度（度，0 = 正上方，順時針為正） */
export function pointerAngle(cx: number, cy: number, x: number, y: number): number {
  return (Math.atan2(x - cx, cy - y) * 180) / Math.PI
}

/**
 * 拖曳羅盤圈：圈跟著手指轉，北方的記號順時針移動，地圖的方位角就是反方向變化。
 * startBearing 是按下時的方位角，startAngle／nowAngle 是按下與現在的指標角度。
 */
export function dragBearing(startBearing: number, startAngle: number, nowAngle: number): number {
  return normalizeBearing(startBearing - (nowAngle - startAngle))
}

/** 這台裝置是不是桌機類（精準指標，如滑鼠、觸控板） */
export function hasFinePointer(): boolean {
  try {
    return window.matchMedia('(pointer: fine)').matches
  } catch {
    return false
  }
}
