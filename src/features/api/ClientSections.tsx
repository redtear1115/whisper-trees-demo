// /gov 的「API 用戶端」（承辦人建立、重新產生、撤銷）與 /vendor 的「我的 API 用戶端」（只讀、沒有 secret）。
// 用戶端與呼叫紀錄只存在這台裝置（模擬），見 clientStore.ts。

import { useState } from 'react'
import { MockTag, formatDate } from '../../components/ui'
import { createApiClient, regenerateApiSecret, revokeApiClient, useApiClients, useApiLog } from './clientStore'
import type { ApiClient } from './clients'
import { presetScopes, SCOPE_LABEL, SCOPES_BY_TYPE, TYPE_LABEL, type ClientType } from './scopes'
import { VENDORS, vendorById } from './vendors'

const BASE = import.meta.env.BASE_URL

const when = (at?: number) => (at ? new Date(at).toLocaleString('zh-TW', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '從未使用')

function ScopeList({ scopes }: { scopes: ApiClient['scopes'] }) {
  return (
    <span className="scope-list">
      {scopes.map((s) => (
        <code key={s} className="scope-chip" title={SCOPE_LABEL[s]}>
          {s}
        </code>
      ))}
    </span>
  )
}

function ownerOf(c: ApiClient): string {
  return c.type === 'vendor' ? `${TYPE_LABEL.vendor}・${vendorById(c.vendorId)?.name ?? c.vendorId}` : TYPE_LABEL.gov
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="btn small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          // 剪貼簿被擋：使用者可以直接選取文字
        }
      }}
    >
      {done ? '已複製' : '複製'}
    </button>
  )
}

// ---------- /gov ----------

