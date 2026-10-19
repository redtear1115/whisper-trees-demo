import { describe, expect, it } from 'vitest'
import { newClient, revoke } from '../clients'
import { DEMO_CREDENTIALS } from '../clients'
import { TOKEN_TTL_SECONDS } from '../tokens'
import { bearer, makeFixture } from './fixture'

const [GOV, GREEN] = DEMO_CREDENTIALS
const form = (o: Record<string, string>) => new URLSearchParams(o).toString()
type Body = Record<string, any> // eslint-disable-line

describe('POST /oauth/token', () => {
  it('issues a bearer token for valid form credentials', async () => {
    const f = makeFixture()
    const r = await f.call({ method: 'POST', url: '/oauth/token', body: form({ grant_type: 'client_credentials', client_id: GOV.clientId, client_secret: GOV.secret }) })
    expect(r.status).toBe(200)
    const b = r.body as Body
    expect(b.token_type).toBe('Bearer')
    expect(b.expires_in).toBe(TOKEN_TTL_SECONDS)
    expect(b.scope.split(' ')).toHaveLength(8)
    expect(r.headers['cache-control']).toBe('no-store')
  })

  it('accepts HTTP Basic client authentication', async () => {
    const f = makeFixture()
    const r = await f.call({
      method: 'POST',
      url: '/oauth/token',
      headers: { Authorization: `Basic ${btoa(`${GREEN.clientId}:${GREEN.secret}`)}` },
      body: 'grant_type=client_credentials',
    })
    expect(r.status).toBe(200)
    expect((r.body as Body).scope).toBe('workorders:own:read workorders:own:write')
  })

  it('wrong secret, unknown client and missing credentials are invalid_client 401', async () => {
    const f = makeFixture()
    for (const body of [
      form({ grant_type: 'client_credentials', client_id: GOV.clientId, client_secret: 'wrong' }),
      form({ grant_type: 'client_credentials', client_id: 'nobody', client_secret: 'x' }),
      form({ grant_type: 'client_credentials' }),
    ]) {
      const r = await f.call({ method: 'POST', url: '/oauth/token', body })
      expect(r.status).toBe(401)
      expect((r.body as Body).error).toBe('invalid_client')
    }
    const basic = await f.call({ method: 'POST', url: '/oauth/token', headers: { authorization: `Basic ${btoa('wt-demo-gov:bad')}` }, body: 'grant_type=client_credentials' })
    expect(basic.headers['www-authenticate']).toMatch(/^Basic/)
  })

  it('a revoked client cannot get a token', async () => {
    const { client, secret } = await newClient({ name: 'x', type: 'gov', scopes: ['cases:read'] }, 1)
    const f = makeFixture([revoke(client, 2)])
    await expect(f.token(client.clientId, secret)).rejects.toMatchObject({ status: 401 })
  })

  it('rejects scopes the client does not have (invalid_scope 400) and narrows when asked', async () => {
    const f = makeFixture()
    await expect(f.token(GREEN.clientId, GREEN.secret, 'cases:read')).rejects.toMatchObject({ status: 400, body: { error: 'invalid_scope' } })
    await expect(f.token(GOV.clientId, GOV.secret, 'bogus')).rejects.toMatchObject({ status: 400, body: { error: 'invalid_scope' } })
    const t = await f.token(GOV.clientId, GOV.secret, 'cases:read')
    expect(f.deps.tokens.lookup(t)).toMatchObject({ ok: true, record: { scope: ['cases:read'] } })
  })

  it('validates grant_type and method', async () => {
    const f = makeFixture()
    expect((await f.call({ method: 'POST', url: '/oauth/token', body: '' })).body).toMatchObject({ error: 'invalid_request' })
    expect((await f.call({ method: 'POST', url: '/oauth/token', body: 'grant_type=password' })).body).toMatchObject({ error: 'unsupported_grant_type' })
    expect((await f.call({ method: 'GET', url: '/oauth/token' })).status).toBe(405)
  })
})

