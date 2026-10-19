// access token 的簽發與驗證（模擬：存在記憶體，重新整理頁面就失效，等於都過期了）。

import { generateAccessToken } from './secret'
import type { Scope } from './scopes'

export const TOKEN_TTL_SECONDS = 3600

export interface TokenRecord {
  clientId: string
  scope: Scope[]
  issuedAt: number
  expiresAt: number
}

export type TokenLookup = { ok: true; record: TokenRecord } | { ok: false; reason: 'unknown' | 'expired' }

export class TokenStore {
  private tokens = new Map<string, TokenRecord>()
  private now: () => number
  constructor(now: () => number = Date.now) {
    this.now = now
  }

  issue(clientId: string, scope: Scope[], ttlSeconds = TOKEN_TTL_SECONDS): { access_token: string; expires_in: number } {
    const access_token = generateAccessToken()
    const issuedAt = this.now()
    this.tokens.set(access_token, { clientId, scope, issuedAt, expiresAt: issuedAt + ttlSeconds * 1000 })
    return { access_token, expires_in: ttlSeconds }
  }

  lookup(token: string): TokenLookup {
    const record = this.tokens.get(token)
    if (!record) return { ok: false, reason: 'unknown' }
    if (this.now() >= record.expiresAt) return { ok: false, reason: 'expired' }
    return { ok: true, record }
  }
}
