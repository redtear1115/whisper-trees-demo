// 一次性遷移：雲端模式第一次啟動，偵測到這台裝置舊的本機資料（'whisper-trees:v1'）時，先問使用者。
// 搬：自己的許願、回報、打卡、光點／造型；樹洞要另外勾選才搬（標 migrated、保留原本的時間）。
// 不搬：示範許願的改動、GM 設定、工單、seen。全部寫入成功才清本機副本；備份鍵留到 2026-10-31。

import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { getSession, setSession, type MigrationSummary } from './session'
import { REPORT_KINDS, TAIPEI_DISTRICTS, WISH_REASONS, type Checkin, type TreeReport, type Whisper, type Wish } from './types'

export const LOCAL_KEY = 'whisper-trees:v1'
const BACKUP_KEY = 'whisper-trees:v1-backup'
const FLAG_KEY = 'whisper-trees:migrate'
/** 備份保留到這天（台北時間）結束 */
const BACKUP_UNTIL = Date.parse('2026-11-01T00:00:00+08:00')

interface LocalState {
  checkins?: Checkin[]
  whispers?: Record<string, Whisper[]>
  wishes?: Record<string, Wish>
  myWishIds?: string[]
  reports?: TreeReport[]
  ext?: { ledger?: LedgerEntry[]; inventory?: Inventory }
}
interface LedgerEntry {
  at: number
  delta: number
  reason: string
  key?: string
}
interface Inventory {
  owned: string[]
  equipped: { outfit?: string; frame?: string }
  civic: Record<string, number>
}

const get = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const set = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    // ignore
  }
}
const del = (k: string) => {
  try {
    localStorage.removeItem(k)
  } catch {
    // ignore
  }
}

function readLocal(): LocalState | null {
  const raw = get(LOCAL_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as LocalState
  } catch {
    return null
  }
}

function myWishes(l: LocalState): Wish[] {
  return (l.myWishIds ?? []).map((id) => l.wishes?.[id]).filter((w): w is Wish => !!w && !w.mock)
}

function summarize(l: LocalState): MigrationSummary {
  return {
    wishes: myWishes(l).length,
    reports: (l.reports ?? []).filter((r) => !r.mock).length,
    checkins: (l.checkins ?? []).length,
    progress: !!(l.ext?.ledger?.length || l.ext?.inventory?.owned?.length),
    whispers: Object.values(l.whispers ?? {}).reduce((n, list) => n + list.filter((w) => !w.mock).length, 0),
  }
}

const hasAnything = (s: MigrationSummary) => s.wishes + s.reports + s.checkins + s.whispers > 0 || s.progress

/** 備份過了期限就刪掉 */
export function pruneBackup() {
  if (Date.now() >= BACKUP_UNTIL) del(BACKUP_KEY)
}

export async function checkMigration(_db: Firestore, _uid: string) {
  pruneBackup()
  if (get(FLAG_KEY) || getSession().migration) return
  const l = readLocal()
  if (!l) return
  const summary = summarize(l)
  if (hasAnything(summary)) setSession({ migration: { summary, running: false } })
}

export function declineMigration() {
  set(FLAG_KEY, 'declined')
  setSession({ migration: null })
}

const validDistrict = (d: string) => (TAIPEI_DISTRICTS as readonly string[]).includes(d)
const ALLOWED_DETAILS = new Set(Object.values(REPORT_KINDS).flatMap((k) => k.details))