describe('bearer authentication', () => {
  it('no token → 401 with a bare Bearer challenge', async () => {
    const f = makeFixture()
    const r = await f.call({ method: 'GET', url: '/api/v1/cases' })
    expect(r.status).toBe(401)
    expect(r.headers['www-authenticate']).toBe('Bearer realm="whisper-trees"')
  })

  it('garbage token → 401 invalid_token', async () => {
    const f = makeFixture()
    const r = await f.call({ method: 'GET', url: '/api/v1/cases', headers: bearer('nope') })
    expect(r.status).toBe(401)
    expect(r.headers['www-authenticate']).toContain('error="invalid_token"')
  })

  it('expired token → 401 invalid_token', async () => {
    const f = makeFixture()
    const t = await f.tokenOf('gov')
    expect((await f.call({ method: 'GET', url: '/api/v1/cases', headers: bearer(t) })).status).toBe(200)
    f.clock.t += TOKEN_TTL_SECONDS * 1000
    const r = await f.call({ method: 'GET', url: '/api/v1/cases', headers: bearer(t) })
    expect(r.status).toBe(401)
    expect(r.headers['www-authenticate']).toContain('expired')
  })

  it('revoking the client kills its existing tokens', async () => {
    const { client, secret } = await newClient({ name: 'x', type: 'gov', scopes: ['cases:read'] }, 1)
    const f = makeFixture([client])
    const t = await f.token(client.clientId, secret)
    expect((await f.call({ method: 'GET', url: '/api/v1/cases', headers: bearer(t) })).status).toBe(200)
    f.clients[f.clients.length - 1] = revoke(client, 2)
    const r = await f.call({ method: 'GET', url: '/api/v1/cases', headers: bearer(t) })
    expect(r.status).toBe(401)
    expect((r.body as Body).error).toBe('invalid_token')
  })
})

describe('scope enforcement', () => {
  it('vendor token cannot read cases: 403 insufficient_scope naming the scope', async () => {
    const f = makeFixture()
    const t = await f.tokenOf('green')
    for (const [method, url] of [['GET', '/api/v1/cases'], ['GET', '/api/v1/hotspots'], ['GET', '/api/v1/priorities'], ['GET', '/api/v1/reports'], ['PATCH', '/api/v1/cases/c1'], ['PATCH', '/api/v1/reports/r1']]) {
      const r = await f.call({ method, url, headers: bearer(t), body: { status: 'planted' } })
      expect(r.status, url).toBe(403)
      expect((r.body as Body).error).toBe('insufficient_scope')
      expect(r.headers['www-authenticate']).toContain('error="insufficient_scope"')
    }
    expect(f.wishes[0].history).toHaveLength(1)
  })

  it('a read-only token cannot write', async () => {
    const { client, secret } = await newClient({ name: 'ro', type: 'gov', scopes: ['cases:read', 'workorders:read'] }, 1)
    const f = makeFixture([client])
    const t = await f.token(client.clientId, secret)
    expect((await f.call({ method: 'GET', url: '/api/v1/cases/c1', headers: bearer(t) })).status).toBe(200)
    const w = await f.call({ method: 'PATCH', url: '/api/v1/cases/c1', headers: bearer(t), body: { status: 'planted' } })
    expect(w.status).toBe(403)
    expect(w.headers['www-authenticate']).toContain('scope="cases:write"')
    const o = await f.call({ method: 'POST', url: '/api/v1/work-orders/wo_wish_c1/accept', headers: bearer(t) })
    expect(o.status).toBe(403)
  })

  it('a token narrowed at issue time loses the other scopes', async () => {
    const f = makeFixture()
    const t = await f.token(GOV.clientId, GOV.secret, 'cases:read')
    expect((await f.call({ method: 'GET', url: '/api/v1/cases', headers: bearer(t) })).status).toBe(200)
    expect((await f.call({ method: 'GET', url: '/api/v1/reports', headers: bearer(t) })).status).toBe(403)
  })

  it('unknown path 404, wrong method 405', async () => {
    const f = makeFixture()
    const t = await f.tokenOf('gov')
    expect((await f.call({ method: 'GET', url: '/api/v1/nothing', headers: bearer(t) })).status).toBe(404)
    expect((await f.call({ method: 'DELETE', url: '/api/v1/cases', headers: bearer(t) })).status).toBe(405)
  })
})

