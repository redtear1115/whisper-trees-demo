// 全站統一的日期寫法：今年寫「10月19日」，不是今年寫「2025年10月19日」；有時間就加「 23:01」（24 小時制）。

function parts(at: number) {
  const d = new Date(at)
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), hh: d.getHours(), mm: d.getMinutes() }
}

export function formatDay(at: number, now: number = Date.now()): string {
  const p = parts(at)
  const day = `${p.m}月${p.d}日`
  return p.y === parts(now).y ? day : `${p.y}年${day}`
}

export function formatDayTime(at: number, now: number = Date.now()): string {
  const p = parts(at)
  return `${formatDay(at, now)} ${String(p.hh).padStart(2, '0')}:${String(p.mm).padStart(2, '0')}`
}
