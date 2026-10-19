import { describe, expect, it } from 'vitest'
import { BUILTIN_CLIENTS, DEMO_CREDENTIALS, newClient, revoke, rotateSecret, validateNewClient } from '../clients'
import { generateSecret, last4, sha256Hex, verifySecret } from '../secret'
import { TOKEN_TTL_SECONDS, TokenStore } from '../tokens'

describe('secret hashing', () => {
  it('hashes with SHA-256 and verifies', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    const s = generateSecret()
    expect(s).toMatch(/^wts_[A-Za-z0-9_-]{43}$/)
    expect(generateSecret()).not.toBe(s)
    const h = await sha256Hex(s)
    expect(await verifySecret(s, h)).toBe(true)
    expect(await verifySecret(s + 'x', h)).toBe(false)
    expect(await verifySecret(s, 'short')).toBe(false)
  })
  it('built-in demo clients match their published secrets', async () => {
    for (const d of DEMO_CREDENTIALS) {
      const c = BUILTIN_CLIENTS.find((x) => x.clientId === d.clientId)!
      expect(await verifySecret(d.secret, c.secretHash)).toBe(true)
    }
  })
})

describe('client lifecycle', () => {
  it('stores only the hash and last 4, never the secret', async () => {
    const { client, secret } = await newClient({ name: ' 公園處 ', type: 'gov', scopes: ['cases:read'] }, 1000)
    expect(JSON.stringify(client)).not.toContain(secret)
    expect(client.secretHash).toBe(await sha256Hex(secret))
    expect(client.secretLast4).toBe(last4(secret))
    expect(client.name).toBe('公園處')
    expect(client.clientId).toMatch(/^wt-gov-[0-9a-f]{8}$/)
  })
  it('rejects bad input', () => {
    expect(validateNewClient({ name: ' ', type: 'gov', scopes: ['cases:read'] })).toBe('name')
    expect(validateNewClient({ name: 'a', type: 'gov', scopes: [] })).toBe('scopes')
    expect(validateNewClient({ name: 'a', type: 'vendor', scopes: ['cases:read'], vendorId: 'green-field' })).toBe('scopes')
    expect(validateNewClient({ name: 'a', type: 'vendor', scopes: ['workorders:own:read'] })).toBe('vendor')
    expect(validateNewClient({ name: 'a', type: 'vendor', scopes: ['workorders:own:read'], vendorId: 'nope' })).toBe('vendor')
    expect(validateNewClient({ name: 'a', type: 'vendor', scopes: ['workorders:own:read'], vendorId: 'green-field' })).toBeNull()
  })
  it('regenerating changes the hash; revoking is permanent; built-ins cannot change', async () => {
    const { client } = await newClient({ name: 'a', type: 'gov', scopes: ['cases:read'] }, 1)
    const r = await rotateSecret(client, 2)
    expect(r.client.secretHash).not.toBe(client.secretHash)
    expect(r.client.secretRotatedAt).toBe(2)
    const revoked = revoke(r.client, 3)
    expect(revoked.status).toBe('revoked')
    await expect(rotateSecret(revoked, 4)).rejects.toThrow()
    await expect(rotateSecret(BUILTIN_CLIENTS[0], 4)).rejects.toThrow()
    expect(revoke(BUILTIN_CLIENTS[0], 5).status).toBe('active')
  })
})

describe('token store', () => {
  it('expires after the ttl', () => {
    let t = 0
    const s = new TokenStore(() => t)
    const { access_token, expires_in } = s.issue('c', ['cases:read'])
    expect(expires_in).toBe(TOKEN_TTL_SECONDS)
    expect(s.lookup(access_token).ok).toBe(true)
    t = TOKEN_TTL_SECONDS * 1000 - 1
    expect(s.lookup(access_token).ok).toBe(true)
    t = TOKEN_TTL_SECONDS * 1000
    expect(s.lookup(access_token)).toEqual({ ok: false, reason: 'expired' })
    expect(s.lookup('nope')).toEqual({ ok: false, reason: 'unknown' })
  })
})
