// 底圖調色：把 OpenFreeMap positron 的灰白換成繪本紙張的暖色（2026-10-20，批評修正 M）。
// 底圖是遠端樣式，不能改檔，所以在樣式載入後用 setPaintProperty 逐層覆蓋。
// 純資料（TONE_PAINT）＋一個函式（toneBasemap）；地圖頁與迷霧地圖共用，同一套紙色。
import type { Map as MLMap } from 'maplibre-gl'

/** 全站共用的幾個底圖顏色（測試也從這裡讀） */
export const TONE = {
  /** 地圖底色：比頁面的紙色（#f7f3ea）深一點，讓白色的路看得出來 */
  paper: '#f2ebd9',
  ink: '#5b4e38',
  inkStrong: '#3d3426',
  halo: '#fbf6ea',
  road: '#fffaf0',
  roadCasing: '#d8c9a6',
  building: '#eadfc6',
  buildingEdge: '#d6c7a4',
  /** 立體建物：和平面建物同色系，淡、暖、略透明，樹才是主角 */
  building3d: '#efe7d3',
  water: '#c3d6d4',
  waterInk: '#3a5659',
  park: '#d6e2c2',
  wood: '#cddcb8',
}

type Paint = Record<string, unknown>

/** 圖層 id → 要覆蓋的繪製屬性。只列 positron 裡真的有的圖層；不存在的圖層會被略過。 */
export const TONE_PAINT: Record<string, Paint> = {
  background: { 'background-color': TONE.paper },
  park: { 'fill-color': TONE.park },
  landcover_wood: { 'fill-color': TONE.wood },
  landuse_residential: { 'fill-color': '#efe6d0' },
  water: { 'fill-color': TONE.water },
  waterway: { 'line-color': '#b7ceca' },
  building: { 'fill-color': TONE.building, 'fill-outline-color': TONE.buildingEdge },
  road_area_pier: { 'fill-color': TONE.paper },
  road_pier: { 'line-color': TONE.paper },
  highway_path: { 'line-color': '#e2d5b7' },
  highway_minor: { 'line-color': TONE.road, 'line-opacity': 1 },
  highway_major_casing: { 'line-color': TONE.roadCasing },
  highway_major_inner: { 'line-color': TONE.road },
  highway_major_subtle: { 'line-color': 'rgba(216, 201, 166, 0.7)' },
  highway_motorway_casing: { 'line-color': TONE.roadCasing },
  highway_motorway_inner: { 'line-color': TONE.road },
  highway_motorway_subtle: { 'line-color': 'rgba(216, 201, 166, 0.6)' },
  highway_motorway_bridge_casing: { 'line-color': TONE.roadCasing },
  highway_motorway_bridge_inner: { 'line-color': TONE.road },
  tunnel_motorway_casing: { 'line-color': '#ddd0b0' },
  tunnel_motorway_inner: { 'line-color': '#efe6d0' },
  railway: { 'line-color': '#d9cdb0' },
  railway_dashline: { 'line-color': '#f7f1e2' },
  railway_transit: { 'line-color': '#d9cdb0' },
  railway_transit_dashline: { 'line-color': '#f7f1e2' },
  railway_service: { 'line-color': '#d9cdb0' },
  railway_service_dashline: { 'line-color': '#f7f1e2' },
  // 街名要讀得清楚：暖褐色字（對紙色 ≥ 4.5:1）＋紙色描邊
  'highway-name-path': { 'text-color': TONE.ink, 'text-halo-color': TONE.halo, 'text-halo-width': 1.4 },
  'highway-name-minor': { 'text-color': TONE.ink, 'text-halo-color': TONE.halo, 'text-halo-width': 1.6 },
  'highway-name-major': { 'text-color': TONE.ink, 'text-halo-color': TONE.halo, 'text-halo-width': 1.6 },
  label_other: { 'text-color': TONE.inkStrong, 'text-halo-color': TONE.halo },
  label_village: { 'text-color': TONE.inkStrong, 'text-halo-color': TONE.halo },
  label_town: { 'text-color': TONE.inkStrong, 'text-halo-color': TONE.halo },
  label_state: { 'text-color': TONE.inkStrong, 'text-halo-color': TONE.halo },
  label_city: { 'text-color': TONE.inkStrong, 'text-halo-color': TONE.halo },
  label_city_capital: { 'text-color': TONE.inkStrong, 'text-halo-color': TONE.halo },
  water_name_point_label: { 'text-color': TONE.waterInk, 'text-halo-color': TONE.halo },
  water_name_line_label: { 'text-color': TONE.waterInk, 'text-halo-color': TONE.halo },
  waterway_line_label: { 'text-color': TONE.waterInk, 'text-halo-color': TONE.halo },
}

/** 立體建物的光：暖色、柔和，側面的陰影不再是中性灰 */
export const TONE_LIGHT = { anchor: 'viewport', color: '#fffaf0', intensity: 0.4, position: [1.5, 210, 40] } as const

/** 地圖頁的立體建物圖層用的繪製屬性（MapPage 加圖層時讀） */
export const BUILDING_3D_PAINT = {
  'fill-extrusion-color': TONE.building3d,
  'fill-extrusion-opacity': 0.88,
} as const

function apply(map: MLMap) {
  // 屬性名稱在執行時才知道（從 TONE_PAINT 來），型別上放寬
  const setPaint = map.setPaintProperty.bind(map) as (id: string, prop: string, value: unknown) => void
  for (const [id, paint] of Object.entries(TONE_PAINT)) {
    if (!map.getLayer(id)) continue
    for (const [prop, value] of Object.entries(paint)) {
      try {
        setPaint(id, prop, value)
      } catch {
        // 底圖樣式改版、屬性對不上：保持原樣，不讓地圖壞掉
      }
    }
  }
  try {
    map.setLight({ ...TONE_LIGHT, position: [...TONE_LIGHT.position] })
  } catch {
    // 同上
  }
}

/**
 * 把底圖調成繪本的暖紙色。在 `new maplibregl.Map(...)` 之後呼叫一次即可：
 * 樣式還沒載入就等 `style.load`；已經載入就馬上套用。同一張地圖重複呼叫沒有副作用。
 */
export function toneBasemap(map: MLMap): void {
  if (map.getLayer('background') || map.getLayer('building')) apply(map)
  else map.once('style.load', () => apply(map))
}

/** 底圖第一個文字圖層的 id：立體建物要加在它下面，街名才不會被建物蓋住 */
export function firstLabelLayerId(map: MLMap): string | undefined {
  return map.getStyle().layers.find((l) => l.type === 'symbol')?.id
}
