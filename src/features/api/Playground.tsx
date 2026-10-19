// /developers 的「試打 console」與「MCP 試用」：請求經過瀏覽器裡的模擬閘道（runtime.ts），不碰網路。

import { useState } from 'react'
import { MockTag } from '../../components/ui'
import { DEMO_CREDENTIALS } from './clients'
import { curlOf, MCP_URL } from './docs'
import type { GatewayRequest, GatewayResponse } from './gateway'
import { MCP_TOOLS } from './mcp'
import { advanceClock, callApi, callMcp, liveIds } from './runtime'
import { TOKEN_TTL_SECONDS } from './tokens'

const STATUS_TEXT: Record<number, string> = {
  200: 'OK', 202: 'Accepted', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
  405: 'Method Not Allowed', 409: 'Conflict', 422: 'Unprocessable Entity',
}

const pretty = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2))

function ResponseView({ res }: { res: GatewayResponse }) {
  const head = Object.entries(res.headers)
    .filter(([k]) => k !== 'content-type')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  return (
    <div className="exchange-res">
      <p className={`http-status ${res.status < 300 ? 'ok' : 'bad'}`}>
        HTTP {res.status} {STATUS_TEXT[res.status] ?? ''}
      </p>
      <pre className="code">
        {head && `${head}\n\n`}
        {res.body === '' ? '(無內容)' : pretty(res.body)}
      </pre>
    </div>
  )
}

// ---------- 取得 token ----------

