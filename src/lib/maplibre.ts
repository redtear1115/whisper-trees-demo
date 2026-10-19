// MapLibre v6 找 worker 是用自己模組旁邊的相對網址，打包後會找不到；把原封不動的 worker 檔當成資源複製出去再指定網址。
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

maplibregl.setWorkerUrl(workerUrl)

/** 地圖控制項的中文名稱（螢幕閱讀器與提示文字） */
export const MAP_LOCALE = {
  'AttributionControl.ToggleAttribution': '資料來源',
  'GeolocateControl.FindMyLocation': '找我的位置',
  'GeolocateControl.LocationNotAvailable': '無法取得位置',
  'Map.Title': '地圖',
  'Marker.Title': '地圖標記',
  'NavigationControl.ResetBearing': '指北針：拖曳旋轉地圖，點一下轉回北方',
  'NavigationControl.ZoomIn': '放大',
  'NavigationControl.ZoomOut': '縮小',
}

/** 底圖地名改用中文 */
export function applyChineseLabels(m: maplibregl.Map, skip: string[] = []) {
  for (const layer of m.getStyle().layers) {
    if (layer.type !== 'symbol' || skip.includes(layer.id) || !m.getLayoutProperty(layer.id, 'text-field')) continue
    m.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:zh-Hant'], ['get', 'name:zh'], ['get', 'name']])
  }
}

export { maplibregl }