export async function runMigration(db: Firestore, uid: string, withWhispers: boolean) {
  const m = getSession().migration
  const l = readLocal()
  if (!m || m.running || !l) return
  setSession({ migration: { ...m, running: true, error: undefined } })
  try {
    // 先備份，之後才動雲端
    const raw = get(LOCAL_KEY)
    if (raw && !get(BACKUP_KEY)) set(BACKUP_KEY, raw)

    // 許願：一筆一個 batch；樹穴上已經有人許願的就跳過（規則不允許覆寫）
    for (const w of myWishes(l)) {
      if (!validDistrict(w.district)) continue
      const reasons = w.reasons.filter((r) => (WISH_REASONS as readonly string[]).includes(r))
      if (!reasons.length) continue
      const id = w.pitId ? `pit-${w.pitId}` : `spot-${uid}-${w.createdAt}`
      if ((await getDoc(doc(db, 'wishes', id))).exists()) continue
      const b = writeBatch(db)
      b.set(doc(db, 'wishes', id), {
        pitId: w.pitId,
        lngLat: w.lngLat,
        road: (w.road ?? '').slice(0, 40),
        district: w.district,
        reasons,
        feasibility: w.pitId ? 'emptyPit' : 'needsSurvey',
        createdAt: serverTimestamp(),
        createdBy: uid,
        history: [{ status: 'received', at: w.createdAt }],
      })
      b.set(doc(db, 'users', uid), { myWishIds: arrayUnion(id) }, { merge: true })
      await b.commit()
    }

    // 回報
    for (const r of (l.reports ?? []).filter((x) => !x.mock)) {
      if (!validDistrict(r.district) || !(r.kind in REPORT_KINDS)) continue
      const ref = doc(collection(db, 'reports'))
      const b = writeBatch(db)
      b.set(ref, {
        treeId: r.treeId.slice(0, 20),
        species: r.species.slice(0, 20),
        road: r.road.slice(0, 40),
        district: r.district,
        kind: r.kind,
        details: r.details.filter((d) => ALLOWED_DETAILS.has(d)).slice(0, 3),
        hasPhoto: !!r.hasPhoto,
        at: serverTimestamp(),
      })
      if (r.note) b.set(doc(db, 'reports', ref.id, 'private', 'note'), { note: r.note.slice(0, 140), createdBy: uid })
      b.set(doc(db, 'users', uid), { myReportIds: arrayUnion(ref.id) }, { merge: true })
      await b.commit()
    }

    // 打卡、光點、造型：和雲端上已有的合併
    const userRef = doc(db, 'users', uid)
    const cloud = (await getDoc(userRef)).data() ?? {}
    const patch: Record<string, unknown> = {}
    if (l.checkins?.length) patch.checkins = arrayUnion(...JSON.parse(JSON.stringify(l.checkins)))
    if (l.ext?.ledger?.length) {
      const have = new Set(((cloud.ledger ?? []) as LedgerEntry[]).map((e) => `${e.at}|${e.delta}|${e.reason}`))
      const add = l.ext.ledger.filter((e) => !have.has(`${e.at}|${e.delta}|${e.reason}`))
      patch.ledger = JSON.parse(JSON.stringify([...(cloud.ledger ?? []), ...add]))
    }
    const inv = l.ext?.inventory
    if (inv?.owned?.length || Object.keys(inv?.civic ?? {}).length) {
      const c = (cloud.inventory ?? { owned: [], equipped: {}, civic: {} }) as Inventory
      const civic = { ...c.civic }
      for (const [k, n] of Object.entries(inv?.civic ?? {})) civic[k] = Math.max(civic[k] ?? 0, n)
      patch.inventory = JSON.parse(
        JSON.stringify({
          owned: [...new Set([...(c.owned ?? []), ...(inv?.owned ?? [])])],
          equipped: { ...inv?.equipped, ...c.equipped },
          civic,
        }),
      )
    }
    if (Object.keys(patch).length) await setDoc(userRef, patch, { merge: true })

    // 樹洞：只有勾選才搬
    if (withWhispers) {
      for (const [treeId, list] of Object.entries(l.whispers ?? {})) {
        for (const w of list.filter((x) => !x.mock && x.text)) {
          await setDoc(doc(collection(db, 'users', uid, 'whispers')), {
            treeId: treeId.slice(0, 20),
            text: w.text.slice(0, 140),
            at: Timestamp.fromMillis(Math.min(w.at, Date.now() - 60_000)),
            migrated: true,
          })
        }
      }
    }

    // 全部成功才清本機副本
    del(LOCAL_KEY)
    set(FLAG_KEY, 'done')
    setSession({ migration: null })
  } catch (e) {
    console.warn('[migrate] 失敗', (e as { code?: string }).code ?? e)
    const cur = getSession().migration
    if (cur) setSession({ migration: { ...cur, running: false, error: '沒有存成功，這台裝置上的紀錄都還在。可以稍後再試。' } })
  }
}
