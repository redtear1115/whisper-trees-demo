/** 集章冊底下的一行出處（授權要求的標示都在這一行；章圖是佔位美術，順便說一聲）。 */
export function creditText(level: 'city' | 'district'): string {
  const osm = '區界 © OpenStreetMap contributors（ODbL）'
  return level === 'city'
    ? `${osm}。章圖是暫用的示意圖。`
    : `村里界 內政部國土測繪中心（政府資料開放授權條款第 1 版）；${osm}；樹木 臺北市政府開放資料。章圖是暫用的示意圖。`
}
