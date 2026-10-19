import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isProtectedTree, loadProtectedTrees, parseProtectedTrees, setProtectedTreesForTest } from '../protectedTrees'

const entry = { treeId: 'SL0560111023', protectedNo: 7, species: '榕', distanceM: 1.2, match: 'species' }

beforeEach(() => setProtectedTreesForTest(null))
afterEach(() => vi.unstubAllGlobals())

describe('parseProtectedTrees', () => {
  it('keeps well-formed entries and drops the rest', () => {
    const l = parseProtectedTrees({ attribution: 'a', source: 's', trees: [entry, { ...entry, treeId: '' }, { ...entry, protectedNo: 'x' }, null, 'no'] })
    expect(l.trees).toEqual([entry])
    expect(l.attribution).toBe('a')
  })
  it('a broken file is an empty list', () => {
    expect(parseProtectedTrees(null).trees).toEqual([])
    expect(parseProtectedTrees({ trees: 'nope' }).trees).toEqual([])
  })
})

describe('loadProtectedTrees / isProtectedTree', () => {
  it('is false until loaded, then true for listed TreeIDs, compared as whole strings', async () => {
    const f = vi.fn(async () => ({ ok: true, json: async () => ({ trees: [entry, { ...entry, treeId: 'JJ0042241054-001', protectedNo: 42 }] }) }))
    vi.stubGlobal('fetch', f)
    expect(isProtectedTree('SL0560111023')).toBe(false)
    await loadProtectedTrees()
    await loadProtectedTrees()
    expect(f).toHaveBeenCalledTimes(1)
    expect(String((f.mock.calls[0] as unknown[])[0])).toMatch(/data\/protected-trees\.json$/)
    expect(isProtectedTree('SL0560111023')).toBe(true)
    expect(isProtectedTree('JJ0042241054-001')).toBe(true)
    // 後綴要整串比對
    expect(isProtectedTree('JJ0042241054')).toBe(false)
    expect(isProtectedTree('SL0560111024')).toBe(false)
  })
  it('a failed load leaves everything unprotected and is retried next time', async () => {
    const f = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ ok: true, json: async () => ({ trees: [entry] }) })
    vi.stubGlobal('fetch', f)
    await loadProtectedTrees()
    expect(isProtectedTree('SL0560111023')).toBe(false)
    await loadProtectedTrees()
    expect(isProtectedTree('SL0560111023')).toBe(true)
    expect(f).toHaveBeenCalledTimes(2)
  })
})

describe('real file (public/data/protected-trees.json)', () => {
  const raw = JSON.parse(readFileSync('public/data/protected-trees.json', 'utf8'))
  const list = parseProtectedTrees(raw)
  it('nothing is dropped, TreeIDs and protected numbers are unique, match types are known', () => {
    expect(list.trees.length).toBe(raw.trees.length)
    expect(list.trees.length).toBeGreaterThan(1000)
    expect(new Set(list.trees.map((t) => t.treeId)).size).toBe(list.trees.length)
    expect(new Set(list.trees.map((t) => t.protectedNo)).size).toBe(list.trees.length)
    expect(list.trees.every((t) => t.match === 'species' || t.match === 'near')).toBe(true)
    expect(list.trees.every((t) => t.distanceM <= (t.match === 'near' ? 3 : 8))).toBe(true)
    expect(list.attribution).toMatch(/政府資料開放授權條款/)
  })
  it('every TreeID exists in the lookup files, with the same whole string', () => {
    const files = new Map<string, Record<string, unknown>>()
    for (const t of list.trees) {
      const prefix = t.treeId.slice(0, 2)
      if (!files.has(prefix)) files.set(prefix, JSON.parse(readFileSync(`public/data/trees/${prefix}.json`, 'utf8')).trees)
      expect(files.get(prefix)![t.treeId], t.treeId).toBeDefined()
    }
  })
})
