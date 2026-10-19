// OAuth scope 清單：整個 API 與 MCP 只認這裡的定義（2026-10-20，見 docs/specs/08-extensions.md §7）。

export const GOV_SCOPES = [
  'hotspots:read',
  'priorities:read',
  'cases:read',
  'cases:write',
  'reports:read',
  'reports:write',
  'workorders:read',
  'workorders:write',
] as const

/** 廠商只能碰指派給自己的工單 */
export const VENDOR_SCOPES = ['workorders:own:read', 'workorders:own:write'] as const

export type GovScope = (typeof GOV_SCOPES)[number]
export type VendorScope = (typeof VENDOR_SCOPES)[number]
export type Scope = GovScope | VendorScope
export type ClientType = 'gov' | 'vendor'

export const ALL_SCOPES: readonly Scope[] = [...GOV_SCOPES, ...VENDOR_SCOPES]

export const SCOPE_LABEL: Record<Scope, string> = {
  'hotspots:read': '讀取需求熱點',
  'priorities:read': '讀取補種優先分數',
  'cases:read': '讀取案件',
  'cases:write': '修改案件狀態',
  'reports:read': '讀取樹況回報',
  'reports:write': '處理樹況回報',
  'workorders:read': '讀取全部工單',
  'workorders:write': '推進全部工單',
  'workorders:own:read': '讀取自己的工單',
  'workorders:own:write': '接單、施工、完工（自己的工單）',
}

export const TYPE_LABEL: Record<ClientType, string> = { gov: '政府系統', vendor: '廠商' }

export const SCOPES_BY_TYPE: Record<ClientType, readonly Scope[]> = { gov: GOV_SCOPES, vendor: VENDOR_SCOPES }

/** 建立用戶端時，依類型預設勾選的 scope（可以取消勾選，但不能超出這個類型的範圍） */
export function presetScopes(type: ClientType): Scope[] {
  return [...SCOPES_BY_TYPE[type]]
}

export function isScope(s: string): s is Scope {
  return (ALL_SCOPES as readonly string[]).includes(s)
}

/** scope 都屬於這個類型、至少一個、沒有重複 */
export function validScopeSet(type: ClientType, scopes: readonly string[]): boolean {
  const allowed = SCOPES_BY_TYPE[type] as readonly string[]
  return scopes.length > 0 && new Set(scopes).size === scopes.length && scopes.every((s) => allowed.includes(s))
}

/** RFC 6749 的 scope 字串：空白分隔 */
export function parseScopeString(s: string | undefined | null): string[] {
  return (s ?? '').split(/\s+/).filter(Boolean)
}

/** 持有的 scope 是否至少滿足需要的其中一個（端點允許「全部」或「自己的」兩種權限擇一） */
export function hasAnyScope(granted: readonly string[], needed: readonly Scope[]): boolean {
  return needed.some((n) => granted.includes(n))
}
