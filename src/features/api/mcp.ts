// MCP（Model Context Protocol）示意：Streamable HTTP 端點 /mcp 的 JSON-RPC 處理。
// 不是真的 MCP server（沒有伺服器），而是在瀏覽器裡用同一個閘道模擬：
// 授權沿用 OAuth Bearer token，tools/list 只列 token 的 scope 用得到的工具，tools/call 轉成對應的 REST 請求。

import { authenticate, handleRequest, type GatewayDeps, type GatewayResponse } from './gateway'
import { hasAnyScope, type Scope } from './scopes'

export const MCP_PROTOCOL_VERSION = '2025-06-18'

interface Schema {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
  additionalProperties: false
}

export interface McpTool {
  name: string
  description: string
  inputSchema: Schema
  /** token 至少要有其中一個才看得到、用得到 */
  scopes: Scope[]
  /** 對應的 REST 請求 */
  rest: string
  build: (a: Record<string, unknown>) => { method: string; url: string; body?: unknown }
}

const limit = { type: 'integer', minimum: 1, maximum: 200, description: '每頁筆數，預設 50' }
const offset = { type: 'integer', minimum: 0, description: '略過幾筆' }
const district = { type: 'string', description: '行政區，例如「大安區」' }
const weight = (label: string) => ({ type: 'number', minimum: 0, maximum: 100, description: `${label}權重，預設 25` })

function qs(a: Record<string, unknown>, keys: string[]): string {
  const p = new URLSearchParams()
  for (const k of keys) if (a[k] !== undefined && a[k] !== null && a[k] !== '') p.set(k, String(a[k]))
  const s = p.toString()
  return s ? `?${s}` : ''
}

const WO_READ: Scope[] = ['workorders:read', 'workorders:own:read']
const WO_WRITE: Scope[] = ['workorders:write', 'workorders:own:write']

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'list_hotspots',
    description: '列出市民需求熱點：依路段彙整未結案的許願，依澆水數由高到低。',
    inputSchema: { type: 'object', properties: { district, limit, offset }, additionalProperties: false },
    scopes: ['hotspots:read'],
    rest: 'GET /api/v1/hotspots',
    build: (a) => ({ method: 'GET', url: `/api/v1/hotspots${qs(a, ['district', 'limit', 'offset'])}` }),
  },
  {
    name: 'get_priorities',
    description: '取得補種優先分數排行。四項權重可調（0–100，會自動換算成比例），預設各 25。',
    inputSchema: {
      type: 'object',
      properties: {
        demand: weight('市民需求'),
        shade: weight('遮蔭缺口'),
        feasibility: weight('可行性'),
        fairness: weight('公平性'),
        include_closed: { type: 'boolean', description: '是否包含已種植、不可種的案件，預設 false' },
        limit,
        offset,
      },
      additionalProperties: false,
    },
    scopes: ['priorities:read'],
    rest: 'GET /api/v1/priorities',
    build: (a) => ({
      method: 'GET',
      url: `/api/v1/priorities${qs(a, ['demand', 'shade', 'feasibility', 'fairness', 'include_closed', 'limit', 'offset'])}`,
    }),
  },
  {
    name: 'list_cases',
    description: '列出補種案件（市民許願），可依狀態、行政區篩選。',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['received', 'surveying', 'scheduled', 'planted', 'rejected'], description: '案件狀態' },
        district,
        limit,
        offset,
      },
      additionalProperties: false,
    },
    scopes: ['cases:read'],
    rest: 'GET /api/v1/cases',
    build: (a) => ({ method: 'GET', url: `/api/v1/cases${qs(a, ['status', 'district', 'limit', 'offset'])}` }),
  },
  {
    name: 'update_case_status',
    description: '修改案件狀態。改成 rejected（不可種）時 reason 必填。市民端「我的許願」會即時更新。',
    inputSchema: {
      type: 'object',
      properties: {
        case_id: { type: 'string', description: '案件 id' },
        status: { type: 'string', enum: ['received', 'surveying', 'scheduled', 'planted', 'rejected'] },
        reason: { type: 'string', maxLength: 200, description: '原因；status 為 rejected 時必填' },
      },
      required: ['case_id', 'status'],
      additionalProperties: false,
    },
    scopes: ['cases:write'],
    rest: 'PATCH /api/v1/cases/{id}',
    build: (a) => ({
      method: 'PATCH',
      url: `/api/v1/cases/${encodeURIComponent(String(a.case_id ?? ''))}`,
      body: { status: a.status, ...(a.reason !== undefined ? { reason: a.reason } : {}) },
    }),
  },
  {
    name: 'list_reports',
    description: '列出市民的樹況回報（樹木修剪問題、病蟲害、遮蔭太多或修剪過度、新長枝芽擋路、其他）。',
    inputSchema: {
      type: 'object',
      properties: { kind: { type: 'string', enum: ['pruning', 'pest', 'shade', 'sprout', 'other'] }, district, limit, offset },
      additionalProperties: false,
    },
    scopes: ['reports:read'],
    rest: 'GET /api/v1/reports',
    build: (a) => ({ method: 'GET', url: `/api/v1/reports${qs(a, ['kind', 'district', 'limit', 'offset'])}` }),
  },
  {
    name: 'update_report',
    description: '處理一筆樹況回報：標示已受理（acknowledged）或駁回（dismissed，reason 必填）。',
    inputSchema: {
      type: 'object',
      properties: {
        report_id: { type: 'string' },
        status: { type: 'string', enum: ['open', 'acknowledged', 'dismissed'] },
        reason: { type: 'string', maxLength: 200 },
      },
      required: ['report_id', 'status'],
      additionalProperties: false,
    },
    scopes: ['reports:write'],
    rest: 'PATCH /api/v1/reports/{id}',
    build: (a) => ({
      method: 'PATCH',
      url: `/api/v1/reports/${encodeURIComponent(String(a.report_id ?? ''))}`,
      body: { status: a.status, ...(a.reason !== undefined ? { reason: a.reason } : {}) },
    }),
  },
  {
    name: 'list_work_orders',
    description: '列出工單（補種、養護）。廠商的 token 只會看到指派給自己的工單。',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'accepted', 'in_progress', 'done'] },
        type: { type: 'string', enum: ['planting', 'care'] },
        limit,
        offset,
      },
      additionalProperties: false,
    },
    scopes: WO_READ,
    rest: 'GET /api/v1/work-orders',
    build: (a) => ({ method: 'GET', url: `/api/v1/work-orders${qs(a, ['status', 'type', 'limit', 'offset'])}` }),
  },
  {
    name: 'update_work_order',
    description: '推進工單：accept（接單）→ progress（開始施工）→ complete（完工，可附說明）。補種工單完工後案件變「已種植」。',
    inputSchema: {
      type: 'object',
      properties: {
        work_order_id: { type: 'string' },
        action: { type: 'string', enum: ['accept', 'progress', 'complete'] },
        note: { type: 'string', maxLength: 140, description: '完工說明（只有 complete 用得到）' },
      },
      required: ['work_order_id', 'action'],
      additionalProperties: false,
    },
    scopes: WO_WRITE,
    rest: 'POST /api/v1/work-orders/{id}/{action}',
    build: (a) => ({
      method: 'POST',
      url: `/api/v1/work-orders/${encodeURIComponent(String(a.work_order_id ?? ''))}/${encodeURIComponent(String(a.action ?? ''))}`,
      ...(a.note !== undefined ? { body: { note: a.note } } : {}),
    }),
  },
]

