import { useCallback, useEffect, useRef, useState } from 'react'
import { photoUrl, type SpeciesPhoto } from '../../lib/speciesPhotos'
import { indexFromScroll, photoAlt, slideLabel, wrapIndex } from './carousel'

/**
 * 樹種照片輪播（iNaturalist，CC0 / CC BY）。CSS scroll-snap 可以用手指滑，也有上一張／下一張按鈕與圓點。
 * 不會自動換頁；每張照片下面一定標攝影者、授權、原始觀察連結。
 */
export function PhotoCarousel({
  species,
  photos,
  className,
  note,
}: {
  species: string
  photos: SpeciesPhoto[]
  className?: string
  /** 照片下方、署名上方的一句話，例如「這個樹種的照片，不是這一棵樹。」 */
  note?: string
}) {
  const track = useRef<HTMLDivElement>(null)
  const raf = useRef(0)
  const [index, setIndex] = useState(0)
  const n = photos.length

  useEffect(() => {
    setIndex(0)
    track.current?.scrollTo({ left: 0 })
  }, [species])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const onScroll = useCallback(() => {
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      const el = track.current
      if (el) setIndex(indexFromScroll(el.scrollLeft, el.clientWidth, n))
    })
  }, [n])

  const go = (i: number) => {
    const el = track.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: wrapIndex(i, n) * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' })
  }

  if (n === 0) return null
  const cur = photos[Math.min(index, n - 1)]
  return (
    <div className={`carousel ${className ?? ''}`} role="region" aria-roledescription="carousel" aria-label={`${species}的照片`} data-testid="photo-carousel">
      <div className="carousel-stage">
        <div
          ref={track}
          className="carousel-track"
          onScroll={onScroll}
          tabIndex={0}
          aria-label={`${species}的照片，左右滑動換下一張`}
          data-testid="carousel-track"
        >
          {photos.map((p, i) => (
            <div key={p.src} className="carousel-slide" role="group" aria-roledescription="slide" aria-label={slideLabel(i, n)}>
              <img
                src={photoUrl(p.src)}
                alt={photoAlt(species, p)}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
              />
            </div>
          ))}
        </div>
        {n > 1 && (
          <>
            <button type="button" className="carousel-nav prev" aria-label="上一張照片" onClick={() => go(index - 1)} data-testid="carousel-prev">
              <span aria-hidden="true">‹</span>
            </button>
            <button type="button" className="carousel-nav next" aria-label="下一張照片" onClick={() => go(index + 1)} data-testid="carousel-next">
              <span aria-hidden="true">›</span>
            </button>
            <div className="carousel-dots">
              {photos.map((p, i) => (
                <button
                  key={p.src}
                  type="button"
                  className={`carousel-dot ${i === index ? 'on' : ''}`}
                  aria-label={`看${slideLabel(i, n)}`}
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => go(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {note && <p className="carousel-note small muted">{note}</p>}
      <p className="carousel-credit small" aria-live="polite" data-testid="carousel-credit">
        <span>{cur.credit}</span>
        <a href={cur.licenceUrl} target="_blank" rel="noopener noreferrer">
          授權條款
        </a>
        <a href={cur.link} target="_blank" rel="noopener noreferrer">
          iNaturalist 原照片
        </a>
      </p>
    </div>
  )
}
