// 步行路線：每區一張路網 public/data/roads/<前綴>.json（scripts/build_road_graph.py，OSM 具名道路，ODbL）。
// 載入之後全部是同步的純函式：吸附到最近的路、A*（二元堆）找最短路、貪婪排序的樹木導覽。規格見 docs/specs/02-map.md「怎麼走」。

import { distanceMeters, type LngLat } from './geo'
import { inVillage, loadVillages, type DistrictVillages } from './villages'

export type { LngLat } from './geo'

/** nodes：路口與路的盡頭；edges：[節點 a, 節點 b, 長度（公尺）, a 到 b 之間的中間點] */
export interface RoadGraph {
  prefix: string
  nodes: LngLat[]
  edges: [number, number, number, LngLat[]][]
}

const cache = new Map<string, Promise<RoadGraph | null>>()

/** 載入某區（樹籍編號前兩碼，如 'DA'）的路網；失敗（404、網路、格式不對）回傳 null，且不重試。 */
export function loadRoadGraph(prefix: string): Promise<RoadGraph | null> {
  if (!/^[A-Z]{2}$/.test(prefix)) return Promise.resolve(null)
  let p = cache.get(prefix)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/roads/${prefix}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => (isRoadFile(raw) ? { prefix, nodes: raw.nodes, edges: raw.edges } : null))
      .catch(() => null)
    cache.set(prefix, p)
  }
  return p
}

function isRoadFile(raw: unknown): raw is Pick<RoadGraph, 'nodes' | 'edges'> {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  return Array.isArray(o.nodes) && Array.isArray(o.edges)
}

// ---------- 這個點屬於哪一區（要用哪個路網） ----------

/** 12 區的外框 [minLng, minLat, maxLng, maxLat]，由 public/data/villages 的里界算出（測試會比對，資料更新時要同步） */
export const DISTRICT_BBOX: Record<string, [number, number, number, number]> = {
  BT: [121.4588, 25.0958, 121.5761, 25.2102],
  DA: [121.5217, 25.0078, 121.566, 25.0455],
  DT: [121.5046, 25.0483, 121.5225, 25.0808],
  JJ: [121.5041, 25.0087, 121.5371, 25.0499],
  JS: [121.5187, 25.0446, 121.5725, 25.0929],
  NG: [121.578, 25.0122, 121.6659, 25.0645],
  NH: [121.5522, 25.0517, 121.6286, 25.1151],
  SL: [121.4572, 25.0742, 121.6078, 25.1954],
  SS: [121.5386, 25.0444, 121.5801, 25.0763],
  SY: [121.5526, 25.0081, 121.592, 25.0495],
  WH: [121.4836, 25.0092, 121.5124, 25.0498],
  WS: [121.5305, 24.9605, 121.62, 25.0155],
}

const loadedVillages = new Map<string, DistrictVillages>()

function bboxCandidates([x, y]: LngLat): string[] {
  return Object.entries(DISTRICT_BBOX)
    .filter(([, [x0, y0, x1, y1]]) => x >= x0 && x <= x1 && y >= y0 && y <= y1)
    .map(([prefix]) => prefix)
}

function nearestByCenter(p: LngLat, prefixes: string[]): string {
  const dist = (prefix: string) => {
    const [x0, y0, x1, y1] = DISTRICT_BBOX[prefix]
    return distanceMeters(p, [(x0 + x1) / 2, (y0 + y1) / 2])
  }
  return prefixes.reduce((best, c) => (dist(c) < dist(best) ? c : best))
}

/**
 * 這個點在哪一區（要用哪個路網檔）；市界外回傳 null。同步：外框只有一區就是那區；外框重疊的地方，
 * 已經載入過那幾區的里界就用里界判斷，否則取外框中心最近的一區（路網各區外擴 300 公尺，選到鄰區也走得通）。
 * 要精確請用 prefixAtAsync。
 */
export function prefixAt(p: LngLat): string | null {
  const cand = bboxCandidates(p)
  if (cand.length === 0) return null
  if (cand.length === 1) return cand[0]
  const exact = cand.find((c) => loadedVillages.get(c)?.villages.some((v) => inVillage(p, v)))
  return exact ?? nearestByCenter(p, cand)
}

