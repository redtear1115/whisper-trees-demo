// 光點流水帳：存在 store 的 ext.ledger。只能靠在現場或幫城市得到，不能用錢買。

import * as SunCalcNs from 'suncalc'
import { DEMO } from '../../config'
import { getExt, getState, setExt, useStore, type State } from '../../store'
import { dayKey } from '../../lib/seed'
import { ACTION_LABEL, activeEvent, gameConfig, TREE_ACTIONS, type Action } from './config'
import { calcTreePoints, reasonOf, type TreeAction } from './points'
import { isProtectedTree } from './protectedTrees'
import { daysSinceVisit } from './visits'

export interface Entry {
  at: number
  delta: number
  reason: string
  /** 去重用：同一個 key 只會記一次（例如同一棵樹同一天打卡） */
  key?: string
}

const NONE: Entry[] = []

/** 真正存下來的流水帳（寫入時以它為底，不能把本機覆寫的補發混進去） */
export function baseLedger(s?: State): Entry[] {
  return getExt<Entry[]>('ledger', NONE, s)
}

let merged: { base: Entry[]; extra: Entry[]; list: Entry[] } | null = null

/** 流水帳 = 存下來的 + GM 在這台裝置補發的（本機覆寫，不進雲端） */
export function ledger(s?: State): Entry[] {
  const base = baseLedger(s)
  const extra = getExt<Entry[]>('ledgerOverlay', NONE, s)
  if (extra === NONE || extra.length === 0) return base
  if (!merged || merged.base !== base || merged.extra !== extra) {
    merged = { base, extra, list: [...base, ...extra].sort((a, b) => a.at - b.at) }
  }
  return merged.list
}

export function balance(s?: State): number {
  return ledger(s).reduce((n, e) => n + e.delta, 0)
}

/** 累計獲得（花掉不會變少），角色依這個長大 */
export function earned(s?: State): number {
  return ledger(s).reduce((n, e) => n + Math.max(0, e.delta), 0)
}

export function useBalance() {
  return useStore((s) => balance(s))
}

export function useEarned() {
  return useStore((s) => earned(s))
}

export function useLedger() {
  return useStore((s) => ledger(s))
}

/** 台北現在是不是白天（日出到日落） */
// suncalc 是 CommonJS，打包後可能包在 default 裡
const SunCalc = ((SunCalcNs as unknown as { default?: typeof SunCalcNs }).default ?? SunCalcNs) as typeof SunCalcNs

export function isDaytime(now = new Date()): boolean {
  const t = SunCalc.getTimes(now, DEMO.center[1], DEMO.center[0])
  if (!t.sunrise || !t.sunset) return true
  return now >= t.sunrise && now < t.sunset
}

/**
 * 日照倍率：日出到日落之間像一座小山，日出與日落是 ×1，正午前後最高 ×max（預設 1.5）；夜間 ×1。
 * 例：台北 10 月中午約 ×1.5，上午 8 點約 ×1.3。
 */
export function daylightFactor(now = new Date(), max = 1.5): number {
  const t = SunCalc.getTimes(now, DEMO.center[1], DEMO.center[0])
  if (!t.sunrise || !t.sunset) return 1
  const span = t.sunset.getTime() - t.sunrise.getTime()
  const at = now.getTime() - t.sunrise.getTime()
  if (span <= 0 || at <= 0 || at >= span) return 1
  return 1 + Math.max(0, max - 1) * Math.sin((Math.PI * at) / span)
}

/** 今天（台北日曆日）這棵樹已經記過幾個互動、這是今天第幾棵不同的樹打卡 */
function treeDayCounts(treeId: string, day: string): { done: number; order: number } {
  const trees = new Set<string>()
  let done = 0
  for (const e of ledger()) {
    if (!e.key?.endsWith(`:${day}`)) continue
    const first = e.key.indexOf(':')
    const action = e.key.slice(0, first)
    const id = e.key.slice(first + 1, e.key.lastIndexOf(':'))
    if (action === 'checkin' || action === 'farView') trees.add(id)
    if (id === treeId && (TREE_ACTIONS as readonly string[]).includes(action)) done++
  }
  return { done, order: trees.has(treeId) ? [...trees].indexOf(treeId) + 1 : trees.size + 1 }
}

/**
 * 依 GM 規則發光點。key 重複就不發，回傳實際發出的點數（0 代表今天已經拿過，或這棵樹今天的互動已經超過 3 個）。
 * 在樹旁的互動（打卡、遠觀、樹洞、回報）依 points.ts 算：同棵樹第幾個互動、日照、寂寞樹、受保護、每日減半；
 * 許願與澆水是固定點數。
 */
export function award(action: Action, key: string, now = new Date(), opts: { protectedTree?: boolean } = {}): number {
  const day = dayKey(now)
  const fullKey = `${action}:${key}:${day}`
  if (ledger().some((e) => e.key === fullKey)) return 0
  const cfg = gameConfig()
  const event = activeEvent(cfg, day)
  let delta: number
  let reason: string
  if ((TREE_ACTIONS as readonly string[]).includes(action)) {
    const { done, order } = treeDayCounts(key, day)
    const r = calcTreePoints(
      {
        action: action as TreeAction,
        slot: done + 1,
        treeOrder: order,
        daylight: daylightFactor(now, cfg.sunMax),
        lonelyDays: daysSinceVisit(key, getState().checkins, now).days,
        protectedTree: opts.protectedTree ?? isProtectedTree(key),
        eventMult: event?.multiplier ?? 1,
      },
      cfg,
    )
    delta = r.delta
    reason = reasonOf(action as TreeAction, r.parts, event?.name)
  } else {
    const pts = cfg.points[action as keyof typeof cfg.points] ?? 0
    delta = Math.round(pts * cfg.multiplier * (event?.multiplier ?? 1))
    reason = event ? `${ACTION_LABEL[action]}（${event.name}）` : ACTION_LABEL[action]
  }
  if (delta <= 0) return 0
  setExt('ledger', [...baseLedger(), { at: now.getTime(), delta, reason, key: fullKey }])
  return delta
}

/** 打卡的光點（日照、寂寞樹等加成都已經算在裡面，原因寫在流水帳） */
export function awardCheckin(treeId: string, kind: 'success' | 'farView', now = new Date()): number {
  return award(kind === 'success' ? 'checkin' : 'farView', treeId, now)
}

export function spend(amount: number, reason: string): boolean {
  if (amount <= 0 || balance() < amount) return false
  setExt('ledger', [...baseLedger(), { at: Date.now(), delta: -amount, reason }])
  return true
}

/** GM 補發或扣回（客服用）。一律只記在這台裝置（本機覆寫），不寫進雲端的光點。 */
export function adjust(delta: number, reason: string) {
  setExt('ledgerOverlay', [...getExt<Entry[]>('ledgerOverlay', NONE), { at: Date.now(), delta, reason }])
}
