import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { findTree, type Tree } from '../lib/trees'
import { seededInt, weekKey } from '../lib/seed'
import type { CheckinResult } from '../lib/geo'
import { addWhisper, recentCheckin, useStore, visitedThisWeek, whispersOf } from '../store'
import { Art, Card, MockTag, formatDate, relativeDays } from '../components/ui'
import type { CheckinState } from './ScanPage'

export default function TreePage() {
  const { treeId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const fresh = (location.state as CheckinState | null)?.checkin
  const [tree, setTree] = useState<Tree | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    findTree(treeId).then((t) => alive && setTree(t))
    return () => {
      alive = false
    }
  }, [treeId])

  const checkins = useStore((s) => s.checkins)
  const myWhispers = useStore((s) => s.whispers[treeId])
  const recent = useMemo(() => recentCheckin(treeId), [treeId, checkins])
  const onSite: CheckinResult['kind'] | null =
    fresh?.kind === 'success' || fresh?.kind === 'farView' ? fresh.kind : recent?.result ?? null
  const sessionStart = recent?.at ?? Date.now()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const whispers = useMemo(() => whispersOf(treeId), [treeId, myWhispers])
  const capsule = onSite ? whispers.find((w) => w.at < sessionStart) : undefined
  const thisVisit = whispers.filter((w) => w.at >= sessionStart && !w.mock)
  const glow = seededInt(`${treeId}:${weekKey()}`, 0, 30) + (visitedThisWeek(treeId) ? 1 : 0)

  if (tree === undefined) return <div className="page center muted">正在找這棵樹…</div>
  if (tree === null)
    return (
      <div className="page center">
        <p>資料裡還沒有這棵樹（{treeId}）。</p>
        <Link className="btn" to="/">
          回地圖
        </Link>
      </div>
    )

  return (
    <div className="page tree-page">
      <header className="topbar">
        <button className="btn ghost" onClick={() => navigate('/')} aria-label="回地圖">
          ← 地圖
        </button>
        <span className="topbar-title">{tree.species}</span>
      </header>

      <Art id="tree-hero" alt={`${tree.species}的插畫`} className="hero" />

      <CheckinBanner fresh={fresh} onSite={onSite} treeId={treeId} />

      <Card className="glow-card">
        <div className="row gap center-v">
          <Art id="glow" alt="" className="icon" />
          <p className="glow-text">
            這棵樹本週有 <strong>{glow}</strong> 道微光陪伴
          </p>
          <MockTag />
        </div>
        <p className="muted small">只顯示人數，不會顯示任何人說了什麼。</p>
      </Card>

      {capsule && (
        <Card className="capsule">
          <div className="row gap center-v">
            <Art id="capsule" alt="" className="icon" />
            <div>
              <p className="muted small">
                上次你在這裡說了…… {relativeDays(capsule.at)}（{formatDate(capsule.at)}）
                {capsule.mock && <MockTag title="Demo 預先放的示範膠囊" />}
              </p>
              <p className="capsule-text">「{capsule.text}」</p>
            </div>
          </div>
        </Card>
      )}

      {onSite ? (
        <WhisperBox treeId={treeId} said={thisVisit.map((w) => w.text)} />
      ) : (
        <Card>
          <p>想對這棵樹說句話？走到樹旁邊，掃樹上的樹牌就可以。</p>
          <Link className="btn primary block" to="/scan">
            掃樹牌
          </Link>
        </Card>
      )}

      <Card>
        <h2>樹籍資料</h2>
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
          <dd className="mono">{tree.id}</dd>
        </dl>
        <p className="muted small">資料來源：臺北市政府工務局公園路燈工程管理處開放資料</p>
      </Card>
    </div>
  )
}

function CheckinBanner({
  fresh,
  onSite,
  treeId,
}: {
  fresh?: CheckinResult
  onSite: string | null
  treeId: string
}) {
  if (onSite === 'success') return <p className="banner ok">你在這棵樹旁邊。</p>
  if (onSite === 'farView')
    return <p className="banner ok">遠觀模式：這棵樹在安全島上，在人行道遠遠看著它就好。</p>
  if (fresh?.kind === 'tooFar')
    return (
      <p className="banner warn">
        你離這棵樹約 {Math.round(fresh.distance)} 公尺，走近一點再
        <Link to="/scan">掃一次</Link>。
      </p>
    )
  if (fresh?.kind === 'noLocation')
    return <p className="banner warn">沒有位置就無法打卡。可以先看看這棵樹的資料。</p>
  return (
    <p className="banner">
      只瀏覽：從地圖點進來不算打卡。<span className="mono muted small"> {treeId}</span>
    </p>
  )
}

function WhisperBox({ treeId, said }: { treeId: string; said: string[] }) {
  const [text, setText] = useState('')
  return (
    <Card className="whisper">
      <h2>樹洞</h2>
      <p className="muted small">只有你看得到。不會上傳，也不公開。</p>
      {said.map((t, i) => (
        <p key={i} className="whisper-said">
          「{t}」
        </p>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          addWhisper(treeId, text)
          setText('')
        }}
      >
        <textarea
          className="input"
          value={text}
          maxLength={140}
          rows={3}
          placeholder="對這棵樹說一句話"
          onChange={(e) => setText(e.target.value)}
          aria-label="對這棵樹說一句話"
        />
        <div className="row between center-v">
          <span className="muted small">{text.length} / 140</span>
          <button className="btn primary" disabled={!text.trim()}>
            留在樹洞
          </button>
        </div>
      </form>
    </Card>
  )
}