/** 同 prefixAt，但外框重疊時會載入里界做精確判斷（落在所有里之外的河面，取外框中心最近的一區）。 */
export async function prefixAtAsync(p: LngLat): Promise<string | null> {
  const cand = bboxCandidates(p)
  if (cand.length <= 1) return cand[0] ?? null
  const files = await Promise.all(cand.map((c) => loadVillages(c)))
  files.forEach((f, i) => f && loadedVillages.set(cand[i], f))
  return prefixAt(p)
}

// ---------- 路徑搜尋 ----------

export interface Route {
  coords: LngLat[]
  meters: number
  /** 步行 4.5 公里／小時，無條件進位，至少 1 */
  minutes: number
}

export interface TourStop {
  id: string
  lngLat: LngLat
}

export interface Tour {
  start: LngLat
  stops: TourStop[]
  path: LngLat[]
  meters: number
  minutes: number
}

const WALK_M_PER_MIN = 4500 / 60
/** 離最近的路超過這個距離就不接（人在市區外、或這一帶的路沒收錄） */
const MAX_SNAP_M = 250
const DEFAULT_MAX_STOPS = 8

export function walkMinutes(meters: number): number {
  return Math.max(1, Math.ceil(meters / WALK_M_PER_MIN - 1e-9))
}

/** 圖的衍生資料：每條邊的完整折線與累計長度、每個節點連到的邊 */
interface Index {
  adj: number[][]
  lines: LngLat[][]
  /** 每條折線的累計幾何長度（公尺，區域平面近似）；最後一個是總長 */
  cum: number[][]
  /** 邊的標示長度 ÷ 折線幾何長度：吸附位置用幾何算，成本用標示長度，兩者換算 */
  scale: number[]
}

const indexes = new WeakMap<RoadGraph, Index>()

function metresPerDeg(lat: number): [number, number] {
  return [111_320 * Math.cos((lat * Math.PI) / 180), 110_540]
}

function indexOf(g: RoadGraph): Index {
  let idx = indexes.get(g)
  if (idx) return idx
  const adj: number[][] = g.nodes.map(() => [])
  const lines: LngLat[][] = []
  const cum: number[][] = []
  const scale: number[] = []
  g.edges.forEach(([a, b, len, inner], i) => {
    adj[a].push(i)
    if (b !== a) adj[b].push(i)
    const line = [g.nodes[a], ...inner, g.nodes[b]]
    const [kx, ky] = metresPerDeg(g.nodes[a][1])
    const c = [0]
    for (let k = 1; k < line.length; k++) {
      c.push(c[k - 1] + Math.hypot((line[k][0] - line[k - 1][0]) * kx, (line[k][1] - line[k - 1][1]) * ky))
    }
    lines.push(line)
    cum.push(c)
    scale.push(c[c.length - 1] > 0 ? len / c[c.length - 1] : 1)
  })
  idx = { adj, lines, cum, scale }
  indexes.set(g, idx)
  return idx
}

/** 一個點吸附到某條邊上的位置 */
interface Snap {
  edge: number
  /** 沿折線的幾何位置（公尺） */
  pos: number
  /** 從邊的 a 端走到這裡的路程（公尺，標示長度的比例） */
  fromA: number
  /** 從這裡走到邊的 b 端的路程 */
  toB: number
  point: LngLat
  /** 原本的點到吸附點的直線距離 */
  gap: number
}

