import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { REPORT_KINDS, type ReportKind } from '../../store/types'
import { addReport, useSession } from '../../store'
import type { Tree } from '../../lib/trees'
import { Card } from '../../components/ui'
import { award } from '../game/ledger'
import { gameConfig } from '../game/config'
import { reportPointsLine } from '../game/checkinLine'
import { InteractionMood } from '../journal/InteractionMood'

/** 樹況回報：五個類別一鍵選（團隊簡報 v17 第 22 頁）。只有在現場（打卡或遠觀）才能送出。送出得光點（GM 可調，預設 +15）。 */
export function ReportBox({ tree, onSite, openForm = false }: { tree: Tree; onSite: boolean; openForm?: boolean }) {
  // openForm：從地圖的「樹況回報」圈、#report 連結來，直接把表單展開
  const [open, setOpen] = useState(openForm)
  const [kind, setKind] = useState<ReportKind | null>(null)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  /** 送出的那一筆的時間（心情對回這一次回報）；null = 還沒送 */
  const [sent, setSent] = useState<number | null>(null)
  const [glow, setGlow] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const cloud = useSession().backend === 'cloud'

  useEffect(() => {
    if (openForm) setOpen(true)
  }, [openForm])

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo)), [photo])

  if (!onSite)
    return (
      <Card>
        <h2>樹況回報</h2>
        <p className="muted small">樹修剪得不對、生病了、擋路了？到樹旁掃樹牌就能回報。</p>
        {/* 這一頁的主要按鈕只留一個：樹洞區的「掃樹牌」是主要的，這裡降成次要。和樹洞的「掃樹牌」同一個介面：掃描頁從 state.hintTreeId 知道要打卡哪一棵 */}
        <Link className="btn block report-scan" to="/scan" state={{ hintTreeId: tree.id }} data-testid="report-scan">
          去掃樹牌
        </Link>
      </Card>
    )

  if (sent !== null)
    return (
      <Card>
        <h2>樹況回報</h2>
        <p className="banner ok">已送出，謝謝你。{reportPointsLine(glow)}</p>
        <p className="muted small">
          {cloud ? '回報會送到公園處，補充說明只有承辦人看得到。' : '這是示範：回報只存在這台裝置，不會真的送出。'}
        </p>
        <InteractionMood kind="report" treeId={tree.id} at={sent} open />
        <button
          className="btn small"
          onClick={() => {
            setSent(null)
            setKind(null)
            setNote('')
            setPhoto(null)
          }}
        >
          再回報一筆
        </button>
      </Card>
    )

  return (
    <Card className="report">
      <div className="row between center-v">
        <h2>樹況回報</h2>
        {!open && (
          <button className="btn small" onClick={() => setOpen(true)}>
            回報問題
          </button>
        )}
      </div>
      {!open ? (
        <p className="muted small">五種狀況一鍵選，附張照片就能送出，公園處會依街區路段彙整。回報一筆可以收進 {gameConfig().points.report} 道光點。</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!kind) return
            let at: number
            try {
              at = addReport({
                treeId: tree.id,
                species: tree.species,
                road: tree.place,
                district: tree.district,
                kind,
                details: [],
                note,
                hasPhoto: !!photo,
              }).at
            } catch {
              return setError('還沒連上雲端，請稍等一下再送出。')
            }
            setError(null)
            setGlow(award('report', tree.id))
            setSent(at)
            setOpen(false)
          }}
        >
          <div className="kind-pick" role="radiogroup" aria-label="回報類別">
            {(Object.keys(REPORT_KINDS) as ReportKind[]).map((k, i) => (
              <button
                type="button"
                key={k}
                role="radio"
                aria-checked={kind === k}
                className={`kind ${kind === k ? 'on' : ''}`}
                onClick={() => setKind(k)}
              >
                <span className="kind-no" aria-hidden="true">
                  {i + 1}
                </span>
                {REPORT_KINDS[k].label}
              </button>
            ))}
          </div>
          <textarea
            className="input"
            rows={2}
            maxLength={140}
            value={note}
            placeholder="補充說明（選填，請勿填寫個資）"
            aria-label="補充說明（選填，請勿填寫個資）"
            onChange={(e) => setNote(e.target.value)}
          />
          <label className="btn small">
            {photo ? '換一張照片' : '拍照或選照片（選填）'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="visually-hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setPhoto(URL.createObjectURL(f))
              }}
            />
          </label>
          {photo && (
            <>
              <img className="report-photo" src={photo} alt="回報照片預覽" />
              <button type="button" className="btn small" onClick={() => setPhoto(null)}>
                移除照片
              </button>
            </>
          )}
          <p className="muted small">照片只在這支手機上預覽，不會上傳，也不會存進雲端；承辦人只知道你有附照片。</p>
          {error && (
            <p className="error small" role="alert">
              {error}
            </p>
          )}
          <div className="row gap">
            <button className="btn primary" disabled={!kind}>
              送出回報
            </button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              取消
            </button>
          </div>
        </form>
      )}
    </Card>
  )
}
