// 模擬的 API 閘道：OAuth 2.0 client credentials、Bearer token 驗證、scope 檢查、v1 路由。
// 全部在瀏覽器裡跑，不碰網路；寫入走 DataSource（正式接 store，和政府端／發包商畫面用同一組函式）。
// 錯誤依 RFC 6749（token 端點）與 RFC 6750（Bearer）。

import { DEFAULT_WEIGHTS, normalizedWeights, CLOSED, caseDetail, caseResource, hotspots, reportResource, scoreCases, workOrderResource, workOrderRows, type WorkOrderRow } from './resources'
import { REPORT_KINDS, STATUS_LABEL, type WishStatus } from '../../store/types'
import type { Weights } from '../../lib/score'
import type { ApiClient } from './clients'
import { verifySecret } from './secret'
import { hasAnyScope, isScope, parseScopeString, type Scope } from './scopes'
import { TOKEN_TTL_SECONDS, type TokenRecord, type TokenStore } from './tokens'
import type { DataSource, ReviewStatus } from './types'
import { vendorById } from './vendors'

export interface GatewayRequest {
  method: string
  /** 路徑加查詢字串（也接受完整網址） */
  url: string
  headers?: Record<string, string>
  /** JSON 物件、JSON 字串，或 form 字串（token 端點） */
  body?: unknown
}

export interface GatewayResponse {
  status: number
  headers: Record<string, string>
  body: unknown
}

export interface LogEntry {
  at: number
  method: string
  path: string
  status: number
}

export interface Registry {
  find(clientId: string): ApiClient | undefined
  record(clientId: string, entry: LogEntry, markUsed: boolean): void
}

export interface GatewayDeps {
  now: () => number
  tokens: TokenStore
  registry: Registry
  data: DataSource
}

const REALM = 'whisper-trees'

const json = (status: number, body: unknown, headers: Record<string, string> = {}): GatewayResponse => ({
  status,
  headers: { 'content-type': 'application/json', ...headers },
  body,
})
const fail = (status: number, error: string, description: string, headers: Record<string, string> = {}) =>
  json(status, { error, error_description: description }, headers)

const lower = (h: Record<string, string> = {}) => Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]))

// ---------- token 端點 ----------

function parseForm(body: unknown): Record<string, string> {
  if (typeof body === 'string') return Object.fromEntries(new URLSearchParams(body))
  if (body && typeof body === 'object') return Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]))
  return {}
}

function basicCredentials(auth: string | undefined): { id: string; secret: string } | null {
  const m = /^Basic\s+(.+)$/i.exec(auth ?? '')
  if (!m) return null
  try {
    const decoded = atob(m[1])
    const i = decoded.indexOf(':')
    if (i < 0) return null
    return { id: decodeURIComponent(decoded.slice(0, i)), secret: decodeURIComponent(decoded.slice(i + 1)) }
  } catch {
    return null
  }
}

async function tokenEndpoint(req: GatewayRequest, deps: GatewayDeps): Promise<{ res: GatewayResponse; clientId?: string; ok?: boolean }> {
  const noStore = { 'cache-control': 'no-store', pragma: 'no-cache' }
  const headers = lower(req.headers)
  if (req.method !== 'POST') return { res: fail(405, 'invalid_request', 'Use POST', { allow: 'POST' }) }
  const form = parseForm(req.body)
  if (!form.grant_type) return { res: fail(400, 'invalid_request', 'grant_type is required', noStore) }
  if (form.grant_type !== 'client_credentials')
    return { res: fail(400, 'unsupported_grant_type', 'Only client_credentials is supported', noStore) }

  const basic = basicCredentials(headers.authorization)
  const id = basic?.id ?? form.client_id
  const secret = basic?.secret ?? form.client_secret
  const invalidClient = (clientId?: string) => ({
    res: fail(401, 'invalid_client', 'Client authentication failed', {
      ...noStore,
      ...(basic ? { 'www-authenticate': `Basic realm="${REALM}"` } : {}),
    }),
    clientId,
  })
  if (!id || !secret) return invalidClient()
  const client = deps.registry.find(id)
  if (!client || client.status === 'revoked' || !(await verifySecret(secret, client.secretHash))) return invalidClient(client?.clientId)

  const requested = parseScopeString(form.scope)
  const granted = requested.length ? requested : client.scopes
  if (granted.some((s) => !isScope(s) || !client.scopes.includes(s)))
    return { res: fail(400, 'invalid_scope', 'Requested scope is not allowed for this client', noStore), clientId: client.clientId }

  const { access_token, expires_in } = deps.tokens.issue(client.clientId, granted as Scope[], TOKEN_TTL_SECONDS)
  return {
    res: json(200, { access_token, token_type: 'Bearer', expires_in, scope: granted.join(' ') }, noStore),
    clientId: client.clientId,
    ok: true,
  }
}