function snapToGraph(g: RoadGraph, p: LngLat): Snap | null {
  const idx = indexOf(g)
  const [kx, ky] = metresPerDeg(p[1])
  let best: Snap | null = null
  let bestD = Infinity
  for (let e = 0; e < g.edges.length; e++) {
    const line = idx.lines[e]
    for (let k = 1; k < line.length; k++) {
      const ax = (line[k - 1][0] - p[0]) * kx
      const ay = (line[k - 1][1] - p[1]) * ky
      const dx = (line[k][0] - line[k - 1][0]) * kx
      const dy = (line[k][1] - line[k - 1][1]) * ky
      const l2 = dx * dx + dy * dy
      const t = l2 === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / l2))
      const d = Math.hypot(ax + t * dx, ay + t * dy)
      if (d < bestD) {
        bestD = d
        const seg = idx.cum[e][k] - idx.cum[e][k - 1]
        const pos = idx.cum[e][k - 1] + t * seg
        const total = g.edges[e][2]
        const fromA = pos * idx.scale[e]
        best = {
          edge: e,
          pos,
          fromA,
          toB: Math.max(0, total - fromA),
          point: [line[k - 1][0] + t * (line[k][0] - line[k - 1][0]), line[k - 1][1] + t * (line[k][1] - line[k - 1][1])],
          gap: d,
        }
      }
    }
  }
  return best && best.gap <= MAX_SNAP_M ? best : null
}

/** 二元最小堆（鍵 = 數字，值 = 節點編號），同一節點可以重複放入，取出時略過過時的 */
class Heap {
  private keys: number[] = []
  private vals: number[] = []
  get size() {
    return this.keys.length
  }
  push(key: number, val: number) {
    let i = this.keys.length
    this.keys.push(key)
    this.vals.push(val)
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.keys[parent] <= key) break
      this.keys[i] = this.keys[parent]
      this.vals[i] = this.vals[parent]
      i = parent
    }
    this.keys[i] = key
    this.vals[i] = val
  }
  pop(): number {
    const top = this.vals[0]
    const key = this.keys.pop()!
    const val = this.vals.pop()!
    const n = this.keys.length
    if (n > 0) {
      let i = 0
      for (;;) {
        let c = 2 * i + 1
        if (c >= n) break
        if (c + 1 < n && this.keys[c + 1] < this.keys[c]) c++
        if (this.keys[c] >= key) break
        this.keys[i] = this.keys[c]
        this.vals[i] = this.vals[c]
        i = c
      }
      this.keys[i] = key
      this.vals[i] = val
    }
    return top
  }
}

/** 搜尋結果：dist 是從起點吸附位置到各節點的路程；prevEdge[u] = -1 表示 u 是從起點的邊上直接走過來的 */
interface Search {
  dist: Float64Array
  prevEdge: Int32Array
  prevNode: Int32Array
  /** 目標吸附在哪一端被接上：0 = 邊的 a 端，1 = b 端，-1 = 同一條邊上直接走 */
  tail: number
  total: number
  /** 路程最短的最後一個節點 */
  last: number
}

const other = (g: RoadGraph, e: number, u: number) => (g.edges[e][0] === u ? g.edges[e][1] : g.edges[e][0])

/**
 * Dijkstra；有目標時用 A*（直線距離當啟發值，不會高估）並在找到目標時停下。
 * 起點與目標都在邊的中間，所以起點把邊的兩端放進去，目標則是接在邊的兩端上。
 */
function search(g: RoadGraph, from: Snap, to: Snap | null): Search {
  const idx = indexOf(g)
  const n = g.nodes.length
  const dist = new Float64Array(n).fill(Infinity)
  const prevEdge = new Int32Array(n).fill(-2)
  const prevNode = new Int32Array(n).fill(-1)
  const heap = new Heap()
  const h = (u: number) => (to ? distanceMeters(g.nodes[u], to.point) : 0)
  const [a, b] = g.edges[from.edge]
  const startAt = (u: number, cost: number) => {
    if (cost < dist[u]) {
      dist[u] = cost
      prevEdge[u] = -1
      prevNode[u] = u === a && cost === from.fromA ? 0 : 1 // 從 a 端還是 b 端離開起點
      heap.push(cost + h(u), u)
    }
  }
  startAt(a, from.fromA)
  startAt(b, from.toB)

  const s: Search = { dist, prevEdge, prevNode, tail: -1, total: Infinity, last: -1 }
  const [ta, tb] = to ? g.edges[to.edge] : [-1, -1]
  if (to && to.edge === from.edge) {
    s.total = Math.abs(to.fromA - from.fromA)
    s.tail = -1
  }
  const settled = new Uint8Array(n)
  while (heap.size > 0) {
    const u = heap.pop()
    if (settled[u]) continue
    settled[u] = 1
    if (to) {
      if (dist[u] + h(u) >= s.total) break // 之後取出的節點鍵都不小於這個，不可能更短（啟發值不高估、也不會前後矛盾）
      if (u === ta && dist[u] + to.fromA < s.total) {
        s.total = dist[u] + to.fromA
        s.tail = 0
        s.last = u
      }
      if (u === tb && dist[u] + to.toB < s.total) {
        s.total = dist[u] + to.toB
        s.tail = 1
        s.last = u
      }
    }
    for (const e of idx.adj[u]) {
      const v = other(g, e, u)
      const nd = dist[u] + g.edges[e][2]
      if (nd < dist[v]) {
        dist[v] = nd
        prevEdge[v] = e
        prevNode[v] = u
        heap.push(nd + h(v), v)
      }
    }
  }
  return s
}

