import { beforeEach, describe, expect, it } from 'vitest'
import { LEGACY_REPORT_DETAILS, REPORT_KINDS, normalizeReportKind } from '../types'
import { addReport, allReports, getState, resetAll } from '..'
import { reportResource } from '../../features/api/resources'

beforeEach(() => resetAll())

describe('report categories (deck v17 slide 22)', () => {
  it('has the five categories in order, with the deck wording', () => {
    expect(Object.values(REPORT_KINDS).map((k) => k.label)).toEqual([
      '樹木修剪問題',
      '病蟲害',
      '遮蔭太多，或修剪過度',
      '新長枝芽擋路',
      '其他',
    ])
  })

  it('passes new ids through', () => {
    for (const k of Object.keys(REPORT_KINDS)) expect(normalizeReportKind(k)).toBe(k)
    expect(normalizeReportKind('pruning', [])).toBe('pruning')
  })

  it('maps the old kinds and details to the new categories', () => {
    expect(normalizeReportKind('pruning', ['修剪過度'])).toBe('shade')
    expect(normalizeReportKind('pruning', ['遮蔭過多'])).toBe('shade')
    expect(normalizeReportKind('pruning', ['枝葉擋路'])).toBe('sprout')
    expect(normalizeReportKind('pruning', ['修剪過度', '枝葉擋路'])).toBe('shade')
    expect(normalizeReportKind('sick', ['病蟲害'])).toBe('pest')
    expect(normalizeReportKind('sick', ['枯枝或落枝'])).toBe('other')
    expect(normalizeReportKind('sick', ['樹幹傾斜或受損'])).toBe('other')
    expect(normalizeReportKind('sick', [])).toBe('other')
  })

  it('anything unknown becomes "other"', () => {
    expect(normalizeReportKind('fire')).toBe('other')
  })

  it('legacy detail names are what the old UI wrote', () => {
    expect(LEGACY_REPORT_DETAILS).toEqual(['修剪過度', '遮蔭過多', '枝葉擋路', '病蟲害', '枯枝或落枝', '樹幹傾斜或受損'])
  })

  it('seeded (old-format) demo reports show the new labels', () => {
    const kinds = allReports().map((r) => r.kind)
    expect(kinds.every((k) => k in REPORT_KINDS)).toBe(true)
    const byId = Object.fromEntries(allReports().map((r) => [r.id, r.kind]))
    expect(byId['mock-r1']).toBe('shade') // 修剪過度
    expect(byId['mock-r2']).toBe('sprout') // 枝葉擋路
    expect(byId['mock-r3']).toBe('other') // 枯枝或落枝
    expect(byId['mock-r4']).toBe('pest') // 病蟲害
  })

  it('an old report already saved on this device (kind sick) still renders', () => {
    const old = {
      id: 'r-old', treeId: 'DA0030211045', species: '茄苳', road: '信義路二段', district: '大安區',
      kind: 'sick', details: ['病蟲害'], note: '', hasPhoto: false, at: Date.now(),
    }
    // 本機存的舊回報走 allReports 讀出時會換成新類別
    const list = allReports({ ...getState(), reports: [old as never] })
    expect(list.find((r) => r.id === 'r-old')?.kind).toBe('pest')
  })

  it('a new report has no details, and works through the API shape (work orders derive from reports)', () => {
    const r = addReport({ treeId: 'DA0030211045', species: '茄苳', road: '信義路二段', district: '大安區', kind: 'sprout', details: [], note: '', hasPhoto: true })
    expect(allReports()[0].id).toBe(r.id)
    const res = reportResource(allReports()[0], undefined, undefined)
    expect(res).toMatchObject({ kind: 'sprout', kind_label: '新長枝芽擋路', has_photo: true, work_order_id: `wo_report_${r.id}` })
    // 舊格式也不會壞
    const legacy = reportResource({ ...r, kind: 'sick' as never, details: ['病蟲害'] }, undefined, undefined)
    expect(legacy).toMatchObject({ kind: 'pest', kind_label: '病蟲害' })
  })
})
