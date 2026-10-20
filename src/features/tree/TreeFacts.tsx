import type { Tree } from '../../lib/trees'

/** 樹的資料：樹種、樹高、胸徑、路段、調查日期、樹籍編號與資料來源（樹的頁面「關於這棵樹」、拉近畫面的卡片共用） */
export function TreeFacts({ tree }: { tree: Tree }) {
  return (
    <>
      <dl className="facts">
        <dt>樹種</dt>
        <dd>{tree.species}</dd>
        <dt>樹高</dt>
        <dd>{tree.height ?? '—'} 公尺</dd>
        <dt>胸徑</dt>
        <dd>{tree.diameter ?? '—'} 公分</dd>
        <dt>{tree.kind === 'park' ? '公園' : '路段'}</dt>
        <dd>
          {tree.district} {tree.place}
          {tree.remark && <span className="muted">（{tree.remark}）</span>}
        </dd>
        <dt>調查日期</dt>
        <dd>{tree.surveyDate || '—'}</dd>
        <dt>樹籍編號</dt>
        <dd className="num">{tree.id}</dd>
      </dl>
      <p className="muted small">資料來源：臺北市政府工務局公園路燈工程管理處開放資料</p>
    </>
  )
}
