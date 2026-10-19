import { useEffect, useRef } from 'react'
import type { Map as MLMap, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLE } from '../../config'
import { MAP_LOCALE, applyChineseLabels, maplibregl } from '../../lib/maplibre'
import type { Tour } from '../../lib/route'

function pin(className: string, text: string, tag?: string): HTMLElement {
  const el = document.createElement('div')
  el.className = `route-pin ${className}`
  el.textContent = text
  if (tag) {
    const t = document.createElement('span')
    t.className = 'route-pin-tag'
    t.textContent = tag
    el.appendChild(t)
  }
  return el
}

/** 路線地圖：起點（你的位置）、依序編號的樹、終點，以及沿路的線。 */
export function RouteMap({ tour }: { tour: Tour }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const markers = useRef<Marker[]>([])
  const latest = useRef(tour)
  latest.current = tour

  useEffect(() => {
    const m = new maplibregl.Map({
      container: box.current!,
      style: MAP_STYLE,
      center: tour.start,
      zoom: 15,
      pitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: false,
      locale: MAP_LOCALE,
    })
    map.current = m
    ;(window as unknown as { __routeMap: MLMap }).__routeMap = m // 給自動化測試用
    m.touchZoomRotate.disableRotation()
    m.touchPitch.disable()
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    m.addControl(new maplibregl.AttributionControl({ compact: true }))
    m.once('load', () => {
      applyChineseLabels(m)
      // 署名預設展開會蓋住路線；收起來（點 ⓘ 仍可展開）
      const attrib = m.getContainer().querySelector('.maplibregl-ctrl-attrib')
      attrib?.classList.remove('maplibregl-compact-show')
      attrib?.removeAttribute('open')
      m.addSource('route', { type: 'geojson', data: line(latest.current) })
      m.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 } })
      m.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#2b5e38', 'line-width': 4.5 } })
      draw(m, latest.current, markers.current)
    })
    const ro = new ResizeObserver(() => m.resize())
    ro.observe(box.current!)
    return () => {
      ro.disconnect()
      markers.current.forEach((k) => k.remove())
      markers.current = []
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 路線換了（位置移動、點亮了新的樹）：重畫
  useEffect(() => {
    const m = map.current
    if (m && m.getSource('route')) draw(m, tour, markers.current)
  }, [tour])

  return <div ref={box} className="route-map" data-testid="route-map" />
}

function line(t: Tour) {
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: t.path } }
}

function draw(m: MLMap, t: Tour, markers: Marker[]) {
  ;(m.getSource('route') as maplibregl.GeoJSONSource).setData(line(t))
  markers.splice(0).forEach((k) => k.remove())
  markers.push(new maplibregl.Marker({ element: pin('start', '起', '起點') }).setLngLat(t.start).addTo(m))
  t.stops.forEach((s, i) => {
    const last = i === t.stops.length - 1
    markers.push(new maplibregl.Marker({ element: pin(last ? 'stop finish' : 'stop', String(i + 1), last ? '終點' : undefined) }).setLngLat(s.lngLat).addTo(m))
  })
  const b = new maplibregl.LngLatBounds(t.start, t.start)
  t.path.forEach((p) => b.extend(p))
  t.stops.forEach((s) => b.extend(s.lngLat))
  m.fitBounds(b, { padding: 48, maxZoom: 18, duration: 0 })
}
