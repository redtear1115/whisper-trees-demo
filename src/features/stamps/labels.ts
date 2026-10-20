// 全市地圖的區名不重疊：小區（中山、大同、松山；中正、大安）的標籤中心很近，字一大就疊在一起。
// 純函式：給每個標籤的中心與大小，反覆把重疊的一對沿著重疊較少的那個方向推開，並把標籤夾在各自那一區的外框內
// （推到別區去會讓人以為是別區的名字）。推不開的就留在最近的位置，由呼叫端量測。

export interface LabelBox {
  id: string
  x: number
  y: number
  /** 標籤的寬、高（SVG 單位） */
  w: number
  h: number
  /** 這個標籤所屬那一區的外框 [minX, minY, maxX, maxY]；標籤中心不會被推出這個範圍 */
  within?: readonly [number, number, number, number]
}

export function overlaps(a: LabelBox, b: LabelBox, gap = 0): boolean {
  return (a.w + b.w) / 2 + gap > Math.abs(a.x - b.x) && (a.h + b.h) / 2 + gap > Math.abs(a.y - b.y)
}

export function spreadLabels(input: readonly LabelBox[], gap = 1, iterations = 80): LabelBox[] {
  const boxes = input.map((b) => ({ ...b }))
  const clamp = (b: LabelBox) => {
    if (!b.within) return
    const [x0, y0, x1, y1] = b.within
    b.x = Math.min(Math.max(b.x, x0 + Math.min(b.w / 2, (x1 - x0) / 2)), x1 - Math.min(b.w / 2, (x1 - x0) / 2))
    b.y = Math.min(Math.max(b.y, y0 + Math.min(b.h / 2, (y1 - y0) / 2)), y1 - Math.min(b.h / 2, (y1 - y0) / 2))
  }
  for (let n = 0; n < iterations; n++) {
    let moved = false
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]
        const b = boxes[j]
        if (!overlaps(a, b, gap)) continue
        const ox = (a.w + b.w) / 2 + gap - Math.abs(a.x - b.x)
        const oy = (a.h + b.h) / 2 + gap - Math.abs(a.y - b.y)
        // 沿著要推比較少的方向（通常是上下，因為字是橫排的）
        if (oy <= ox) {
          const d = oy / 2 + 0.01
          const s = a.y <= b.y ? -1 : 1
          a.y += s * d
          b.y -= s * d
        } else {
          const d = ox / 2 + 0.01
          const s = a.x <= b.x ? -1 : 1
          a.x += s * d
          b.x -= s * d
        }
        clamp(a)
        clamp(b)
        moved = true
      }
    }
    if (!moved) break
  }
  return boxes
}