export function GovApiClients() {
  const clients = useApiClients()
  const log = useApiLog()
  const [name, setName] = useState('')
  const [type, setType] = useState<ClientType>('gov')
  const [vendorId, setVendorId] = useState(VENDORS[0].id)
  const [scopes, setScopes] = useState<string[]>(presetScopes('gov'))
  const [error, setError] = useState<string | null>(null)
  const [shown, setShown] = useState<{ client: ApiClient; secret: string; why: '建立' | '重新產生' } | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  const changeType = (t: ClientType) => {
    setType(t)
    setScopes(presetScopes(t))
  }

  const create = async () => {
    setError(null)
    try {
      const out = await createApiClient({ name, type, vendorId: type === 'vendor' ? vendorId : undefined, scopes })
      setShown({ ...out, why: '建立' })
      setName('')
    } catch (e) {
      setError(
        { name: '請填用戶端名稱。', scopes: '至少要勾一個權限。', vendor: '請選一家廠商。' }[(e as Error).message] ?? '建立失敗。',
      )
    }
  }

  return (
    <section id="api-clients">
      <h2 className="section-title">
        API 用戶端 <MockTag title="用戶端只存在這台裝置，不寫雲端" />
      </h2>
      <p className="muted small">
        讓公園處既有系統或承包廠商用 OAuth 2.0（client credentials）呼叫 API，文件與試打在 <a href={`${BASE}developers#overview`}>/developers</a>。
        <strong>client_secret 只在建立或重新產生時顯示一次</strong>，系統只存它的 SHA-256 與最後 4 碼。這是模擬：用戶端與呼叫紀錄只存在這台裝置，不寫進雲端。
      </p>

      {shown && (
        <div className="secret-box" role="status">
          <p>
            <strong>
              「{shown.client.name}」{shown.why}完成。請現在複製 client_secret，關掉這個框就再也看不到了。
            </strong>
          </p>
          <p className="row gap wrap center-v">
            <span className="muted small">client_id</span> <code className="mono">{shown.client.clientId}</code>
            <CopyButton text={shown.client.clientId} />
          </p>
          <p className="row gap wrap center-v">
            <span className="muted small">client_secret</span> <code className="mono wrap-anywhere">{shown.secret}</code>
            <CopyButton text={shown.secret} />
          </p>
          <button className="btn small" onClick={() => setShown(null)}>
            我已複製，關閉
          </button>
        </div>
      )}

      <form
        className="client-form"
        onSubmit={(e) => {
          e.preventDefault()
          void create()
        }}
      >
        <div className="form-row">
          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            placeholder="用戶端名稱（例：公園處樹木管理系統）"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            aria-label="用戶端名稱"
          />
          <select className="input" value={type} onChange={(e) => changeType(e.target.value as ClientType)} aria-label="類型">
            <option value="gov">{TYPE_LABEL.gov}</option>
            <option value="vendor">{TYPE_LABEL.vendor}</option>
          </select>
          {type === 'vendor' && (
            <select className="input" value={vendorId} onChange={(e) => setVendorId(e.target.value)} aria-label="廠商">
              {VENDORS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <fieldset className="scope-pick">
          <legend className="small muted">權限（scope）：依類型預設，可以取消勾選</legend>
          {SCOPES_BY_TYPE[type].map((s) => (
            <label key={s} className="check">
              <input
                type="checkbox"
                checked={scopes.includes(s)}
                onChange={(e) => setScopes(e.target.checked ? [...scopes, s] : scopes.filter((x) => x !== s))}
              />
              <span>
                <code>{s}</code> <span className="muted small">{SCOPE_LABEL[s]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="row gap center-v">
          <button className="btn small primary">建立用戶端</button>
          {error && (
            <span className="error small" role="alert">
              {error}
            </span>
          )}
        </div>
      </form>

      <div className="table-wrap">
        <table className="client-table">
          <thead>
            <tr>
              <th>名稱</th>
              <th>client_id</th>
              <th>類型</th>
              <th>權限</th>
              <th>建立</th>
              <th>最近使用</th>
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.clientId} className={c.status === 'revoked' ? 'revoked' : ''}>
                <td>
                  {c.name}
                  {c.builtin && <span className="new-tag">內建示範</span>}
                </td>
                <td className="mono small">
                  {c.clientId}
                  <br />
                  <span className="muted">secret …{c.secretLast4}</span>
                </td>
                <td className="small">{ownerOf(c)}</td>
                <td>
                  <ScopeList scopes={c.scopes} />
                </td>
                <td className="small">{new Date(c.createdAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</td>
                <td className="small">{when(log.lastUsed[c.clientId])}</td>
                <td>
                  <span className={`status-pill ${c.status === 'active' ? 's-planted' : 's-rejected'}`}>{c.status === 'active' ? '使用中' : '已撤銷'}</span>
                </td>
                <td>
                  {c.builtin || c.status === 'revoked' ? (
                    <span className="muted small">{c.builtin ? '公開 secret，不可改' : '—'}</span>
                  ) : confirm === `rot:${c.clientId}` ? (
                    <span className="row gap">
                      <button
                        className="btn small primary"
                        onClick={async () => {
                          const out = await regenerateApiSecret(c.clientId)
                          if (out) setShown({ ...out, why: '重新產生' })
                          setConfirm(null)
                        }}
                      >
                        確定（舊 secret 立刻失效）
                      </button>
                      <button className="btn small" onClick={() => setConfirm(null)}>
                        取消
                      </button>
                    </span>
                  ) : confirm === `rev:${c.clientId}` ? (
                    <span className="row gap">
                      <button
                        className="btn small primary"
                        onClick={() => {
                          revokeApiClient(c.clientId)
                          setConfirm(null)
                        }}
                      >
                        確定撤銷
                      </button>
                      <button className="btn small" onClick={() => setConfirm(null)}>
                        取消
                      </button>
                    </span>
                  ) : (
                    <span className="row gap">
                      <button className="btn small" onClick={() => setConfirm(`rot:${c.clientId}`)}>
                        重新產生 secret
                      </button>
                      <button className="btn small" onClick={() => setConfirm(`rev:${c.clientId}`)}>
                        撤銷
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ---------- /vendor ----------

export function VendorApiClients() {
  const clients = useApiClients()
  const log = useApiLog()
  const [vendorId, setVendorId] = useState(VENDORS[0].id)
  const mine = clients.filter((c) => c.type === 'vendor' && c.vendorId === vendorId)
  const vendor = vendorById(vendorId)!

  return (
    <section id="my-api-clients">
      <h2>
        我的 API 用戶端 <MockTag title="用戶端只存在這台裝置" />
      </h2>
      <p className="muted small">
        承辦人發給廠商的 API 用戶端，讓貴公司的系統直接收單、回報進度（文件見 <a href={`${BASE}developers#overview`}>/developers</a>）。
        這裡只看得到 client_id、權限與最近的呼叫，<strong>看不到 secret</strong>；忘記或外洩請洽承辦人重新產生。
      </p>
      <label className="small">
        目前廠商身分（模擬）{' '}
        <select className="input" value={vendorId} onChange={(e) => setVendorId(e.target.value)} aria-label="廠商身分">
          {VENDORS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <p className="muted small">{vendor.name}承包：{vendor.districts.join('、')}。API 只回這些行政區的工單。</p>
      {mine.length === 0 && <p className="muted">目前沒有發給{vendor.name}的用戶端。</p>}
      {mine.map((c) => {
        const calls = log.entries.filter((e) => e.clientId === c.clientId).slice(0, 5)
        return (
          <div key={c.clientId} className={`order ${c.status === 'revoked' ? 'revoked' : ''}`}>
            <div className="row between center-v" style={{ gap: 8, flexWrap: 'wrap' }}>
              <strong>{c.name}</strong>
              <span className={`status-pill ${c.status === 'active' ? 's-planted' : 's-rejected'}`}>{c.status === 'active' ? '使用中' : '已撤銷'}</span>
            </div>
            <p className="small">
              client_id <code className="mono">{c.clientId}</code>
              {c.builtin && <span className="new-tag">內建示範</span>}
            </p>
            <p className="small">
              權限：<ScopeList scopes={c.scopes} />
            </p>
            <p className="muted small">
              建立 {formatDate(c.createdAt)}・最近使用 {when(log.lastUsed[c.clientId])}
            </p>
            {calls.length > 0 ? (
              <ul className="small call-log">
                {calls.map((e) => (
                  <li key={`${e.at}-${e.path}-${e.status}`}>
                    <span className="muted">{when(e.at)}</span> <span className="mono">{e.method} {e.path}</span>{' '}
                    <span className={e.status < 400 ? 'ok-text' : 'error'}>{e.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">還沒有呼叫紀錄（到 /developers 試打會出現在這裡）。</p>
            )}
          </div>
        )
      })}
    </section>
  )
}
