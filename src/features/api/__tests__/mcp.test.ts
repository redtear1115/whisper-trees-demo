import { describe, expect, it } from 'vitest'
import { handleMcp, MCP_TOOLS } from '../mcp'
import { bearer, makeFixture } from './fixture'

type Body = Record<string, any> // eslint-disable-line
const rpc = (method: string, params?: unknown, id = 1) => ({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) })

describe('MCP', () => {
  it('requires a bearer token like REST', async () => {
    const f = makeFixture()
    const r = await handleMcp({ body: rpc('tools/list') }, f.deps)
    expect(r.status).toBe(401)
    expect(r.headers['www-authenticate']).toContain('Bearer')
    const bad = await handleMcp({ headers: bearer('nope'), body: rpc('tools/list') }, f.deps)
    expect(bad.status).toBe(401)
  })

  it('initialize reports tools capability', async () => {
    const f = makeFixture()
    const r = await handleMcp({ headers: bearer(await f.tokenOf('gov')), body: rpc('initialize', { protocolVersion: '2025-06-18' }) }, f.deps)
    expect((r.body as Body).result.capabilities.tools).toBeDefined()
    expect((r.body as Body).result.serverInfo.name).toBe('whisper-trees')
  })

  it('tools/list differs by role', async () => {
    const f = makeFixture()
    const names = async (n: 'gov' | 'green') => {
      const r = await handleMcp({ headers: bearer(await f.tokenOf(n)), body: rpc('tools/list') }, f.deps)
      return ((r.body as Body).result.tools as { name: string }[]).map((t) => t.name)
    }
    expect(await names('gov')).toEqual(MCP_TOOLS.map((t) => t.name))
    expect(MCP_TOOLS.map((t) => t.name)).toEqual(['list_hotspots', 'get_priorities', 'list_cases', 'update_case_status', 'list_reports', 'update_report', 'list_work_orders', 'update_work_order'])
    expect(await names('green')).toEqual(['list_work_orders', 'update_work_order'])
  })

  it('tools carry JSON Schemas', () => {
    for (const t of MCP_TOOLS) {
      expect(t.inputSchema.type).toBe('object')
      for (const r of t.inputSchema.required ?? []) expect(t.inputSchema.properties).toHaveProperty(r)
    }
  })

  it('tools/call update_case_status goes through the same store write', async () => {
    const f = makeFixture()
    const h = bearer(await f.tokenOf('gov'))
    const r = await handleMcp({ headers: h, body: rpc('tools/call', { name: 'update_case_status', arguments: { case_id: 'c2', status: 'surveying' } }) }, f.deps)
    const res = (r.body as Body).result
    expect(res.isError).toBe(false)
    expect(JSON.parse(res.content[0].text).status).toBe('surveying')
    expect(f.wishes.find((w) => w.id === 'c2')!.history.at(-1)!.status).toBe('surveying')
    const bad = await handleMcp({ headers: h, body: rpc('tools/call', { name: 'update_case_status', arguments: { case_id: 'c2', status: 'rejected' } }) }, f.deps)
    expect((bad.body as Body).result.isError).toBe(true)
    expect(JSON.parse((bad.body as Body).result.content[0].text).field).toBe('reason')
  })

  it('a vendor token cannot call gov tools (looks like they do not exist) but can run orders', async () => {
    const f = makeFixture()
    const h = bearer(await f.tokenOf('green'))
    const denied = await handleMcp({ headers: h, body: rpc('tools/call', { name: 'list_cases', arguments: {} }) }, f.deps)
    expect((denied.body as Body).error.code).toBe(-32602)
    const list = await handleMcp({ headers: h, body: rpc('tools/call', { name: 'list_work_orders', arguments: {} }) }, f.deps)
    expect(JSON.parse((list.body as Body).result.content[0].text).meta.total).toBe(2)
    const other = await handleMcp({ headers: bearer(await f.tokenOf('cool')), body: rpc('tools/call', { name: 'update_work_order', arguments: { work_order_id: 'wo_wish_c1', action: 'accept' } }) }, f.deps)
    expect((other.body as Body).result.isError).toBe(true)
    expect(JSON.parse((other.body as Body).result.content[0].text).error).toBe('not_found')
    const ok = await handleMcp({ headers: h, body: rpc('tools/call', { name: 'update_work_order', arguments: { work_order_id: 'wo_wish_c1', action: 'accept' } }) }, f.deps)
    expect(JSON.parse((ok.body as Body).result.content[0].text).status).toBe('accepted')
  })

  it('handles notifications, ping, unknown methods and parse errors', async () => {
    const f = makeFixture()
    const h = bearer(await f.tokenOf('gov'))
    expect((await handleMcp({ headers: h, body: { jsonrpc: '2.0', method: 'notifications/initialized' } }, f.deps)).status).toBe(202)
    expect(((await handleMcp({ headers: h, body: rpc('ping') }, f.deps)).body as Body).result).toEqual({})
    expect(((await handleMcp({ headers: h, body: rpc('resources/list') }, f.deps)).body as Body).error.code).toBe(-32601)
    expect(((await handleMcp({ headers: h, body: '{bad' }, f.deps)).body as Body).error.code).toBe(-32700)
    expect(((await handleMcp({ headers: h, body: { id: 1, method: 'x' } }, f.deps)).body as Body).error.code).toBe(-32600)
  })

  it('expired token on /mcp is 401', async () => {
    const f = makeFixture()
    const h = bearer(await f.tokenOf('gov'))
    f.clock.t += 3600_000
    expect((await handleMcp({ headers: h, body: rpc('tools/list') }, f.deps)).status).toBe(401)
  })
})