// ---------- Bearer 驗證 ----------

export type AuthResult = { ok: true; token: TokenRecord; client: ApiClient } | { ok: false; res: GatewayResponse }

const bearerError = (status: number, error: string | null, description: string, extra = ''): GatewayResponse =>
  fail(status, error ?? 'unauthorized', description, {
    'www-authenticate': `Bearer realm="${REALM}"${error ? `, error="${error}", error_description="${description}"` : ''}${extra}`,
  })

export function authenticate(headersIn: Record<string, string> | undefined, deps: GatewayDeps): AuthResult {
  const m = /^Bearer\s+(\S+)$/i.exec(lower(headersIn).authorization ?? '')
  if (!m) return { ok: false, res: bearerError(401, null, 'Missing Authorization: Bearer <access_token>') }
  const found = deps.tokens.lookup(m[1])
  if (!found.ok)
    return {
      ok: false,
      res: bearerError(401, 'invalid_token', found.reason === 'expired' ? 'The access token expired' : 'The access token is not valid'),
    }
  const client = deps.registry.find(found.record.clientId)
  if (!client || client.status === 'revoked')
    return { ok: false, res: bearerError(401, 'invalid_token', 'The client of this token has been revoked') }
  return { ok: true, token: found.record, client }
}

// ---------- 路由 ----------

interface Ctx {
  deps: GatewayDeps
  params: string[]
  query: URLSearchParams
  body: unknown
  token: TokenRecord
  client: ApiClient
}

interface Route {
  method: string
  re: RegExp
  /** 擇一即可 */
  scopes: Scope[]
  run: (c: Ctx) => Promise<GatewayResponse>
}

const WO_READ: Scope[] = ['workorders:read', 'workorders:own:read']
const WO_WRITE: Scope[] = ['workorders:write', 'workorders:own:write']

function paging(q: URLSearchParams): { limit: number; offset: number } | GatewayResponse {
  const limit = q.has('limit') ? Number(q.get('limit')) : 50
  const offset = q.has('offset') ? Number(q.get('offset')) : 0
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) return fail(400, 'invalid_request', 'limit must be an integer between 1 and 200')
  if (!Number.isInteger(offset) || offset < 0) return fail(400, 'invalid_request', 'offset must be a non-negative integer')
  return { limit, offset }
}

const isRes = (x: unknown): x is GatewayResponse => !!x && typeof x === 'object' && 'status' in x && 'headers' in x

function page<T>(rows: T[], q: URLSearchParams, extra: Record<string, unknown> = {}): GatewayResponse {
  const p = paging(q)
  if (isRes(p)) return p
  return json(200, { data: rows.slice(p.offset, p.offset + p.limit), meta: { total: rows.length, limit: p.limit, offset: p.offset, ...extra } })
}

function bodyObject(body: unknown): Record<string, unknown> | GatewayResponse {
  let b = body
  if (typeof b === 'string') {
    try {
      b = JSON.parse(b)
    } catch {
      return fail(400, 'invalid_request', 'Request body is not valid JSON')
    }
  }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return fail(400, 'invalid_request', 'Request body must be a JSON object')
  return b as Record<string, unknown>
}

const invalid = (field: string, description: string) => json(422, { error: 'validation_failed', field, error_description: description })
const notFound = (what: string) => fail(404, 'not_found', `${what} not found`)

function readWeights(q: URLSearchParams): Weights | GatewayResponse {
  const w: Weights = { ...DEFAULT_WEIGHTS }
  for (const k of Object.keys(w) as (keyof Weights)[]) {
    if (!q.has(k)) continue
    const n = Number(q.get(k))
    if (!Number.isFinite(n) || n < 0 || n > 100) return fail(400, 'invalid_request', `${k} must be a number between 0 and 100`)
    w[k] = n
  }
  return w
}

const STATUSES = Object.keys(STATUS_LABEL) as WishStatus[]
const REVIEW_STATUSES: ReviewStatus[] = ['open', 'acknowledged', 'dismissed']

/** 廠商 token（只有 own scope）只看得到、動得到自己廠商的工單 */
function visibleOrders(c: Ctx, write: boolean): WorkOrderRow[] {
  const rows = workOrderRows(c.deps.data)
  const all: Scope = write ? 'workorders:write' : 'workorders:read'
  if (c.token.scope.includes(all)) return rows
  return rows.filter((r) => r.vendorId === c.client.vendorId)
}

const vendorName = (id: string) => vendorById(id)?.name ?? id

