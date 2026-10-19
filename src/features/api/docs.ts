// /developers 的文件內容：端點、範例回應、curl、MCP 設定範例。示意資料，欄位和閘道實際回的一致。

import type { GatewayRequest } from './gateway'

export const API_ORIGIN = 'https://whisper-trees.pages.dev'
export const MCP_URL = `${API_ORIGIN}/mcp`

export interface ParamDoc {
  name: string
  where: 'path' | 'query' | 'body'
  type: string
  desc: string
  required?: boolean
}

export interface EndpointDoc {
  method: 'GET' | 'PATCH' | 'POST'
  path: string
  title: string
  /** 擇一即可；顯示用 */
  scopes: string[]
  note?: string
  params: ParamDoc[]
  /** 範例請求 body */
  body?: unknown
  /** 範例回應（節錄） */
  response: unknown
  mcp: string
}

const PAGE: ParamDoc[] = [
  { name: 'limit', where: 'query', type: 'integer', desc: '每頁筆數，1–200，預設 50' },
  { name: 'offset', where: 'query', type: 'integer', desc: '略過幾筆，預設 0' },
]

const CASE = {
  id: 'mock-5',
  pit_id: 'P-0213',
  location: { lng: 121.5254, lat: 25.0326 },
  road: '羅斯福路二段',
  district: '中正區',
  reasons: ['通學', '太曬'],
  feasibility: 'emptyPit',
  waterings: 41,
  status: 'received',
  status_label: '已收件',
  created_at: '2026-10-09T03:12:44.000Z',
  updated_at: '2026-10-09T03:12:44.000Z',
  source: 'mock',
}

const WORK_ORDER = {
  id: 'wo_wish_mock-1',
  type: 'planting',
  case_id: 'mock-1',
  title: '補種：中正區 羅斯福路二段',
  district: '中正區',
  road: '羅斯福路二段',
  status: 'pending',
  vendor_id: 'green-field',
  vendor_name: '綠野造園',
}