/** 從吸附位置 p0 沿折線走到位置 p1 的座標（含兩端），p0 > p1 時反向 */
function slice(idx: Index, e: number, p0: number, p1: number, pt0: LngLat, pt1: LngLat): LngLat[] {
  const line = idx.lines[e]
  const c = idx.cum[e]
  const out: LngLat[] = [pt0]
  if (p0 <= p1) {
    for (let k = 0; k < line.length; k++) if (c[k] > p0 && c[k] < p1) out.push(line[k])
  } else {
    for (let k = line.length - 1; k >= 0; k--) if (c[k] < p0 && c[k] > p1) out.push(line[k])
  }
  out.push(pt1)
  return out
}

function nodeSnapPoint(g: RoadGraph, e: number, end: 0 | 1): LngLat {
  return g.nodes[g.edges[e][end]]
}

/** 起點吸附位置 → 節點 u 的座標（沿邊走，不含起點以外的重複點） */
function buildRoute(g: RoadGraph, from: LngLat, to: LngLat, fs: Snap, ts: Snap, s: Search): Route {
  const idx = indexOf(g)
  const coords: LngLat[] = []
  if (s.tail === -1) {
    coords.push(...slice(idx, fs.edge, fs.pos, ts.pos, fs.point, ts.point))
  } else {
    // 從目標往回追到起點，再反轉
    const back: LngLat[][] = []
    const tEnd = s.tail === 0 ? 0 : 1
    const tPos = tEnd === 0 ? 0 : idx.cum[ts.edge][idx.cum[ts.edge].length - 1]
    back.push(slice(idx, ts.edge, tPos, ts.pos, nodeSnapPoint(g, ts.edge, tEnd), ts.point))
    let u = s.last
    while (s.prevEdge[u] >= 0) {
      const e = s.prevEdge[u]
      const v = s.prevNode[u]
      const line = idx.lines[e]
      const forward = g.edges[e][0] === v // v → u 沿折線正向
      back.push(forward ? line.slice() : line.slice().reverse())
      u = v
    }
    // u 是從起點的邊直接走到的節點；prevNode[u] 記錄是從 a 端（0）還是 b 端（1）
    const fromEnd = s.prevNode[u] as 0 | 1
    const fPos = fromEnd === 0 ? 0 : idx.cum[fs.edge][idx.cum[fs.edge].length - 1]
    back.push(slice(idx, fs.edge, fs.pos, fPos, fs.point, nodeSnapPoint(g, fs.edge, fromEnd)))
    for (const part of back.reverse()) {
      for (const p of part) {
        const last = coords[coords.length - 1]
        if (!last || last[0] !== p[0] || last[1] !== p[1]) coords.push(p)
      }
    }
  }
  const meters = fs.gap + s.total + ts.gap
  const path: LngLat[] = []
  for (const p of [from, ...coords, to]) {
    const last = path[path.length - 1]
    if (!last || last[0] !== p[0] || last[1] !== p[1]) path.push(p)
  }
  return { coords: path, meters, minutes: walkMinutes(meters) }
}