describe('gov endpoints', () => {
  it('lists, filters and paginates cases', async () => {
    const f = makeFixture()
    const h = bearer(await f.tokenOf('gov'))
    const all = (await f.call({ method: 'GET', url: '/api/v1/cases', headers: h })).body as Body
    expect(all.meta.total).toBe(4)
    expect(all.data[0]).toMatchObject({ id: 'c1', status: 'scheduled', status_label: '可種・已排程', source: 'mock' })
    const sub = (await f.call({ method: 'GET', url: '/api/v1/cases?status=received&limit=1&offset=1', headers: h })).body as Body
    expect(sub.meta).toMatchObject({ total: 2, limit: 1, offset: 1 })
    expect(sub.data).toHaveLength(1)
    expect((await f.call({ method: 'GET', url: '/api/v1/cases?status=bogus', headers: h })).status).toBe(400)
    expect((await f.call({ method: 'GET', url: '/api/v1/cases?limit=0', headers: h })).status).toBe(400)
  })

  it('PATCH case changes status through the data source and keeps history', async () => {
    const f = makeFixture()
    const h = bearer(await f.tokenOf('gov'))
    const r = await f.call({ method: 'PATCH', url: '/api/v1/cases/c2', headers: h, body: { status: 'surveying' } })
    expect(r.status).toBe(200)
    expect((r.body as Body).status).toBe('surveying')
    expect((r.body as Body).history).toHaveLength(2)
    expect(f.wishes.find((w) => w.id === 'c2')!.history.at(-1)!.status).toBe('surveying')
    expect(f.logs.at(-1)).toMatchObject({ clientId: GOV.clientId, method: 'PATCH', path: '/api/v1/cases/c2', status: 200 })
  })

  it('PATCH case validates: unknown id, bad status, rejected needs a reason, bad JSON', async () => {
    const f = makeFixture()
    const h = bearer(await f.tokenOf('gov'))
    expect((await f.call({ method: 'PATCH', url: '/api/v1/cases/zzz', headers: h, body: { status: 'planted' } })).status).toBe(404)
    expect((await f.call({ method: 'PATCH', url: '/api/v1/cases/c2', headers: h, body: { status: 'flying' } })).status).toBe(422)
    const noReason = await f.call({ method: 'PATCH', url: '/api/v1/cases/c2', headers: h, body: { status: 'rejected', reason: '  ' } })
    expect(noReason.status).toBe(422)
    expect((noReason.body as Body).field).toBe('reason')
    expect((await f.call({ method: 'PATCH', url: '/api/v1/cases/c2', headers: h, body: '{oops' })).status).toBe(400)
    expect(f.wishes.find((w) => w.id === 'c2')!.history).toHaveLength(1)
    const ok = await f.call({ method: 'PATCH', url: '/api/v1/cases/c2', headers: h, body: JSON.stringify({ status: 'rejected', reason: '地下管線' }) })
    expect(ok.status).toBe(200)
    expect((ok.body as Body).status_reason).toBe('地下管線')
  })

  it('priorities honour weights and exclude closed cases by default', async () => {
    const f = makeFixture()
    const h = bearer(await f.tokenOf('gov'))
    const def = (await f.call({ method: 'GET', url: '/api/v1/priorities', headers: h })).body as Body
    expect(def.data.map((r: Body) => r.case_id).sort()).toEqual(['c1', 'c2', 'c4'])
    expect(def.meta.weights).toEqual({ demand: 25, shade: 25, feasibility: 25, fairness: 25 })
    expect(def.data.map((r: Body) => r.rank)).toEqual([1, 2, 3])
    const demandOnly = (await f.call({ method: 'GET', url: '/api/v1/priorities?demand=100&shade=0&feasibility=0&fairness=0', headers: h })).body as Body
    expect(demandOnly.data[0].case_id).toBe('c2') // 澆水最多
    expect(demandOnly.meta.weights.demand).toBe(100)
    const withClosed = (await f.call({ method: 'GET', url: '/api/v1/priorities?include_closed=true', headers: h })).body as Body
    expect(withClosed.meta.total).toBe(4)
    expect((await f.call({ method: 'GET', url: '/api/v1/priorities?demand=-1', headers: h })).status).toBe(400)
    const zero = (await f.call({ method: 'GET', url: '/api/v1/priorities?demand=0&shade=0&feasibility=0&fairness=0', headers: h })).body as Body
    expect(zero.data.every((r: Body) => r.score === 0)).toBe(true)
  })

  it('hotspots aggregate open cases by road', async () => {
    const f = makeFixture()
    const h = bearer(await f.tokenOf('gov'))
    const r = (await f.call({ method: 'GET', url: '/api/v1/hotspots', headers: h })).body as Body
    expect(r.data.map((x: Body) => x.road)).toEqual(['大安區路', '中正區路'])
    expect(r.data[1]).toMatchObject({ open_cases: 2, waterings: 7 })
  })

  it('reports: list and PATCH review (dismissed needs a reason)', async () => {
    const f = makeFixture()
    const h = bearer(await f.tokenOf('gov'))
    const list = (await f.call({ method: 'GET', url: '/api/v1/reports?district=大安區', headers: h })).body as Body
    expect(list.data).toHaveLength(1)
    expect(list.data[0]).toMatchObject({ id: 'r1', review_status: 'open', work_order_id: 'wo_report_r1', work_order_status: 'pending' })
    expect((await f.call({ method: 'PATCH', url: '/api/v1/reports/r1', headers: h, body: { status: 'dismissed' } })).status).toBe(422)
    const ok = await f.call({ method: 'PATCH', url: '/api/v1/reports/r1', headers: h, body: { status: 'acknowledged' } })
    expect((ok.body as Body).review_status).toBe('acknowledged')
    expect(f.reviews.r1.status).toBe('acknowledged')
    expect((await f.call({ method: 'PATCH', url: '/api/v1/reports/none', headers: h, body: { status: 'open' } })).status).toBe(404)
  })
})

