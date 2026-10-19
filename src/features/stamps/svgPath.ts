// 集章冊全市地圖：public/data/taipei-outline.json 的路徑只有 M／l／z（相對座標、20 公尺一單位）。
// 這裡把路徑還原成點，算區名的位置與整體範圍。

export type Pt = [number, number]

/** 把「M x y l dx dy dx dy … z」解析成多個環（絕對座標）。 */
export function parseRings(d: string): Pt[][] {
  const rings: Pt[][] = []
  let cur: Pt[] = []
  let x = 0
  let y = 0
  const re = /([MmLlZz])([^MmLlZz]*)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(d))) {
    const cmd = m[1]
    const nums = (m[2].match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
    if (cmd === 'Z' || cmd === 'z') {
      if (cur.length) rings.push(cur)
      cur = []
      continue
    }
    const rel = cmd === 'm' || cmd === 'l'
    if (cmd === 'M' || cmd === 'm') {
      if (cur.length) rings.push(cur)
      cur = []
    }
    for (let i = 0; i + 1 < nums.length; i += 2) {
      x = rel ? x + nums[i] : nums[i]
      y = rel ? y + nums[i + 1] : nums[i + 1]
      cur.push([x, y])
    }
  }
  if (cur.length) rings.push(cur)
  return rings
}

/** 有號面積（鞋帶公式），絕對值是面積 */
export function ringArea(ring: readonly Pt[]): number {
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  return a / 2
}

/** 多邊形重心；退化（面積 0）時回傳頂點平均 */
export function ringCentroid(ring: readonly Pt[]): Pt {
  const a = ringArea(ring)
  if (Math.abs(a) < 1e-9) {
    const n = ring.length || 1
    return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n]
  }
  let cx = 0
  let cy = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
    cx += (ring[j][0] + ring[i][0]) * f
    cy += (ring[j][1] + ring[i][1]) * f
  }
  return [cx / (6 * a), cy / (6 * a)]
}

/** 最大的環（面積）；沒有環回傳 null */
export function largestRing<T extends readonly Pt[]>(rings: readonly T[]): T | null {
  let best: T | null = null
  let bestA = -1
  for (const r of rings) {
    const a = Math.abs(ringArea(r))
    if (a > bestA) {
      best = r
      bestA = a
    }
  }
  return best
}

/** 區名位置：最大那一塊的重心 */
export function labelPoint(rings: readonly (readonly Pt[])[]): Pt | null {
  const r = largestRing(rings)
  return r && r.length ? ringCentroid(r) : null
}

/** [minX, minY, maxX, maxY] */
export function boundsOf(rings: readonly (readonly Pt[])[]): [number, number, number, number] | null {
  let b: [number, number, number, number] | null = null
  for (const r of rings)
    for (const [x, y] of r) {
      b = b ? [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)] : [x, y, x, y]
    }
  return b
}
