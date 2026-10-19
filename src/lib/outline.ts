// 集章冊示意地圖的背景：台北市輪廓、12 區界、鄰近的新北與基隆。
// 資料 public/data/taipei-outline.json 由 scripts/build_admin_outline.py 從 OSM 行政區界產生（已投影成 SVG 路徑），
// 規格見 docs/specs/08-extensions.md §10。

export interface Outline {
  attribution: string
  /** SVG viewBox 的寬、高 */
  viewBox: [number, number]
  taipei: string
  districts: Record<string, string>
  newtaipei: string
  keelung: string
}

const isPath = (v: unknown): v is string => typeof v === 'string' && v.startsWith('M')

/** 檢查載入的 JSON 長得對不對；不對就回傳 null（畫面就不畫背景）。 */
export function parseOutline(raw: unknown): Outline | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const vb = o.viewBox
  if (!Array.isArray(vb) || vb.length !== 2 || !vb.every((n) => typeof n === 'number' && n > 0)) return null
  if (!isPath(o.taipei) || !isPath(o.newtaipei) || !isPath(o.keelung)) return null
  const d = o.districts
  if (!d || typeof d !== 'object') return null
  const entries = Object.entries(d as Record<string, unknown>)
  if (entries.length === 0 || !entries.every(([, p]) => isPath(p))) return null
  return {
    attribution: typeof o.attribution === 'string' ? o.attribution : '',
    viewBox: [vb[0], vb[1]],
    taipei: o.taipei,
    districts: Object.fromEntries(entries) as Record<string, string>,
    newtaipei: o.newtaipei,
    keelung: o.keelung,
  }
}

let cache: Promise<Outline | null> | null = null

/** 載入背景資料；失敗（404、網路、格式不對）回傳 null，且不重試。 */
export function loadOutline(): Promise<Outline | null> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/taipei-outline.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then(parseOutline)
    .catch(() => null)
  return cache
}