describe('work orders', () => {
  it('gov sees all orders; vendor sees only its own district', async () => {
    const f = makeFixture()
    const gov = (await f.call({ method: 'GET', url: '/api/v1/work-orders', headers: bearer(await f.tokenOf('gov')) })).body as Body
    expect(gov.data.map((o: Body) => o.id).sort()).toEqual(['wo_report_r1', 'wo_report_r2', 'wo_wish_c1'])
    const green = (await f.call({ method: 'GET', url: '/api/v1/work-orders', headers: bearer(await f.tokenOf('green')) })).body as Body
    expect(green.data.map((o: Body) => o.id).sort()).toEqual(['wo_report_r2', 'wo_wish_c1'])
    expect(green.data.every((o: Body) => o.vendor_name === '綠野造園')).toBe(true)
    const cool = (await f.call({ method: 'GET', url: '/api/v1/work-orders?type=care', headers: bearer(await f.tokenOf('cool')) })).body as Body
    expect(cool.data.map((o: Body) => o.id)).toEqual(['wo_report_r1'])
  })

  it('vendor walks accept → progress → complete; completing a planting order plants the case', async () => {
    const f = makeFixture()
    const h = bearer(await f.tokenOf('green'))
    const step = (a: string, body?: unknown) => f.call({ method: 'POST', url: `/api/v1/work-orders/wo_wish_c1/${a}`, headers: h, body })
    expect((await step('progress')).status).toBe(409) // 還沒接單
    expect(((await step('accept')).body as Body).status).toBe('accepted')
    expect((await step('accept')).status).toBe(409)
    expect(((await step('progress')).body as Body).status).toBe('in_progress')
    const done = await step('complete', { note: '種下茄苳' })
    expect((done.body as Body)).toMatchObject({ status: 'done', completion_note: '種下茄苳' })
    expect(f.wishes[0].history.at(-1)!.status).toBe('planted')
    expect((await step('complete')).status).toBe(409)
  })

  it('vendor cannot touch another vendor\'s order (404, nothing changes)', async () => {
    const f = makeFixture()
    const cool = bearer(await f.tokenOf('cool'))
    for (const a of ['accept', 'progress', 'complete']) {
      const r = await f.call({ method: 'POST', url: `/api/v1/work-orders/wo_wish_c1/${a}`, headers: cool })
      expect(r.status).toBe(404)
    }
    expect(f.orders['wish:c1']).toBeUndefined()
  })

  it('gov (workorders:write) can advance any order', async () => {
    const f = makeFixture()
    const r = await f.call({ method: 'POST', url: '/api/v1/work-orders/wo_report_r1/accept', headers: bearer(await f.tokenOf('gov')) })
    expect(r.status).toBe(200)
    expect(f.orders['report:r1'].stage).toBe('accepted')
  })

  it('a vendor client with only read scope cannot advance orders', async () => {
    const { client, secret } = await newClient({ name: 'ro', type: 'vendor', vendorId: 'green-field', scopes: ['workorders:own:read'] }, 1)
    const f = makeFixture([client])
    const h = bearer(await f.token(client.clientId, secret))
    expect((await f.call({ method: 'GET', url: '/api/v1/work-orders', headers: h })).status).toBe(200)
    expect((await f.call({ method: 'POST', url: '/api/v1/work-orders/wo_wish_c1/accept', headers: h })).status).toBe(403)
  })
})

describe('usage log', () => {
  it('records calls per client, including failed token attempts', async () => {
    const f = makeFixture()
    await f.call({ method: 'POST', url: '/oauth/token', body: form({ grant_type: 'client_credentials', client_id: GOV.clientId, client_secret: 'bad' }) })
    const h = bearer(await f.tokenOf('green'))
    await f.call({ method: 'GET', url: '/api/v1/cases', headers: h })
    expect(f.logs.map((l) => `${l.clientId} ${l.method} ${l.path} ${l.status}`)).toEqual([
      'wt-demo-gov POST /oauth/token 401',
      'wt-demo-vendor-green POST /oauth/token 200',
      'wt-demo-vendor-green GET /api/v1/cases 403',
    ])
  })
})
