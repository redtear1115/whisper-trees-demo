// 光點流水帳：存在 store 的 ext.ledger。只能靠在現場或幫城市得到，不能用錢買。

import * as SunCalcNs from 'suncalc'
import { DEMO } from '../../config'
import { getExt, setExt, useStore, type State } from '../../store'
import { dayKey } from '../../lib/seed'
import { ACTION_LABEL, activeEvent, gameConfig, type Action } from './config'

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
 * 依 GM 規則發光點。key 重複就不發，回傳實際發出的點數（0 代表今天已經拿過）。
 */
export function award(action: Action, key: string, now = new Date()): number {
  const fullKey = `${action}:${key}:${dayKey(now)}`
  const list = ledger()
  if (list.some((e) => e.key === fullKey)) return 0
  const cfg = gameConfig()
  const event = activeEvent(cfg, dayKey(now))
  const mult = cfg.multiplier * (event?.multiplier ?? 1)
  const delta = Math.round(cfg.points[action] * mult)
  if (delta <= 0) return 0
  const reason = event ? `${ACTION_LABEL[action]}（${event.name}）` : ACTION_LABEL[action]
  setExt('ledger', [...baseLedger(), { at: now.getTime(), delta, reason, key: fullKey }])
  return delta
}

/** 打卡的光點：基本 + 白天的日照加成 */
export function awardCheckin(treeId: string, kind: 'success' | 'farView', now = new Date()): number {
  const base = award(kind === 'success' ? 'checkin' : 'farView', treeId, now)
  if (base === 0) return 0
  return base + (isDaytime(now) ? award('sun', treeId, now) : 0)
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
