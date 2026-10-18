import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MockTag } from '../components/ui'
import { DEMO } from '../config'

const BASE = import.meta.env.BASE_URL

interface Endpoint {
  path: string
  title: string
  fields: string
  mock?: boolean
  /** 試打時只顯示一小段 */
  pick?: (data: unknown) => unknown
}

const ENDPOINTS: Endpoint[] = [
  {
    path: 'api/v1/index.json',
    title: '端點清單與授權',
    fields: 'name, version, data_date, license, endpoints',
  },
  {
    path: `data/trees/${DEMO.treeId.slice(0, 2)}.json`,
    title: '樹籍查詢（依樹籍編號前 2 碼分檔）',
    fields:
      'species: 樹種名稱陣列；trees: { TreeID: [經度, 緯度, 樹種索引, 胸徑 cm, 樹高 m, 路名或公園, 位置備註, street|park, 調查日期, 行政區] }',
    pick: (d) => {
      const data = d as { species: string[]; trees: Record<string, unknown[]> }
      const row = data.trees[DEMO.treeId]
      return { species: `（共 ${data.species.length} 種）`, trees: { [DEMO.treeId]: row }, _note: `檔案共 ${Object.keys(data.trees).length} 棵，這裡只顯示 ${DEMO.treeId}` }
    },
  },
  {
    path: 'data/pits-empty.geojson',
    title: '候選空樹穴（GeoJSON 點）',
    fields: 'pit_id, district, road, road_inferred, area_m2, source',
    pick: (d) => {
      const fc = d as { features: unknown[] }
      return { type: 'FeatureCollection', _count: fc.features.length, features: fc.features.slice(0, 2) }
    },
  },
  {
    path: 'api/v1/districts.json',
    title: '行政區統計',
    fields: 'district, street_trees, all_trees, sidewalk_km, trees_per_km, empty_pits',
  },
  {
    path: 'api/v1/species.json',
    title: '樹種統計',
    fields: 'species, count, street, park',
    pick: (d) => (d as unknown[]).slice(0, 5),
  },
  {
    path: 'api/v1/wishes.json',
    title: '許願與補種進度',
    fields: 'id, pit_id, lng, lat, road, district, reasons, waterings, status, status_label, reason',
    mock: true,
  },
]

export default function DevelopersPage() {
  return (
    <div className="console">
      <header className="gov-head">
        <div>
          <h1>開放資料 API</h1>
          <p className="muted small">靜態 JSON，免金鑰、可跨網域讀取。版本 v1・資料日期 2026-10-16</p>
        </div>
        <nav className="row gap">
          <Link className="btn small" to="/more">
            更多
          </Link>
        </nav>
      </header>

      <section>
        <h2>說明</h2>
        <ul>
          <li>樹木、樹穴、行政區統計由臺北市政府開放資料推算，依政府資料開放授權條款第 1 版使用；公園範圍為 OSM 衍生資料（ODbL 1.0）。</li>
          <li>
            許願與補種進度目前是<strong>模擬</strong>資料（Demo 用的固定快照）。
          </li>
          <li>地圖用的樹木點位是向量圖磚：<code>/data/tree-tiles/{'{z}/{x}/{y}'}.pbf</code>（z10–16，圖層 trees，屬性 id、k）。</li>
          <li>
            政府端日後可用同一份格式接回補種案件狀態，市民端與第三方 App 就能直接讀。
          </li>
        </ul>
      </section>

      {ENDPOINTS.map((e) => (
        <EndpointCard key={e.path} e={e} />
      ))}
    </div>
  )
}

function EndpointCard({ e }: { e: Endpoint }) {
  const [out, setOut] = useState<string | null>(null)
  const url = `${location.origin}${BASE}${e.path}`
  return (
    <section>
      <h2>
        {e.title} {e.mock && <MockTag />}
      </h2>
      <p className="mono small">GET {url}</p>
      <p className="small muted">欄位：{e.fields}</p>
      <pre className="code">curl -s {url}</pre>
      <button
        className="btn small primary"
        onClick={async () => {
          setOut('讀取中…')
          try {
            const r = await fetch(`${BASE}${e.path}`)
            const data = await r.json()
            setOut(`HTTP ${r.status}\n${JSON.stringify(e.pick ? e.pick(data) : data, null, 2).slice(0, 3000)}`)
          } catch (err) {
            setOut(`失敗：${String(err)}`)
          }
        }}
      >
        試打
      </button>
      {out && <pre className="code">{out}</pre>}
    </section>
  )
}
