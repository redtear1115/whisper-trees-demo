import { useState } from 'react'
import { AdminNav } from '../components/AdminNav'
import { MockTag } from '../components/ui'
import { DEMO } from '../config'
import { DEMO_CREDENTIALS } from '../features/api/clients'
import {
  API_ERRORS, API_ORIGIN, CLAUDE_CODE_CONFIG, CLAUDE_DESKTOP_CONFIG, ENDPOINT_DOCS, GENERIC_MCP_CONFIG, MCP_URL, TOKEN_ERRORS, curlOf,
  type EndpointDoc,
} from '../features/api/docs'
import { McpConsole, RestConsole, TokenPanel } from '../features/api/Playground'
import { MCP_TOOLS } from '../features/api/mcp'
import { GOV_SCOPES, SCOPE_LABEL, VENDOR_SCOPES } from '../features/api/scopes'
import { TOKEN_TTL_SECONDS } from '../features/api/tokens'

const BASE = import.meta.env.BASE_URL

const SECTIONS = [
  ['overview', '概覽'],
  ['auth', '驗證'],
  ['endpoints', '端點'],
  ['play', '試打 console'],
  ['mcp', 'MCP'],
  ['open-data', '開放資料下載'],
] as const

export default function DevelopersPage() {
  const [token, setToken] = useState('')
  return (
    <div className="console dev">
      <header className="gov-head">
        <div>
          <h1>
            開放 API <MockTag title="沒有真的伺服器：所有請求由這個網頁裡的模擬閘道處理" />
          </h1>
          <p className="muted small">版本 v1・政府端系統與承包廠商用 OAuth 2.0 讀寫補種案件</p>
        </div>
        <AdminNav />
      </header>

      <nav className="dev-toc" aria-label="本頁章節">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="chip">
            {label}
          </a>
        ))}
      </nav>

      <Overview />
      <Auth />
      <Endpoints />
      <section id="play">
        <h2>
          試打 console <MockTag />
        </h2>
        <p className="small">
          選一個示範用戶端（或貼上在 <a href={`${BASE}gov`}>/gov</a> 建立用戶端時顯示的那一次 secret），取得 token，再呼叫端點。
          <strong>寫入是真的寫進這個瀏覽器的資料</strong>：用 PATCH 改案件狀態後，到 <a href={`${BASE}gov`}>/gov</a> 就看得到；廠商完工後，市民端「我的許願」變成已種植。
        </p>
        <TokenPanel token={token} setToken={setToken} />
        <RestConsole token={token} />
      </section>
      <Mcp token={token} setToken={setToken} />
      <OpenData />
    </div>
  )
}

function Overview() {
  return (
    <section id="overview">
      <h2>概覽</h2>
      <p>
        目的：政府端既有系統（公園處）與承包廠商<strong>不用進我們的網站</strong>，直接用 API 讀寫補種案件、樹況回報與工單。
        用的是 OAuth 2.0 的 <strong>client credentials</strong>（機器對機器，沒有使用者登入）。
      </p>
      <pre className="code">{`① 用戶端  ── POST /oauth/token ──▶  授權端點
          （client_id + client_secret）
② 用戶端  ◀── access_token（${TOKEN_TTL_SECONDS / 3600} 小時有效）── 授權端點
③ 用戶端  ── GET /api/v1/...  ──▶  API
          （Authorization: Bearer <access_token>）
④ 用戶端  ◀── JSON（依 token 的 scope 與角色篩選）── API

AI 助理改走：POST /mcp（同一個 token，工具對應端點）`}</pre>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>角色</th>
              <th>scope</th>
              <th>能做什麼</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>政府系統</td>
              <td className="mono small">{GOV_SCOPES.join(' ')}</td>
              <td>讀熱點、優先分數、案件、回報、全部工單；改案件狀態、處理回報、推進任何工單</td>
            </tr>
            <tr>
              <td>廠商（綁定一家廠商）</td>
              <td className="mono small">{VENDOR_SCOPES.join(' ')}</td>
              <td>只看得到指派給自己廠商的工單，能接單、開始施工、完工回報；其餘端點一律 403</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul>
        <li>
          用戶端由承辦人在 <a href={`${BASE}gov`}>/gov</a>「API 用戶端」建立：名稱、類型、scope；client_secret <strong>只顯示一次</strong>，
          系統只存它的 SHA-256 與最後 4 碼，可重新產生或撤銷。廠商在 <a href={`${BASE}vendor`}>/vendor</a> 看得到發給自己的用戶端（不含 secret）。
        </li>
        <li>
          <strong>這一頁是模擬</strong>：沒有伺服器，<code>{API_ORIGIN}/api/v1</code> 與 <code>/oauth/token</code> 都只是示意網址；
          試打由網頁裡的閘道處理，token、用戶端與呼叫紀錄只存在這台裝置，重新整理後 token 失效。資料與寫入是真的接 store，
          和政府端、發包商、市民端畫面共用。
        </li>
        <li>
          示範用戶端的 secret 是公開的（見下方「驗證」）；你自己建立的用戶端才有只顯示一次的 secret。
        </li>
      </ul>
    </section>
  )
}