interface RpcRequest {
  jsonrpc?: string
  id?: number | string | null
  method?: string
  params?: Record<string, unknown>
}

const rpcError = (id: RpcRequest['id'], code: number, message: string): GatewayResponse => ({
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: { jsonrpc: '2.0', id: id ?? null, error: { code, message } },
})

const rpcResult = (id: RpcRequest['id'], result: unknown): GatewayResponse => ({
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: { jsonrpc: '2.0', id: id ?? null, result },
})

export function toolsFor(scope: readonly string[]): McpTool[] {
  return MCP_TOOLS.filter((t) => hasAnyScope(scope, t.scopes))
}

/** POST /mcp：JSON-RPC 2.0。先驗 Bearer token（和 REST 同一套），再處理 initialize / tools/list / tools/call / ping */
export async function handleMcp(
  req: { headers?: Record<string, string>; body?: unknown },
  deps: GatewayDeps,
): Promise<GatewayResponse> {
  const auth = authenticate(req.headers, deps)
  if (!auth.ok) return auth.res
  const log = (what: string, status: number) =>
    deps.registry.record(auth.client.clientId, { at: deps.now(), method: 'POST', path: `/mcp ${what}`, status }, true)

  let msg: RpcRequest
  try {
    msg = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as RpcRequest
  } catch {
    return rpcError(null, -32700, 'Parse error')
  }
  if (!msg || typeof msg !== 'object' || Array.isArray(msg) || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string')
    return rpcError(msg?.id, -32600, 'Invalid Request')

  // 通知（沒有 id）：回 202、沒有內容
  if (msg.id === undefined) {
    log(msg.method, 202)
    return { status: 202, headers: {}, body: '' }
  }

  switch (msg.method) {
    case 'initialize':
      log('initialize', 200)
      return rpcResult(msg.id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'whisper-trees', title: '曦語 Whisper Trees（示意）', version: '1.0.0' },
        instructions: '補種案件、樹況回報與工單。只看得到 token 的 scope 允許的工具。',
      })
    case 'ping':
      return rpcResult(msg.id, {})
    case 'tools/list':
      log('tools/list', 200)
      return rpcResult(msg.id, {
        tools: toolsFor(auth.token.scope).map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      })
    case 'tools/call': {
      const name = msg.params?.name
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>
      // 沒權限的工具跟不存在一樣，不透露它存在
      const tool = toolsFor(auth.token.scope).find((t) => t.name === name)
      if (!tool || typeof args !== 'object' || Array.isArray(args)) {
        log(`tools/call ${String(name)}`, 200)
        return rpcError(msg.id, -32602, `Unknown tool: ${String(name)}`)
      }
      const r = tool.build(args)
      const res = await handleRequest({ method: r.method, url: r.url, body: r.body, headers: req.headers }, deps)
      return rpcResult(msg.id, {
        content: [{ type: 'text', text: JSON.stringify(res.body, null, 2) }],
        isError: res.status >= 400,
      })
    }
    default:
      log(msg.method, 200)
      return rpcError(msg.id, -32601, `Method not found: ${msg.method}`)
  }
}
