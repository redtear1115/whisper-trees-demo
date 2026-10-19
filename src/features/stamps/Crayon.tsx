/**
 * 蠟筆的紙感：邊緣微微抖動、填色有一點紙紋留白。
 * 一個 SVG 濾鏡，套在整組區塊上（同一個位移場，相鄰區的共用邊不會裂開）；文字不套，維持清楚。
 * unitsPerPx：畫布 1 個螢幕像素等於幾個 SVG 單位，讓紙紋大小在城市與里兩張圖上看起來一樣。
 */
export function CrayonDefs({ id, unitsPerPx }: { id: string; unitsPerPx: number }) {
  const u = Math.max(unitsPerPx, 0.01)
  return (
    <defs>
      <filter id={id} x="-1%" y="-1%" width="102%" height="102%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency={0.035 / u} numOctaves={2} seed={4} result="warp" />
        <feDisplacementMap in="SourceGraphic" in2="warp" scale={3 * u} xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feTurbulence type="fractalNoise" baseFrequency={0.8 / u} numOctaves={1} seed={9} result="grain" />
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.1 0 0 0 1.5" result="speck" />
        <feComposite in="rough" in2="speck" operator="in" />
      </filter>
    </defs>
  )
}
