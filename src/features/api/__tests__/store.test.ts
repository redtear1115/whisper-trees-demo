// 閘道接真正的 store：用戶端存在 ext，API 的寫入和畫面用同一組 store 函式。
import { beforeEach, describe, expect, it } from 'vitest'
import { allReports, allWishes, resetAll, wishStatus } from '../../../store'
import { orders } from '../../vendor/orders'
import { allClients, apiLog, createApiClient, regenerateApiSecret, reportReviews, revokeApiClient } from '../clientStore'
import { callApi, callMcp } from '../runtime'

beforeEach(() => resetAll())

const token = async (id: string, secret: string) =>
  ((await callApi({ method: 'POST', url: '/oauth/token', body: `grant_type=client_credentials&client_id=${id}&client_secret=${secret}` })).body as { access_token: string }).access_token

describe('api clients in the store', () => {
  it('create → token → call → regenerate → revoke', async () => {
    const { client, secret } = await createApiClient({ name: '測試系統', type: 'gov', scopes: ['cases:read'] })
    expect(allClients().some((c) => c.clientId === client.clientId)).toBe(true)
    expect(JSON.stringify(allClients())).not.toContain(secret)

    const t = await token(client.clientId, secret)
    const list = await callApi({ method: 'GET', url: '/api/v1/cases', headers: { authorization: `Bearer ${t}` } })
    expect(list.status).toBe(200)
    expect(apiLog().lastUsed[client.clientId]).toBeGreaterThan(0)
    expect(apiLog().entries[0]).toMatchObject({ clientId: client.clientId, path: '/api/v1/cases', status: 200 })

    const again = (await regenerateApiSecret(client.clientId))!
    expect(again.secret).not.toBe(secret)
    expect((await callApi({ method: 'POST', url: '/oauth/token', body: `grant_type=client_credentials&client_id=${client.clientId}&client_secret=${secret}` })).status).toBe(401)
    const t2 = await token(client.clientId, again.secret)

    revokeApiClient(client.clientId)
    expect(allClients().find((c) => c.clientId === client.clientId)!.status).toBe('revoked')
    expect((await callApi({ method: 'GET', url: '/api/v1/cases', headers: { authorization: `Bearer ${t2}` } })).status).toBe(401)
  })

  it('PATCH /cases changes what the citizen side reads from the store', async () => {
    const t = await token('wt-demo-gov', 'demo-gov-secret')
    const id = allWishes().find((w) => wishStatus(w) === 'received')!.id
    const r = await callApi({ method: 'PATCH', url: `/api/v1/cases/${id}`, headers: { authorization: `Bearer ${t}` }, body: { status: 'scheduled' } })
    expect(r.status).toBe(200)
    expect(wishStatus(allWishes().find((w) => w.id === id)!)).toBe('scheduled')
  })

  it('PATCH /reports and the work order flow write through to the store', async () => {
    const gov = { authorization: `Bearer ${await token('wt-demo-gov', 'demo-gov-secret')}` }
    const rid = allReports()[0].id
    await callApi({ method: 'PATCH', url: `/api/v1/reports/${rid}`, headers: gov, body: { status: 'acknowledged' } })
    expect(reportReviews()[rid].status).toBe('acknowledged')

    // 預設示範資料裡排程中的案件 → 補種工單
    const wid = allWishes().find((w) => wishStatus(w) === 'scheduled')!.id
    const wo = await callApi({ method: 'GET', url: '/api/v1/work-orders?type=planting', headers: gov })
    expect((wo.body as { data: { case_id: string }[] }).data.map((o) => o.case_id)).toContain(wid)
    for (const a of ['accept', 'progress', 'complete'])
      expect((await callApi({ method: 'POST', url: `/api/v1/work-orders/wo_wish_${wid}/${a}`, headers: gov, body: a === 'complete' ? { note: '完工' } : undefined })).status).toBe(200)
    expect(orders()[`wish:${wid}`].stage).toBe('done')
    expect(wishStatus(allWishes().find((w) => w.id === wid)!)).toBe('planted')
  })

  it('MCP tools/call runs against the same store', async () => {
    const t = await token('wt-demo-gov', 'demo-gov-secret')
    const id = allWishes().find((w) => wishStatus(w) === 'received')!.id
    const r = await callMcp({
      headers: { authorization: `Bearer ${t}` },
      body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'update_case_status', arguments: { case_id: id, status: 'surveying' } } },
    })
    expect((r.body as { result: { isError: boolean } }).result.isError).toBe(false)
    expect(wishStatus(allWishes().find((w) => w.id === id)!)).toBe('surveying')
  })
})
