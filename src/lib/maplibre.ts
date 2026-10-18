// MapLibre v6 找 worker 是用自己模組旁邊的相對網址，打包後會找不到；把原封不動的 worker 檔當成資源複製出去再指定網址。
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

maplibregl.setWorkerUrl(workerUrl)

export { maplibregl }