/** 兩點之間沿路的步行路線（兩端各接一小段直線到最近的路）；兩端有一端找不到路、或走不通時回傳 null。 */
export function routeBetween(graph: RoadGraph, from: LngLat, to: LngLat): Route | null {
  if (graph.edges.length === 0) return null
  const fs = snapToGraph(graph, from)
  const ts = snapToGraph(graph, to)
  if (!fs || !ts) return null
  const s = search(graph, fs, ts)
  if (!Number.isFinite(s.total)) return null
  return buildRoute(graph, from, to, fs, ts, s)
}

/** 到每個吸附點的路程（只算路上的，不含吸附的直線）；到不了是 Infinity */
function costTo(g: RoadGraph, s: Search, from: Snap, to: Snap): number {
  let best = to.edge === from.edge ? Math.abs(to.fromA - from.fromA) : Infinity
  const [a, b] = g.edges[to.edge]
  best = Math.min(best, s.dist[a] + to.fromA, s.dist[b] + to.toB)
  return best
}

/**
 * 從 start 出發的樹木導覽：每次走向「路程最近」的下一棵（貪婪），最多 maxStops 站，走不到或吸附不到路的樹略過。
 * path 是整條路線的座標（相鄰兩段的接點不重複），meters / minutes 是全部加起來。一站都排不出來回傳 null。
 */
export function planTreeTour(graph: RoadGraph, start: LngLat, candidates: TourStop[], maxStops = DEFAULT_MAX_STOPS): Tour | null {
  const startSnap = snapToGraph(graph, start)
  if (!startSnap || maxStops <= 0) return null
  const remaining = candidates
    .map((stop) => ({ stop, snap: snapToGraph(graph, stop.lngLat) }))
    .filter((c): c is { stop: TourStop; snap: Snap } => c.snap !== null)
  const stops: TourStop[] = []
  const path: LngLat[] = [start]
  let meters = 0
  let here = { lngLat: start, snap: startSnap }
  while (stops.length < maxStops && remaining.length > 0) {
    const s = search(graph, here.snap, null)
    let bestI = -1
    let bestCost = Infinity
    remaining.forEach((c, i) => {
      const cost = costTo(graph, s, here.snap, c.snap)
      if (cost < bestCost) {
        bestCost = cost
        bestI = i
      }
    })
    if (bestI < 0) break
    const next = remaining.splice(bestI, 1)[0]
    const leg = routeBetween(graph, here.lngLat, next.stop.lngLat)
    if (!leg) continue
    meters += leg.meters
    for (const p of leg.coords.slice(1)) {
      const last = path[path.length - 1]
      if (last[0] !== p[0] || last[1] !== p[1]) path.push(p)
    }
    stops.push(next.stop)
    here = { lngLat: next.stop.lngLat, snap: next.snap }
  }
  if (stops.length === 0) return null
  return { start, stops, path, meters, minutes: walkMinutes(meters) }
}

/** 畫面上的距離說法：「約 120 公尺」「約 1.2 公里」（公尺四捨五入到 10，至少 10） */
export function distanceText(meters: number): string {
  if (meters >= 1000) return `約 ${(Math.round(meters / 100) / 10).toString()} 公里`
  return `約 ${Math.max(10, Math.round(meters / 10) * 10)} 公尺`
}

/** 路線上的標籤文字：「約 120 公尺・步行 2 分鐘」 */
export function routeLabel(r: Pick<Route, 'meters' | 'minutes'>): string {
  return `${distanceText(r.meters)}・步行 ${r.minutes} 分鐘`
}

/** 沿路線走到一半長度的那一點（放標籤用） */
export function routeMidpoint(coords: LngLat[]): LngLat {
  if (coords.length === 0) throw new Error('empty route')
  const legs = coords.slice(1).map((c, i) => distanceMeters(coords[i], c))
  let half = legs.reduce((a, b) => a + b, 0) / 2
  for (let i = 0; i < legs.length; i++) {
    if (half <= legs[i] && legs[i] > 0) {
      const t = half / legs[i]
      return [coords[i][0] + (coords[i + 1][0] - coords[i][0]) * t, coords[i][1] + (coords[i + 1][1] - coords[i][1]) * t]
    }
    half -= legs[i]
  }
  return coords[coords.length - 1]
}