export const ENDPOINT_DOCS: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/api/v1/hotspots',
    title: '需求熱點',
    scopes: ['hotspots:read'],
    note: '依路段彙整未結案的許願（已種植、不可種的不算），依澆水數由高到低。',
    params: [{ name: 'district', where: 'query', type: 'string', desc: '行政區，例如 中正區' }, ...PAGE],
    response: {
      data: [
        {
          road: '羅斯福路二段',
          district: '中正區',
          open_cases: 2,
          waterings: 58,
          reasons: { 通學: 1, 太曬: 2 },
          centroid: { lng: 121.5254, lat: 25.0326 },
          case_ids: ['mock-5', 'mock-6'],
        },
      ],
      meta: { total: 6, limit: 50, offset: 0 },
    },
    mcp: 'list_hotspots',
  },
  {
    method: 'GET',
    path: '/api/v1/priorities',
    title: '補種優先分數',
    scopes: ['priorities:read'],
    note: '四項正規化到 0–1 後加權（算法見 06 政府端規格）。權重用查詢參數調整，會自動換算成比例；預設各 25。',
    params: [
      { name: 'demand', where: 'query', type: 'number 0–100', desc: '市民需求權重' },
      { name: 'shade', where: 'query', type: 'number 0–100', desc: '遮蔭缺口權重' },
      { name: 'feasibility', where: 'query', type: 'number 0–100', desc: '可行性權重' },
      { name: 'fairness', where: 'query', type: 'number 0–100', desc: '公平性權重' },
      { name: 'include_closed', where: 'query', type: 'boolean', desc: '含已種植、不可種的案件，預設 false' },
      ...PAGE,
    ],
    response: {
      data: [
        {
          rank: 1,
          case_id: 'mock-5',
          road: '羅斯福路二段',
          district: '中正區',
          status: 'received',
          score: 78.4,
          parts: { demand: 1, shade: 0.62, feasibility: 1, fairness: 0.5 },
        },
      ],
      meta: { total: 7, limit: 50, offset: 0, weights: { demand: 25, shade: 25, feasibility: 25, fairness: 25 } },
    },
    mcp: 'get_priorities',
  },
  {
    method: 'GET',
    path: '/api/v1/cases',
    title: '案件列表',
    scopes: ['cases:read'],
    note: '案件就是市民的許願。status：received 已收件、surveying 會勘中、scheduled 可種・已排程、planted 已種植、rejected 不可種。',
    params: [
      { name: 'status', where: 'query', type: 'string', desc: '依狀態篩選' },
      { name: 'district', where: 'query', type: 'string', desc: '依行政區篩選' },
      ...PAGE,
    ],
    response: { data: [CASE], meta: { total: 8, limit: 50, offset: 0 } },
    mcp: 'list_cases',
  },
  {
    method: 'GET',
    path: '/api/v1/cases/{id}',
    title: '案件明細',
    scopes: ['cases:read'],
    params: [{ name: 'id', where: 'path', type: 'string', desc: '案件 id', required: true }],
    response: {
      ...CASE,
      history: [{ status: 'received', status_label: '已收件', at: '2026-10-09T03:12:44.000Z' }],
      score: { total: 78.4, demand: 1, shade: 0.62, feasibility: 1, fairness: 0.5 },
    },
    mcp: '（list_cases 的 status 篩選；明細用 REST）',
  },
  {
    method: 'PATCH',
    path: '/api/v1/cases/{id}',
    title: '修改案件狀態',
    scopes: ['cases:write'],
    note: '改成 rejected（不可種）時 reason 必填，否則回 422。寫入和政府端畫面用同一個函式，市民端「我的許願」會即時更新。',
    params: [
      { name: 'id', where: 'path', type: 'string', desc: '案件 id', required: true },
      { name: 'status', where: 'body', type: 'string', desc: 'received | surveying | scheduled | planted | rejected', required: true },
      { name: 'reason', where: 'body', type: 'string ≤200', desc: '原因；rejected 必填' },
    ],
    body: { status: 'surveying' },
    response: {
      ...CASE,
      status: 'surveying',
      status_label: '會勘中',
      updated_at: '2026-10-20T04:30:00.000Z',
      history: [
        { status: 'received', status_label: '已收件', at: '2026-10-09T03:12:44.000Z' },
        { status: 'surveying', status_label: '會勘中', at: '2026-10-20T04:30:00.000Z' },
      ],
    },
    mcp: 'update_case_status',
  },
  {
    method: 'GET',
    path: '/api/v1/reports',
    title: '樹況回報列表',
    scopes: ['reports:read'],
    note: '含市民填的備註（承辦人才看得到）。每筆回報同時是一張養護工單。',
    params: [
      { name: 'kind', where: 'query', type: 'string', desc: 'pruning 樹木修剪問題 | pest 病蟲害 | shade 遮蔭太多或修剪過度 | sprout 新長枝芽擋路 | other 其他（舊資料的 sick 會歸到 pest 或 other）' },
      { name: 'district', where: 'query', type: 'string', desc: '依行政區篩選' },
      ...PAGE,
    ],
    response: {
      data: [
        {
          id: 'mock-r1',
          tree_id: 'DA0030211041',
          species: '茄苳',
          road: '信義路二段',
          district: '大安區',
          kind: 'shade',
          kind_label: '遮蔭太多，或修剪過度',
          details: ['修剪過度'],
          note: '整排剪到只剩樹幹，公車站完全沒有樹蔭了。',
          has_photo: true,
          reported_at: '2026-10-17T02:00:00.000Z',
          review_status: 'open',
          work_order_id: 'wo_report_mock-r1',
          work_order_status: 'pending',
        },
      ],
      meta: { total: 4, limit: 50, offset: 0 },
    },
    mcp: 'list_reports',
  },
  {
    method: 'PATCH',
    path: '/api/v1/reports/{id}',
    title: '處理樹況回報',
    scopes: ['reports:write'],
    note: '標示處理狀態：open 未處理、acknowledged 已受理、dismissed 駁回（reason 必填）。',
    params: [
      { name: 'id', where: 'path', type: 'string', desc: '回報 id', required: true },
      { name: 'status', where: 'body', type: 'string', desc: 'open | acknowledged | dismissed', required: true },
      { name: 'reason', where: 'body', type: 'string ≤200', desc: '原因；dismissed 必填' },
    ],
    body: { status: 'acknowledged' },
    response: { id: 'mock-r1', review_status: 'acknowledged', work_order_id: 'wo_report_mock-r1', work_order_status: 'pending', '…': '其餘欄位同列表' },
    mcp: 'update_report',
  },
  {
    method: 'GET',
    path: '/api/v1/work-orders',
    title: '工單列表',
    scopes: ['workorders:read', 'workorders:own:read'],
    note: '補種工單（案件排成「可種・已排程」就出現）與養護工單（樹況回報）。有 workorders:read 看全部；只有 workorders:own:read（廠商）只看得到指派給自己廠商的。status：pending、accepted、in_progress、done。',
    params: [
      { name: 'status', where: 'query', type: 'string', desc: 'pending | accepted | in_progress | done' },
      { name: 'type', where: 'query', type: 'string', desc: 'planting | care' },
      ...PAGE,
    ],
    response: { data: [WORK_ORDER], meta: { total: 12, limit: 50, offset: 0 } },
    mcp: 'list_work_orders',
  },
  {
    method: 'POST',
    path: '/api/v1/work-orders/{id}/accept',
    title: '接單',
    scopes: ['workorders:write', 'workorders:own:write'],
    note: 'pending → accepted。狀態不對回 409；別家廠商的工單回 404。',
    params: [{ name: 'id', where: 'path', type: 'string', desc: '工單 id', required: true }],
    response: { ...WORK_ORDER, status: 'accepted', updated_at: '2026-10-20T04:31:00.000Z' },
    mcp: 'update_work_order（action: accept）',
  },
  {
    method: 'POST',
    path: '/api/v1/work-orders/{id}/progress',
    title: '開始施工',
    scopes: ['workorders:write', 'workorders:own:write'],
    note: 'accepted → in_progress。',
    params: [{ name: 'id', where: 'path', type: 'string', desc: '工單 id', required: true }],
    response: { ...WORK_ORDER, status: 'in_progress', updated_at: '2026-10-20T04:32:00.000Z' },
    mcp: 'update_work_order（action: progress）',
  },
  {
    method: 'POST',
    path: '/api/v1/work-orders/{id}/complete',
    title: '完工回報',
    scopes: ['workorders:write', 'workorders:own:write'],
    note: 'in_progress → done。補種工單完工後，案件狀態同一次改成「已種植」，市民端即時更新。',
    params: [
      { name: 'id', where: 'path', type: 'string', desc: '工單 id', required: true },
      { name: 'note', where: 'body', type: 'string ≤140', desc: '完工說明' },
    ],
    body: { note: '種下茄苳一棵，已立支架' },
    response: { ...WORK_ORDER, status: 'done', completion_note: '種下茄苳一棵，已立支架', updated_at: '2026-10-20T05:10:00.000Z' },
    mcp: 'update_work_order（action: complete）',
  },
]