const ACTIONS = {
  accept: { from: 'new', to: 'accepted' },
  progress: { from: 'accepted', to: 'working' },
  complete: { from: 'working', to: 'done' },
} as const

const ROUTES: Route[] = [
  {
    method: 'GET',
    re: /^\/api\/v1\/hotspots$/,
    scopes: ['hotspots:read'],
    run: async ({ deps, query }) => {
      let rows = hotspots(deps.data.wishes())
      const d = query.get('district')
      if (d) rows = rows.filter((r) => r.district === d)
      return page(rows, query)
    },
  },
  {
    method: 'GET',
    re: /^\/api\/v1\/priorities$/,
    scopes: ['priorities:read'],
    run: async ({ deps, query }) => {
      const weights = readWeights(query)
      if (isRes(weights)) return weights
      const scores = await scoreCases(deps.data, weights)
      const includeClosed = query.get('include_closed') === 'true'
      const rows = deps.data
        .wishes()
        .filter((w) => includeClosed || !CLOSED.includes(w.history[w.history.length - 1].status))
        .map((w) => ({ w, s: scores.get(w.id)! }))
        .sort((a, b) => b.s.total - a.s.total)
        .map(({ w, s }, i) => ({
          rank: i + 1,
          case_id: w.id,
          road: w.road,
          district: w.district,
          status: w.history[w.history.length - 1].status,
          score: Math.round(s.total * 1000) / 10,
          parts: { demand: round2(s.demand), shade: round2(s.shade), feasibility: round2(s.feasibility), fairness: round2(s.fairness) },
        }))
      return page(rows, query, { weights: normalizedWeights(weights) })
    },
  },
  {
    method: 'GET',
    re: /^\/api\/v1\/cases$/,
    scopes: ['cases:read'],
    run: async ({ deps, query }) => {
      const status = query.get('status')
      if (status && !STATUSES.includes(status as WishStatus)) return fail(400, 'invalid_request', `status must be one of ${STATUSES.join(', ')}`)
      let rows = deps.data.wishes().map(caseResource)
      if (status) rows = rows.filter((r) => r.status === status)
      const d = query.get('district')
      if (d) rows = rows.filter((r) => r.district === d)
      return page(rows, query)
    },
  },
  {
    method: 'GET',
    re: /^\/api\/v1\/cases\/([^/]+)$/,
    scopes: ['cases:read'],
    run: async ({ deps, params }) => {
      const w = deps.data.wishes().find((x) => x.id === params[0])
      if (!w) return notFound('case')
      const scores = await scoreCases(deps.data, DEFAULT_WEIGHTS)
      return json(200, caseDetail(w, scores.get(w.id)))
    },
  },
  {
    method: 'PATCH',
    re: /^\/api\/v1\/cases\/([^/]+)$/,
    scopes: ['cases:write'],
    run: async ({ deps, params, body }) => {
      const w = deps.data.wishes().find((x) => x.id === params[0])
      if (!w) return notFound('case')
      const b = bodyObject(body)
      if (isRes(b)) return b
      if (typeof b.status !== 'string' || !STATUSES.includes(b.status as WishStatus))
        return invalid('status', `status must be one of ${STATUSES.join(', ')}`)
      if (b.reason !== undefined && (typeof b.reason !== 'string' || b.reason.length > 200)) return invalid('reason', 'reason must be a string of at most 200 characters')
      const reason = typeof b.reason === 'string' ? b.reason.trim() : undefined
      if (b.status === 'rejected' && !reason) return invalid('reason', 'reason is required when status is rejected')
      if (!deps.data.setWishStatus(w.id, b.status as WishStatus, reason)) return invalid('status', 'status change refused')
      const now = deps.data.wishes().find((x) => x.id === w.id)!
      return json(200, caseDetail(now))
    },
  },
  {
    method: 'GET',
    re: /^\/api\/v1\/reports$/,
    scopes: ['reports:read'],
    run: async ({ deps, query }) => {
      const kind = query.get('kind')
      if (kind && !(kind in REPORT_KINDS)) return fail(400, 'invalid_request', `kind must be one of ${Object.keys(REPORT_KINDS).join(', ')}`)
      const orders = deps.data.orders()
      const reviews = deps.data.reviews()
      let rows = deps.data.reports().map((r) => reportResource(r, reviews[r.id], orders[`report:${r.id}`]?.stage))
      if (kind) rows = rows.filter((r) => r.kind === kind)
      const d = query.get('district')
      if (d) rows = rows.filter((r) => r.district === d)
      return page(rows, query)
    },
  },
  {
    method: 'PATCH',
    re: /^\/api\/v1\/reports\/([^/]+)$/,
    scopes: ['reports:write'],
    run: async ({ deps, params, body, deps: { now } }) => {
      const r = deps.data.reports().find((x) => x.id === params[0])
      if (!r) return notFound('report')
      const b = bodyObject(body)
      if (isRes(b)) return b
      if (typeof b.status !== 'string' || !REVIEW_STATUSES.includes(b.status as ReviewStatus))
        return invalid('status', `status must be one of ${REVIEW_STATUSES.join(', ')}`)
      if (b.reason !== undefined && (typeof b.reason !== 'string' || b.reason.length > 200)) return invalid('reason', 'reason must be a string of at most 200 characters')
      const reason = typeof b.reason === 'string' ? b.reason.trim() : undefined
      if (b.status === 'dismissed' && !reason) return invalid('reason', 'reason is required when status is dismissed')
      deps.data.setReview(r.id, { status: b.status as ReviewStatus, at: now(), ...(reason ? { reason } : {}) })
      return json(200, reportResource(r, deps.data.reviews()[r.id], deps.data.orders()[`report:${r.id}`]?.stage))
    },
  },
  {
    method: 'GET',
    re: /^\/api\/v1\/work-orders$/,
    scopes: WO_READ,
    run: async (c) => {
      const status = c.query.get('status')
      const type = c.query.get('type')
      if (type && type !== 'planting' && type !== 'care') return fail(400, 'invalid_request', 'type must be planting or care')
      let rows = visibleOrders(c, false).map((r) => workOrderResource(r, vendorName(r.vendorId)))
      if (status) rows = rows.filter((r) => r.status === status)
      if (type) rows = rows.filter((r) => r.type === type)
      return page(rows, c.query)
    },
  },
  {
    method: 'POST',
    re: /^\/api\/v1\/work-orders\/([^/]+)\/(accept|progress|complete)$/,
    scopes: WO_WRITE,
    run: async (c) => {
      const row = visibleOrders(c, true).find((r) => r.id === c.params[0])
      // 別家廠商的工單一律回 404，不透露它存在
      if (!row) return notFound('work order')
      const action = ACTIONS[c.params[1] as keyof typeof ACTIONS]
      if (row.stage !== action.from)
        return json(409, { error: 'invalid_state', error_description: `Cannot ${c.params[1]} a work order whose status is ${workOrderResource(row, '').status}` })
      let note: string | undefined
      if (c.params[1] === 'complete' && c.body !== undefined && c.body !== '') {
        const b = bodyObject(c.body)
        if (isRes(b)) return b
        if (b.note !== undefined && (typeof b.note !== 'string' || b.note.length > 140)) return invalid('note', 'note must be a string of at most 140 characters')
        note = (b.note as string | undefined)?.trim() || undefined
      }
      c.deps.data.advanceOrder(row.orderKey, action.to, { wishId: row.wishId, note })
      const after = workOrderRows(c.deps.data).find((r) => r.id === row.id)!
      return json(200, workOrderResource(after, vendorName(after.vendorId)))
    },
  },
]

