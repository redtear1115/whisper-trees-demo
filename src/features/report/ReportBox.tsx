import { useEffect, useState } from 'react'
import { REPORT_KINDS, type ReportKind } from '../../store/types'
import { addReport } from '../../store'
import type { Tree } from '../../lib/trees'
import { Card } from '../../components/ui'

/** 樹況回報：修剪有問題／樹木生病。只有在現場（打卡或遠觀）才能送出。 */
export function ReportBox({ tree, onSite }: { tree: Tree; onSite: boolean }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<ReportKind | null>(null)
  const [details, setDetails] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo)), [photo])

  if (!onSite)
    return (
      <Card>
        <h2>樹況回報</h2>
        <p className="muted small">發現修剪有問題或樹生病了？到樹旁掃樹牌就能回報。</p>
      </Card>
    )

  if (sent)
    return (
      <Card>
        <h2>樹況回報</h2>
        <p className="banner ok">已送出，謝謝你。公園處會依路段彙整處理。</p>
        <button
          className="btn small"
          onClick={() => {
            setSent(false)
            setKind(null)
            setDetails([])
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
        <p className="muted small">修剪有問題、樹木生病，都可以告訴公園處。</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!kind) return
            addReport({
              treeId: tree.id,
              species: tree.species,
              road: tree.place,
              district: tree.district,
              kind,
              details,
              note,
              hasPhoto: !!photo,
            })
            setSent(true)
            setOpen(false)
          }}
        >
          <div className="kind-pick" role="radiogroup" aria-label="回報類別">
            {(Object.keys(REPORT_KINDS) as ReportKind[]).map((k) => (
              <button
                type="button"
                key={k}
                role="radio"
                aria-checked={kind === k}
                className={`kind ${kind === k ? 'on' : ''}`}
                onClick={() => {
                  setKind(k)
                  setDetails([])
                }}
              >
                {REPORT_KINDS[k].label}
              </button>
            ))}
          </div>
          {kind && (
            <div className="chips">
              {REPORT_KINDS[kind].details.map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`chip ${details.includes(d) ? 'on' : ''}`}
                  aria-pressed={details.includes(d)}
                  onClick={() => setDetails((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]))}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
          <textarea
            className="input"
            rows={2}
            maxLength={140}
            value={note}
            placeholder="補充說明（選填）"
            aria-label="補充說明"
            onChange={(e) => setNote(e.target.value)}
          />
          <label className="btn small">
            {photo ? '換一張照片' : '附照片（選填）'}
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
              <p className="muted small">照片只在你的手機上預覽，不會上傳。</p>
            </>
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