export const TOKEN_ERRORS: [string, string, string][] = [
  ['400', 'invalid_request', '缺 grant_type、body 格式不對'],
  ['400', 'unsupported_grant_type', '只支援 client_credentials'],
  ['400', 'invalid_scope', '要求的 scope 超出這個用戶端被核發的範圍'],
  ['401', 'invalid_client', 'client_id 或 client_secret 錯誤，或用戶端已撤銷'],
]

export const API_ERRORS: [string, string, string][] = [
  ['401', 'unauthorized', '沒帶 Authorization: Bearer（WWW-Authenticate 不含 error）'],
  ['401', 'invalid_token', 'token 不存在、已過期，或它的用戶端已撤銷（WWW-Authenticate: Bearer error="invalid_token"）'],
  ['403', 'insufficient_scope', 'token 的 scope 不夠；WWW-Authenticate 的 scope 欄列出需要的 scope'],
  ['404', 'not_found', 'id 不存在，或是別家廠商的工單'],
  ['405', 'method_not_allowed', '路徑對、方法不對'],
  ['409', 'invalid_state', '工單狀態不能這樣推進（例如還沒接單就施工）'],
  ['422', 'validation_failed', 'body 欄位不合規則（含 rejected 沒填 reason），回應有 field'],
  ['400', 'invalid_request', '查詢參數或 JSON 格式錯誤'],
]

export function curlOf(req: GatewayRequest, origin = API_ORIGIN): string {
  const lines = [`curl -s -X ${req.method.toUpperCase()} '${origin}${req.url}'`]
  for (const [k, v] of Object.entries(req.headers ?? {})) lines.push(`  -H '${k}: ${v}'`)
  if (req.body !== undefined && req.body !== '') {
    const form = typeof req.body === 'string' && !req.body.trim().startsWith('{')
    if (form) lines.push(`  -d '${req.body}'`)
    else {
      lines.push(`  -H 'Content-Type: application/json'`)
      lines.push(`  -d '${typeof req.body === 'string' ? req.body.replace(/\s*\n\s*/g, ' ') : JSON.stringify(req.body)}'`)
    }
  }
  return lines.join(' \\\n')
}

export const CLAUDE_CODE_CONFIG = `{
  "mcpServers": {
    "whisper-trees": {
      "type": "http",
      "url": "${MCP_URL}",
      "headers": { "Authorization": "Bearer <access_token>" }
    }
  }
}`

export const CLAUDE_DESKTOP_CONFIG = `{
  "mcpServers": {
    "whisper-trees": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote", "${MCP_URL}",
        "--header", "Authorization: Bearer \${WT_TOKEN}"
      ],
      "env": { "WT_TOKEN": "<access_token>" }
    }
  }
}`

export const GENERIC_MCP_CONFIG = `POST ${MCP_URL}
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json, text/event-stream

{"jsonrpc":"2.0","id":1,"method":"tools/list"}`
