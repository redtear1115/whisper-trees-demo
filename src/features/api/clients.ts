// API 用戶端（OAuth client）：資料形狀、建立、重新產生、撤銷。純邏輯，存取在 clientStore.ts。

import { generateClientId, generateSecret, last4, sha256Hex } from './secret'
import { presetScopes, validScopeSet, type ClientType, type Scope } from './scopes'
import { vendorById } from './vendors'

export interface ApiClient {
  clientId: string
  name: string
  type: ClientType
  /** 廠商用戶端綁定的廠商；政府系統沒有 */
  vendorId?: string
  scopes: Scope[]
  /** client_secret 的 SHA-256（hex）；明文不存 */
  secretHash: string
  secretLast4: string
  createdAt: number
  status: 'active' | 'revoked'
  revokedAt?: number
  secretRotatedAt?: number
  /** 內建示範用戶端：secret 公開寫在 /developers，不能撤銷或重新產生 */
  builtin?: boolean
}

export interface NewClientInput {
  name: string
  type: ClientType
  vendorId?: string
  scopes: string[]
}

export type ClientError = 'name' | 'scopes' | 'vendor'

export function validateNewClient(input: NewClientInput): ClientError | null {
  if (!input.name.trim()) return 'name'
  if (!validScopeSet(input.type, input.scopes)) return 'scopes'
  if (input.type === 'vendor' && !vendorById(input.vendorId)) return 'vendor'
  return null
}

/** 建立用戶端；回傳的 secret 是唯一一次拿得到明文的機會 */
export async function newClient(input: NewClientInput, now: number): Promise<{ client: ApiClient; secret: string }> {
  const err = validateNewClient(input)
  if (err) throw new Error(err)
  const secret = generateSecret()
  const client: ApiClient = {
    clientId: generateClientId(input.type),
    name: input.name.trim().slice(0, 40),
    type: input.type,
    ...(input.type === 'vendor' ? { vendorId: input.vendorId } : {}),
    scopes: input.scopes as Scope[],
    secretHash: await sha256Hex(secret),
    secretLast4: last4(secret),
    createdAt: now,
    status: 'active',
  }
  return { client, secret }
}

/** 重新產生 secret：舊的立刻失效；已撤銷或內建的不行 */
export async function rotateSecret(client: ApiClient, now: number): Promise<{ client: ApiClient; secret: string }> {
  if (client.builtin || client.status === 'revoked') throw new Error('not-rotatable')
  const secret = generateSecret()
  return {
    client: { ...client, secretHash: await sha256Hex(secret), secretLast4: last4(secret), secretRotatedAt: now },
    secret,
  }
}

export function revoke(client: ApiClient, now: number): ApiClient {
  if (client.builtin || client.status === 'revoked') return client
  return { ...client, status: 'revoked', revokedAt: now }
}

// ---------- 內建示範用戶端（secret 公開，給 /developers 的試打用） ----------

export const DEMO_CREDENTIALS = [
  { clientId: 'wt-demo-gov', secret: 'demo-gov-secret', label: '示範・政府系統（全部政府端權限）' },
  { clientId: 'wt-demo-vendor-green', secret: 'demo-vendor1-secret', label: '示範・廠商 綠野造園' },
  { clientId: 'wt-demo-vendor-cool', secret: 'demo-vendor2-secret', label: '示範・廠商 蔭涼植栽' },
] as const

const BUILTIN_AT = Date.UTC(2026, 9, 20)

export const BUILTIN_CLIENTS: ApiClient[] = [
  {
    clientId: 'wt-demo-gov',
    name: '示範：公園處既有系統',
    type: 'gov',
    scopes: presetScopes('gov'),
    secretHash: 'ea6ac9bf4ca902bff3e912d37bf0948eeaf6db29f9565a33d56c6fb24cff028a',
    secretLast4: 'cret',
    createdAt: BUILTIN_AT,
    status: 'active',
    builtin: true,
  },
  {
    clientId: 'wt-demo-vendor-green',
    name: '示範：綠野造園',
    type: 'vendor',
    vendorId: 'green-field',
    scopes: presetScopes('vendor'),
    secretHash: '2ca6e73398c5ff9be410e3d34680cd64ed7a0b0ec94b0988c7d06e171c41602b',
    secretLast4: 'cret',
    createdAt: BUILTIN_AT,
    status: 'active',
    builtin: true,
  },
  {
    clientId: 'wt-demo-vendor-cool',
    name: '示範：蔭涼植栽',
    type: 'vendor',
    vendorId: 'cool-shade',
    scopes: presetScopes('vendor'),
    secretHash: '1c5c02b8c34df741f667d0dff7b7a1b2b765fa0186be78c5a78170385e715688',
    secretLast4: 'cret',
    createdAt: BUILTIN_AT,
    status: 'active',
    builtin: true,
  },
]