export function TokenPanel({ token, setToken }: { token: string; setToken: (t: string) => void }) {
  const [cid, setCid] = useState<string>(DEMO_CREDENTIALS[0].clientId)
  const [secret, setSecret] = useState<string>(DEMO_CREDENTIALS[0].secret)
  const [scope, setScope] = useState('')
  const [mode, setMode] = useState<'basic' | 'form'>('basic')
  const [show, setShow] = useState(false)
  const [last, setLast] = useState<{ req: GatewayRequest; res: GatewayResponse } | null>(null)
  const [busy, setBusy] = useState(false)

  const request = (): GatewayRequest => {
    const body = new URLSearchParams({ grant_type: 'client_credentials' })
    if (scope.trim()) body.set('scope', scope.trim())
    if (mode === 'form') {
      body.set('client_id', cid)
      body.set('client_secret', secret)
    }
    return {
      method: 'POST',
      url: '/oauth/token',
      headers: mode === 'basic' ? { Authorization: `Basic ${btoa(`${encodeURIComponent(cid)}:${encodeURIComponent(secret)}`)}` } : {},
      body: body.toString(),
    }
  }

  const send = async () => {
    setBusy(true)
    const req = request()
    const res = await callApi(req)
    setLast({ req, res })
    if (res.status === 200) setToken((res.body as { access_token: string }).access_token)
    setBusy(false)
  }

  return (
    <div className="play-box">
      <h3>
        ① 取得 token <MockTag title="請求由瀏覽器裡的模擬閘道處理" />
      </h3>
      <div className="play-grid">
        <label>
          示範用戶端（secret 公開）
          <select
            className="input"
            value={DEMO_CREDENTIALS.find((d) => d.clientId === cid && d.secret === secret)?.clientId ?? ''}
            onChange={(e) => {
              const d = DEMO_CREDENTIALS.find((x) => x.clientId === e.target.value)
              if (d) {
                setCid(d.clientId)
                setSecret(d.secret)
              }
            }}
          >
            <option value="">（自己輸入）</option>
            {DEMO_CREDENTIALS.map((d) => (
              <option key={d.clientId} value={d.clientId}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          client_id
          <input className="input mono" value={cid} onChange={(e) => setCid(e.target.value.trim())} autoComplete="off" spellCheck={false} />
        </label>
        <label>
          client_secret
          <input
            className="input mono"
            type={show ? 'text' : 'password'}
            value={secret}
            onChange={(e) => setSecret(e.target.value.trim())}
            autoComplete="off"
            spellCheck={false}
            placeholder="在 /gov 建立用戶端時顯示的那一次"
          />
        </label>
        <label>
          scope（選填，空白分隔）
          <input className="input mono" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="cases:read reports:read" spellCheck={false} />
        </label>
        <label>
          用戶端驗證方式
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value as 'basic' | 'form')}>
            <option value="basic">HTTP Basic（建議）</option>
            <option value="form">表單欄位 client_id／client_secret</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> 顯示 secret
        </label>
      </div>
      <div className="row gap wrap">
        <button className="btn small primary" onClick={send} disabled={busy}>
          取得 token
        </button>
        <button
          className="btn small"
          onClick={() => {
            advanceClock(TOKEN_TTL_SECONDS * 1000)
            setLast(null)
          }}
          title="把閘道的時鐘往後撥 1 小時，目前的 token 就會過期"
        >
          快轉 1 小時（看 token 過期）
        </button>
      </div>
      {last && (
        <>
          <pre className="code">{curlOf(last.req)}</pre>
          <ResponseView res={last.res} />
        </>
      )}
      <label className="token-field">
        access_token（可以直接改，試試亂填或過期的 token）
        <input className="input mono" value={token} onChange={(e) => setToken(e.target.value.trim())} spellCheck={false} placeholder="還沒有 token" />
      </label>
    </div>
  )
}

// ---------- REST 試打 ----------

interface Preset {
  label: string
  method: string
  path: string
  body?: string
}

function presets(): Preset[] {
  const { caseId, reportId, workOrderId } = liveIds()
  return [
    { label: 'GET 需求熱點', method: 'GET', path: '/api/v1/hotspots' },
    { label: 'GET 優先分數（自訂權重）', method: 'GET', path: '/api/v1/priorities?demand=50&shade=10&feasibility=20&fairness=20&limit=5' },
    { label: 'GET 案件列表', method: 'GET', path: '/api/v1/cases?status=received&limit=5' },
    { label: 'GET 案件明細', method: 'GET', path: `/api/v1/cases/${caseId}` },
    { label: 'PATCH 修改案件狀態', method: 'PATCH', path: `/api/v1/cases/${caseId}`, body: '{\n  "status": "surveying"\n}' },
    { label: 'PATCH 案件改「不可種」（缺原因會 422）', method: 'PATCH', path: `/api/v1/cases/${caseId}`, body: '{\n  "status": "rejected"\n}' },
    { label: 'GET 樹況回報', method: 'GET', path: '/api/v1/reports?limit=5' },
    { label: 'PATCH 處理樹況回報', method: 'PATCH', path: `/api/v1/reports/${reportId}`, body: '{\n  "status": "acknowledged"\n}' },
    { label: 'GET 工單列表', method: 'GET', path: '/api/v1/work-orders' },
    { label: 'POST 接單', method: 'POST', path: `/api/v1/work-orders/${workOrderId}/accept` },
    { label: 'POST 開始施工', method: 'POST', path: `/api/v1/work-orders/${workOrderId}/progress` },
    { label: 'POST 完工回報', method: 'POST', path: `/api/v1/work-orders/${workOrderId}/complete`, body: '{\n  "note": "種下茄苳一棵，已立支架"\n}' },
  ]
}

export function RestConsole({ token }: { token: string }) {
  const [list, setList] = useState(presets)
  const [method, setMethod] = useState('GET')
  const [path, setPath] = useState('/api/v1/cases?limit=5')
  const [body, setBody] = useState('')
  const [out, setOut] = useState<{ req: GatewayRequest; res: GatewayResponse } | null>(null)
  const [busy, setBusy] = useState(false)

  const pick = (i: number) => {
    // 重新抓一次，id 才會是當下 store 裡真的有的
    const fresh = presets()
    setList(fresh)
    const p = fresh[i]
    setMethod(p.method)
    setPath(p.path)
    setBody(p.body ?? '')
  }

  const send = async () => {
    setBusy(true)
    const req: GatewayRequest = {
      method,
      url: path,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: method === 'GET' || !body.trim() ? undefined : body,
    }
    const res = await callApi(req)
    setOut({ req, res })
    setBusy(false)
  }

  return (
    <div className="play-box">
      <h3>
        ② 呼叫端點 <MockTag />
      </h3>
      <label>
        範例
        <select className="input" defaultValue="" onChange={(e) => e.target.value !== '' && pick(Number(e.target.value))}>
          <option value="">選一個範例，或自己改下面的方法與路徑</option>
          {list.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <div className="row gap wrap">
        <select className="input method-select" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="HTTP 方法">
          {['GET', 'POST', 'PATCH', 'DELETE'].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <input className="input mono grow" value={path} onChange={(e) => setPath(e.target.value)} aria-label="路徑" spellCheck={false} />
      </div>
      {method !== 'GET' && (
        <label>
          body（JSON）
          <textarea className="input mono" rows={4} value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} />
        </label>
      )}
      <div className="row gap wrap center-v">
        <button className="btn small primary" onClick={send} disabled={busy}>
          送出
        </button>
        {!token && <span className="muted small">還沒有 token：照送會得到 401，可以看看錯誤長什麼樣。</span>}
      </div>
      {out && (
        <>
          <p className="muted small">等價的 curl</p>
          <pre className="code">{curlOf(out.req)}</pre>
          <ResponseView res={out.res} />
        </>
      )}
    </div>
  )
}

// ---------- MCP 試用 ----------

function exampleArgs(name: string): Record<string, unknown> {
  const { caseId, reportId, workOrderId } = liveIds()
  const m: Record<string, Record<string, unknown>> = {
    list_hotspots: { limit: 3 },
    get_priorities: { demand: 50, shade: 10, feasibility: 20, fairness: 20, limit: 3 },
    list_cases: { status: 'received', limit: 3 },
    update_case_status: { case_id: caseId, status: 'surveying' },
    list_reports: { limit: 3 },
    update_report: { report_id: reportId, status: 'acknowledged' },
    list_work_orders: { status: 'pending' },
    update_work_order: { work_order_id: workOrderId, action: 'accept' },
  }
  return m[name] ?? {}
}

export function McpConsole({ token, setToken }: { token: string; setToken: (t: string) => void }) {
  const [tool, setTool] = useState(MCP_TOOLS[2].name)
  const [args, setArgs] = useState(() => JSON.stringify(exampleArgs(MCP_TOOLS[2].name), null, 2))
  const [out, setOut] = useState<{ rpc: unknown; res: GatewayResponse } | null>(null)
  const [seq, setSeq] = useState(1)

  const run = async (method: string, params?: unknown) => {
    let rpc: unknown = { jsonrpc: '2.0', id: seq, method, ...(params !== undefined ? { params } : {}) }
    setSeq(seq + 1)
    if (method === 'notifications/initialized') rpc = { jsonrpc: '2.0', method }
    const res = await callMcp({ headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {}, body: rpc })
    setOut({ rpc, res })
  }

  const names =
    out && out.res.status === 200 && (out.rpc as { method: string }).method === 'tools/list'
      ? ((out.res.body as { result?: { tools: { name: string }[] } }).result?.tools ?? []).map((t) => t.name)
      : null

  const callTool = () => {
    let a: unknown
    try {
      a = JSON.parse(args || '{}')
    } catch {
      setOut({ rpc: { error: '引數不是合法的 JSON' }, res: { status: 400, headers: {}, body: '引數不是合法的 JSON' } })
      return
    }
    void run('tools/call', { name: tool, arguments: a })
  }

  return (
    <div className="play-box">
      <h3>
        MCP 試用 <MockTag title="沒有真的 MCP server；請求由瀏覽器裡的模擬閘道處理" />
      </h3>
      <p className="muted small">
        POST {MCP_URL}（示意）。用上面取得的 token，換不同角色的 token 試試：政府 token 看得到 8 個工具，廠商 token 只有 2 個。
      </p>
      <label className="token-field">
        access_token
        <input className="input mono" value={token} onChange={(e) => setToken(e.target.value.trim())} spellCheck={false} placeholder="先在「① 取得 token」取得" />
      </label>
      <div className="row gap wrap">
        <button className="btn small" onClick={() => run('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'demo-client', version: '0.1' } })}>
          initialize
        </button>
        <button className="btn small" onClick={() => run('notifications/initialized')}>
          notifications/initialized
        </button>
        <button className="btn small primary" onClick={() => run('tools/list')}>
          tools/list
        </button>
      </div>
      <div className="row gap wrap center-v">
        <select
          className="input"
          value={tool}
          onChange={(e) => {
            setTool(e.target.value)
            setArgs(JSON.stringify(exampleArgs(e.target.value), null, 2))
          }}
          aria-label="工具"
        >
          {MCP_TOOLS.map((t) => (
            <option key={t.name}>{t.name}</option>
          ))}
        </select>
        <button className="btn small primary" onClick={callTool}>
          tools/call
        </button>
      </div>
      <label>
        arguments（JSON）
        <textarea className="input mono" rows={4} value={args} onChange={(e) => setArgs(e.target.value)} spellCheck={false} />
      </label>
      {out && (
        <>
          {names && (
            <p className="small" data-testid="mcp-tool-names">
              這個 token 看得到 {names.length} 個工具：<span className="mono">{names.join('、') || '（無）'}</span>
            </p>
          )}
          <p className="muted small">JSON-RPC 請求</p>
          <pre className="code">{JSON.stringify(out.rpc, null, 2)}</pre>
          <p className="muted small">回應</p>
          <ResponseView res={out.res} />
        </>
      )}
      <button className="link small" onClick={() => setToken('')}>
        清掉 token
      </button>
    </div>
  )
}
