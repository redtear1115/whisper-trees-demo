import { useEffect, useMemo, useRef } from 'react'
import type { FeatureCollection } from 'geojson'
import type { Map as MLMap } from 'maplibre-gl'
import { maplibregl } from '../../lib/maplibre'
import { MAP_STYLE } from '../../config'
import type { Wish, WishStatus } from '../../store/types'
import { wishStatus } from '../../store'

const COLOR: Record<WishStatus, string> = {
  received: '#8c8a83',
  surveying: '#4a78b5',
  scheduled: '#d08a2e',
  planted: '#3f7d4e',
  rejected: '#b4483c',
}

export interface MapRow {
  wish: Wish
  score: number
}

function toGeoJSON(rows: MapRow[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: rows.map(({ wish, score }) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: wish.lngLat },
      properties: { id: wish.id, score, color: COLOR[wishStatus(wish)] },
    })),
  }
}

/** 政府端地圖檢視：每筆許願一個圓點，顏色是狀態、大小是優先分數 */
export function GovMap({ rows, onPick }: { rows: MapRow[]; onPick: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const pick = useRef(onPick)
  pick.current = onPick
  const data = useMemo(() => toGeoJSON(rows), [rows])
  const latest = useRef(data)
  latest.current = data

  useEffect(() => {
    const m = new maplibregl.Map({ container: el.current!, style: MAP_STYLE, center: [121.55, 25.04], zoom: 10.8 })
    map.current = m
    m.on('load', () => {
      m.addSource('wishes', { type: 'geojson', data: latest.current })
      m.addLayer({
        id: 'wishes',
        type: 'circle',
        source: 'wishes',
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 0, 5, 1, 16],
          'circle-opacity': 0.8,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1.5,
        },
      })
      m.on('click', 'wishes', (e) => {
        const id = e.features?.[0]?.properties?.id
        if (id) pick.current(id as string)
      })
      m.on('mouseenter', 'wishes', () => (m.getCanvas().style.cursor = 'pointer'))
      m.on('mouseleave', 'wishes', () => (m.getCanvas().style.cursor = ''))
    })
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    // 地圖還沒載完時，load 事件會用 latest.current
    ;(map.current?.getSource('wishes') as maplibregl.GeoJSONSource | undefined)?.setData(data)
  }, [data])

  return (
    <div>
      <div ref={el} className="gov-map" />
      <p className="muted small">
        {(Object.keys(COLOR) as WishStatus[]).map((s) => (
          <span key={s} style={{ marginRight: 12 }}>
            <span className="legend" style={{ background: COLOR[s], verticalAlign: 'middle' }} />{' '}
            {{ received: '已收件', surveying: '會勘中', scheduled: '已排程', planted: '已種植', rejected: '不可種' }[s]}
          </span>
        ))}
        ・圓越大，優先分數越高
      </p>
    </div>
  )
}
