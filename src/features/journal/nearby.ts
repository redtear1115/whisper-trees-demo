import { boundsAround } from '../../lib/nearby'
import { distanceMeters, type LngLat } from '../../lib/geo'

/** 「附近的樹」找多遠、最多列幾棵 */
export const NEARBY_RADIUS_M = 150
export const NEARBY_MAX = 8
const TILE_Z = 16

export interface TreePoint {
  id: string
  lngLat: LngLat
}
export interface NearbyTree extends TreePoint {
  distance: number
}

/** 範圍內的樹，近到遠，最多 max 棵 */
export function pickNearby(points: TreePoint[], center: LngLat, radius = NEARBY_RADIUS_M, max = NEARBY_MAX): NearbyTree[] {
  const seen = new Set<string>()
  const rows: NearbyTree[] = []
  for (const p of points) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    const distance = distanceMeters(center, p.lngLat)
    if (distance <= radius) rows.push({ ...p, distance })
  }
  return rows.sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id)).slice(0, max)
}

/**
 * 按「留言」要去哪：這棵樹有有效的現場打卡（30 分鐘內）就進樹的頁面的樹洞；
 * 否則去掃樹牌，並帶上這棵樹當提示。留話一律要先打卡（QR + GPS）。
 */
export function leaveTarget(treeId: string, onSite: boolean): { to: string; state?: { hintTreeId: string } } {
  // 掃描頁從 location.state.hintTreeId 讀要打卡的樹（和地圖點樹的「掃樹牌」同一個介面）
  return onSite ? { to: `/tree/${treeId}#whisper` } : { to: '/scan', state: { hintTreeId: treeId } }
}

export type NearbyAction = 'leave' | 'walk' | 'route'

/**
 * 附近的樹那一列的按鈕：在打卡範圍內才是「留言」；太遠要先走過去——
 * Demo 是「走過去」（模擬位置移到樹旁），真實定位是「怎麼走」（回地圖畫出步行路線）。
 * radius 是和地圖感應圈、打卡判斷同一個半徑（ringRadius）。
 */
export function nearbyAction(distance: number, radius: number, demo: boolean): NearbyAction {
  if (distance <= radius) return 'leave'
  return demo ? 'walk' : 'route'
}

export const NEARBY_ACTION_LABEL: Record<NearbyAction, string> = { leave: '留言', walk: '走過去', route: '怎麼走' }

export function formatDistance(m: number): string {
  return `約 ${Math.max(1, Math.round(m))} 公尺`
}

// ---------- 圖磚（與地圖同一份 public/data/tree-tiles，z16，圖層 trees，屬性 id） ----------

function tileXY([lon, lat]: LngLat, z: number): [number, number] {
  const n = 2 ** z
  const x = Math.floor(((lon + 180) / 360) * n)
  const r = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)
  return [x, y]
}

export function tilesCovering(center: LngLat, radius: number, z = TILE_Z): [number, number][] {
  const [[w, s], [e, n]] = boundsAround(center, radius)
  const [x0, y0] = tileXY([w, n], z)
  const [x1, y1] = tileXY([e, s], z)
  const out: [number, number][] = []
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push([x, y])
  return out
}

class Reader {
  pos = 0
  end: number
  private b: Uint8Array
  constructor(b: Uint8Array) {
    this.b = b
    this.end = b.length
  }
  varint(): number {
    let r = 0
    let shift = 0
    for (;;) {
      const c = this.b[this.pos++]
      r += (c & 0x7f) * 2 ** shift
      if (c < 0x80) return r
      shift += 7
    }
  }
  bytes(): Uint8Array {
    const len = this.varint()
    const s = this.b.subarray(this.pos, this.pos + len)
    this.pos += len
    return s
  }
  skip(wire: number) {
    if (wire === 0) this.varint()
    else if (wire === 1) this.pos += 8
    else if (wire === 2) this.pos += this.varint()
    else if (wire === 5) this.pos += 4
  }
}

const dec = new TextDecoder()
const unzig = (n: number) => (n % 2 === 0 ? n / 2 : -(n + 1) / 2)

/** 解 Mapbox Vector Tile 裡 trees 圖層的點（只支援這份資料用到的：點、字串屬性 id）。 */
export function parseTreeTile(buf: Uint8Array, z: number, tx: number, ty: number): TreePoint[] {
  const out: TreePoint[] = []
  const tile = new Reader(buf)
  while (tile.pos < tile.end) {
    const tag = tile.varint()
    if (tag >> 3 !== 3 || (tag & 7) !== 2) {
      tile.skip(tag & 7)
      continue
    }
    const layer = new Reader(tile.bytes())
    let name = ''
    let extent = 4096
    const keys: string[] = []
    const values: string[] = []
    const features: Uint8Array[] = []
    while (layer.pos < layer.end) {
      const t = layer.varint()
      const f = t >> 3
      if (f === 1) name = dec.decode(layer.bytes())
      else if (f === 2) features.push(layer.bytes())
      else if (f === 3) keys.push(dec.decode(layer.bytes()))
      else if (f === 4) {
        const v = new Reader(layer.bytes())
        let s = ''
        while (v.pos < v.end) {
          const vt = v.varint()
          if (vt >> 3 === 1) s = dec.decode(v.bytes())
          else v.skip(vt & 7)
        }
        values.push(s)
      } else if (f === 5) extent = layer.varint()
      else layer.skip(t & 7)
    }
    if (name !== 'trees') continue
    const idKey = keys.indexOf('id')
    for (const fb of features) {
      const f = new Reader(fb)
      let tags: number[] = []
      let geom: number[] = []
      while (f.pos < f.end) {
        const t = f.varint()
        const fn = t >> 3
        if (fn === 2 || fn === 4) {
          const r = new Reader(f.bytes())
          const arr: number[] = []
          while (r.pos < r.end) arr.push(r.varint())
          if (fn === 2) tags = arr
          else geom = arr
        } else f.skip(t & 7)
      }
      let id = ''
      for (let i = 0; i + 1 < tags.length; i += 2) if (tags[i] === idKey) id = values[tags[i + 1]] ?? ''
      if (!id) continue
      // 點的幾何：MoveTo(count) 後接 count 組 zigzag 位移
      let x = 0
      let y = 0
      for (let i = 0; i < geom.length; ) {
        const count = geom[i++] >> 3
        for (let c = 0; c < count; c++) {
          x += unzig(geom[i++])
          y += unzig(geom[i++])
          const n = 2 ** z
          const lon = ((tx + x / extent) / n) * 360 - 180
          const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (ty + y / extent)) / n))) * 180) / Math.PI
          out.push({ id, lngLat: [lon, lat] })
        }
      }
    }
  }
  return out
}

/** 抓目前位置周圍的樹（缺的圖磚當作沒有樹）。 */
export async function loadNearbyTrees(center: LngLat, radius = NEARBY_RADIUS_M, max = NEARBY_MAX): Promise<NearbyTree[]> {
  const base = import.meta.env.BASE_URL
  const lists = await Promise.all(
    tilesCovering(center, radius).map(async ([x, y]) => {
      try {
        const r = await fetch(`${base}data/tree-tiles/${TILE_Z}/${x}/${y}.pbf`)
        if (!r.ok || (r.headers.get('content-type') ?? '').includes('html')) return []
        return parseTreeTile(new Uint8Array(await r.arrayBuffer()), TILE_Z, x, y)
      } catch {
        return []
      }
    }),
  )
  return pickNearby(lists.flat(), center, radius, max)
}
