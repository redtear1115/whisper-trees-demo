// client_secret 的產生與雜湊。只存 SHA-256 與最後 4 碼，明文只在建立或重新產生時顯示一次。

function bytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n))
}

function b64url(a: Uint8Array): string {
  let s = ''
  for (const b of a) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function hex(a: Uint8Array): string {
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** 256 位元亂數，開頭 wts_ 方便辨認與掃描外洩 */
export function generateSecret(): string {
  return `wts_${b64url(bytes(32))}`
}

export function generateClientId(type: 'gov' | 'vendor'): string {
  return `wt-${type}-${hex(bytes(4))}`
}

export function generateAccessToken(): string {
  return `wt_at_${hex(bytes(24))}`
}

export async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return hex(new Uint8Array(d))
}

export const last4 = (s: string) => s.slice(-4)

/** 比對雜湊：固定走完全部字元，不因第一個不同就提早結束 */
export async function verifySecret(secret: string, storedHash: string): Promise<boolean> {
  const h = await sha256Hex(secret)
  if (h.length !== storedHash.length) return false
  let diff = 0
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ storedHash.charCodeAt(i)
  return diff === 0
}