const round2 = (n: number) => Math.round(n * 100) / 100

export async function handleRequest(req: GatewayRequest, deps: GatewayDeps): Promise<GatewayResponse> {
  const method = req.method.toUpperCase()
  let url: URL
  try {
    url = new URL(req.url, 'https://whisper-trees-demo.southern-light.dev')
  } catch {
    return fail(400, 'invalid_request', 'Malformed URL')
  }
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const at = deps.now()
  const finish = (res: GatewayResponse, clientId: string | undefined, markUsed: boolean) => {
    if (clientId) deps.registry.record(clientId, { at, method, path, status: res.status }, markUsed)
    return res
  }

  if (path === '/oauth/token') {
    const r = await tokenEndpoint({ ...req, method }, deps)
    return finish(r.res, r.clientId, !!r.ok)
  }

  let pathMatched = false
  for (const route of ROUTES) {
    const m = route.re.exec(path)
    if (!m) continue
    pathMatched = true
    if (route.method !== method) continue
    const auth = authenticate(req.headers, deps)
    if (!auth.ok) return auth.res
    const id = auth.client.clientId
    if (!hasAnyScope(auth.token.scope, route.scopes)) {
      return finish(
        bearerError(403, 'insufficient_scope', 'The access token does not have the scope required by this endpoint', `, scope="${route.scopes.join(' ')}"`),
        id,
        true,
      )
    }
    const res = await route.run({
      deps,
      params: m.slice(1).map(decodeURIComponent),
      query: url.searchParams,
      body: req.body,
      token: auth.token,
      client: auth.client,
    })
    return finish(res, id, true)
  }
  return pathMatched ? fail(405, 'method_not_allowed', `${method} is not supported on this path`) : notFound('endpoint')
}
