import { describe, expect, it } from 'vitest'
import { GOV_SCOPES, VENDOR_SCOPES, hasAnyScope, isScope, parseScopeString, presetScopes, validScopeSet } from '../scopes'
import { MCP_TOOLS } from '../mcp'

describe('scopes', () => {
  it('gov preset is the eight gov scopes, vendor preset is the two own scopes', () => {
    expect(presetScopes('gov')).toEqual([...GOV_SCOPES])
    expect(GOV_SCOPES).toHaveLength(8)
    expect(presetScopes('vendor')).toEqual(['workorders:own:read', 'workorders:own:write'])
  })
  it('a client type may only hold its own scopes', () => {
    expect(validScopeSet('gov', ['cases:read'])).toBe(true)
    expect(validScopeSet('gov', ['workorders:own:read'])).toBe(false)
    expect(validScopeSet('vendor', ['cases:read'])).toBe(false)
    expect(validScopeSet('vendor', [...VENDOR_SCOPES])).toBe(true)
    expect(validScopeSet('gov', [])).toBe(false)
    expect(validScopeSet('gov', ['cases:read', 'cases:read'])).toBe(false)
  })
  it('parses RFC 6749 scope strings and checks any-of', () => {
    expect(parseScopeString('  a   b ')).toEqual(['a', 'b'])
    expect(parseScopeString(undefined)).toEqual([])
    expect(isScope('cases:read')).toBe(true)
    expect(isScope('admin')).toBe(false)
    expect(hasAnyScope(['cases:read'], ['cases:write'])).toBe(false)
    expect(hasAnyScope(['workorders:own:read'], ['workorders:read', 'workorders:own:read'])).toBe(true)
  })
  it('every MCP tool needs scopes that exist', () => {
    for (const t of MCP_TOOLS) expect(t.scopes.every(isScope)).toBe(true)
  })
})