function Auth() {
  const demo = DEMO_CREDENTIALS[0]
  const tokenReq = {
    method: 'POST',
    url: '/oauth/token',
    headers: { Authorization: 'Basic <base64(client_id:client_secret)>' },
    body: 'grant_type=client_credentials&scope=cases:read cases:write',
  }
  return (
    <section id="auth">
      <h2>驗證</h2>
      <h3>取得 token</h3>
      <p className="small">
        <code>POST /oauth/token</code>，<code>grant_type=client_credentials</code>。用戶端用 HTTP Basic 或表單欄位 <code>client_id</code>／<code>client_secret</code> 驗證。
        <code>scope</code> 選填（空白分隔），不填就是這個用戶端被核發的全部；要求超出範圍回 <code>invalid_scope</code>。
      </p>
      <pre className="code">{curlOf(tokenReq)}</pre>
      <pre className="code">{`HTTP 200
Cache-Control: no-store

{
  "access_token": "wt_at_9f2c…",
  "token_type": "Bearer",
  "expires_in": ${TOKEN_TTL_SECONDS},
  "scope": "cases:read cases:write"
}`}</pre>
      <h3>帶著 token 呼叫</h3>
      <pre className="code">{`curl -s '${API_ORIGIN}/api/v1/cases?status=received' \\
  -H 'Authorization: Bearer wt_at_9f2c…'`}</pre>
      <p className="small">token 有效 {TOKEN_TTL_SECONDS / 60} 分鐘，過期重新取得（沒有 refresh token）。</p>

      <h3>示範用戶端（公開，只能用在這個模擬）</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>client_id</th>
              <th>client_secret</th>
              <th>角色</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_CREDENTIALS.map((d) => (
              <tr key={d.clientId}>
                <td className="mono">{d.clientId}</td>
                <td className="mono">{d.secret}</td>
                <td>{d.label.replace('示範・', '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">例：{demo.clientId} 可用 Basic：<span className="mono">{btoa(`${demo.clientId}:${demo.secret}`)}</span></p>

      <h3>錯誤</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>token 端點</th>
              <th>error</th>
              <th>情形</th>
            </tr>
          </thead>
          <tbody>
            {TOKEN_ERRORS.map(([s, e, d]) => (
              <tr key={e}>
                <td>{s}</td>
                <td className="mono">{e}</td>
                <td>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>API</th>
              <th>error</th>
              <th>情形</th>
            </tr>
          </thead>
          <tbody>
            {API_ERRORS.map(([s, e, d]) => (
              <tr key={e}>
                <td>{s}</td>
                <td className="mono">{e}</td>
                <td>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">錯誤回應格式：<code>{'{ "error": "...", "error_description": "..." }'}</code>，依 RFC 6749／6750。</p>
    </section>
  )
}

function Endpoints() {
  return (
    <section id="endpoints">
      <h2>端點</h2>
      <p className="small">
        基底網址 <code>{API_ORIGIN}</code>（示意）。列表回 <code>{'{ data, meta }'}</code>；時間一律 ISO 8601（UTC）。scope 欄是「擇一即可」。
      </p>
      {ENDPOINT_DOCS.map((e) => (
        <EndpointCard key={`${e.method} ${e.path}`} e={e} />
      ))}
    </section>
  )
}

function EndpointCard({ e }: { e: EndpointDoc }) {
  const url = e.path.replace('{id}', 'mock-5')
  return (
    <article className="endpoint">
      <h3>
        <span className={`method m-${e.method}`}>{e.method}</span> <code>{e.path}</code>
        <span className="ep-title">{e.title}</span>
      </h3>
      <p className="small">
        scope：{e.scopes.map((s) => (
          <code key={s} className="scope-chip" title={SCOPE_LABEL[s as keyof typeof SCOPE_LABEL]}>
            {s}
          </code>
        ))}
        ・MCP 工具：<code>{e.mcp}</code>
      </p>
      {e.note && <p className="small">{e.note}</p>}
      {e.params.length > 0 && (
        <div className="table-wrap">
          <table className="params">
            <tbody>
              {e.params.map((p) => (
                <tr key={p.name}>
                  <td className="mono">
                    {p.name}
                    {p.required && <span className="req">*</span>}
                  </td>
                  <td className="muted small">{p.where}</td>
                  <td className="mono small">{p.type}</td>
                  <td className="small">{p.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <details>
        <summary>curl 與範例回應</summary>
        <pre className="code">{curlOf({ method: e.method, url, headers: { Authorization: 'Bearer <access_token>' }, body: e.body })}</pre>
        <pre className="code">{JSON.stringify(e.response, null, 2)}</pre>
      </details>
    </article>
  )
}

function Mcp({ token, setToken }: { token: string; setToken: (t: string) => void }) {
  return (
    <section id="mcp">
      <h2>
        MCP <MockTag title="文件與前端模擬，沒有真的 MCP server" />
      </h2>
      <p className="small">
        讓政府端或廠商的 AI 助理（例如 Claude）直接查案件、改狀態。MCP server 的網址是 <code>{MCP_URL}</code>
        （Streamable HTTP）。<strong>這是示意，網址並沒有真的服務</strong>；下面的「MCP 試用」用同一個模擬閘道跑 JSON-RPC。
        授權和 REST 一樣：<code>Authorization: Bearer &lt;access_token&gt;</code>，工具只列出 token 的 scope 用得到的 ——
        廠商 token 只看得到 <code>list_work_orders</code>、<code>update_work_order</code>，呼叫別的工具會當作不存在。
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>工具</th>
              <th>需要的 scope（擇一）</th>
              <th>對應端點</th>
              <th>說明</th>
            </tr>
          </thead>
          <tbody>
            {MCP_TOOLS.map((t) => (
              <tr key={t.name}>
                <td className="mono">{t.name}</td>
                <td className="mono small">{t.scopes.join('、')}</td>
                <td className="mono small">{t.rest}</td>
                <td className="small">{t.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details>
        <summary>每個工具的 JSON Schema（inputSchema）</summary>
        {MCP_TOOLS.map((t) => (
          <div key={t.name}>
            <p className="mono small">{t.name}</p>
            <pre className="code">{JSON.stringify(t.inputSchema, null, 2)}</pre>
          </div>
        ))}
      </details>
      <h3>用戶端設定範例</h3>
      <p className="small muted">
        token 只有 {TOKEN_TTL_SECONDS / 60} 分鐘；正式使用時由支援 OAuth client credentials 的 MCP 用戶端自己換 token，下面把 token 寫死只是示範。
      </p>
      <p className="small">Claude Code（<code>.mcp.json</code>）</p>
      <pre className="code">{CLAUDE_CODE_CONFIG}</pre>
      <p className="small">Claude Desktop（<code>claude_desktop_config.json</code>，用 mcp-remote 轉接）</p>
      <pre className="code">{CLAUDE_DESKTOP_CONFIG}</pre>
      <p className="small">其他 MCP 用戶端（HTTP 請求）</p>
      <pre className="code">{GENERIC_MCP_CONFIG}</pre>
      <McpConsole token={token} setToken={setToken} />
    </section>
  )
}

// ---------- 開放資料下載（靜態 JSON，免授權） ----------

interface Download {
  path: string
  title: string
  fields: string
  mock?: boolean
  /** 試打時只顯示一小段 */
  pick?: (data: unknown) => unknown
}

const DOWNLOADS: Download[] = [
  { path: 'api/v1/index.json', title: '端點清單與授權', fields: 'name, version, data_date, license, endpoints' },
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
  { path: 'api/v1/districts.json', title: '行政區統計', fields: 'district, street_trees, all_trees, sidewalk_km, trees_per_km, empty_pits' },
  { path: 'api/v1/species.json', title: '樹種統計', fields: 'species, count, street, park', pick: (d) => (d as unknown[]).slice(0, 5) },
  {
    path: 'api/v1/wishes.json',
    title: '許願與補種進度（固定快照）',
    fields: 'id, pit_id, lng, lat, road, district, reasons, waterings, status, status_label, reason',
    mock: true,
  },
]

function OpenData() {
  return (
    <section id="open-data">
      <h2>開放資料下載</h2>
      <p className="muted small">靜態 JSON，免授權、可跨網域讀取。版本 v1・資料日期 2026-10-16。和上面需要 token 的 API 是兩回事。</p>
      <ul className="small">
        <li>樹木、樹穴、行政區統計由臺北市政府開放資料推算，依政府資料開放授權條款第 1 版使用；公園範圍為 OSM 衍生資料（ODbL 1.0）。</li>
        <li>
          許願與補種進度是<strong>模擬</strong>資料（固定快照，不會隨上面的 API 改動）。
        </li>
        <li>地圖用的樹木點位是向量圖磚：<code>/data/tree-tiles/{'{z}/{x}/{y}'}.pbf</code>（z10–16，圖層 trees，屬性 id、k）。</li>
      </ul>
      {DOWNLOADS.map((e) => (
        <DownloadCard key={e.path} e={e} />
      ))}
    </section>
  )
}

function DownloadCard({ e }: { e: Download }) {
  const [out, setOut] = useState<string | null>(null)
  const url = `${location.origin}${BASE}${e.path}`
  return (
    <article className="endpoint">
      <h3>
        {e.title} {e.mock && <MockTag />}
      </h3>
      <p className="mono small wrap-anywhere">GET {url}</p>
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
    </article>
  )
}
