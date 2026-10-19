// 依 src/assets.ts 的清單產生佔位 SVG（public/assets/ph/）與給設計的清單 docs/ui-assets.md。
// Run: node scripts/make_placeholders.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(root, 'src/assets.ts'), 'utf8')
const assets = [...src.matchAll(/\{ id: '([^']+)', w: (\d+), h: (\d+), where: '([^']+)', brief: '([^']+)' \}/g)].map(
  ([, id, w, h, where, brief]) => ({ id, w: +w, h: +h, where, brief }),
)

const icons = [...src.matchAll(/\{ file: '([^']+)', size: (\d+), brief: '([^']+)' \}/g)].map(([, file, size, brief]) => ({
  file,
  size: +size,
  brief,
}))

const hue = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const outDir = join(root, 'public/assets/ph')
mkdirSync(outDir, { recursive: true })
for (const a of assets) {
  const small = Math.min(a.w, a.h) <= 120
  const fs = Math.max(8, Math.min(small ? Math.round(a.w / 7) : 18, Math.floor((a.w * 1.6) / a.id.length)))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${a.w}" height="${a.h}" viewBox="0 0 ${a.w} ${a.h}">
<rect x="1" y="1" width="${a.w - 2}" height="${a.h - 2}" rx="${small ? 14 : 12}" fill="hsl(${hue(a.id)} 45% 90%)" stroke="hsl(${hue(a.id)} 35% 55%)" stroke-width="2" stroke-dasharray="6 4"/>
<text x="50%" y="${small ? '50%' : '46%'}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="${fs}" fill="hsl(${hue(a.id)} 30% 30%)">${esc(a.id)}</text>
${small ? '' : `<text x="50%" y="58%" text-anchor="middle" font-family="sans-serif" font-size="13" fill="hsl(${hue(a.id)} 20% 40%)">${a.w}×${a.h} 佔位</text>`}
</svg>
`
  writeFileSync(join(outDir, `${a.id}.svg`), svg)
}


// ---- PWA 佔位圖示（PNG，不靠任何套件）：綠底、米色圓、一株小芽。主體在中間 80% 內，遮罩圖示也安全。 ----
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'latin1')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}
const encodePng = (size, rgb) => {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.set([8, 2, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
const GREEN = [0x3f, 0x7d, 0x4e]
const CREAM = [0xf7, 0xf3, 0xea]
const GOLD = [0xf2, 0xc1, 0x4e]
// 單位座標（0..1）的形狀；回傳這一點的顏色
const ellipse = (x, y, cx, cy, rx, ry, rot) => {
  const dx = x - cx
  const dy = y - cy
  const u = dx * Math.cos(rot) + dy * Math.sin(rot)
  const v = -dx * Math.sin(rot) + dy * Math.cos(rot)
  return (u / rx) ** 2 + (v / ry) ** 2 <= 1
}
const colorAt = (x, y) => {
  if (Math.hypot(x - 0.5, y - 0.5) > 0.3) return GREEN
  if (Math.hypot(x - 0.5, y - 0.355) < 0.032) return GOLD
  if (x > 0.488 && x < 0.512 && y > 0.47 && y < 0.67) return GREEN
  if (ellipse(x, y, 0.425, 0.455, 0.085, 0.04, 0.5) || ellipse(x, y, 0.575, 0.455, 0.085, 0.04, -0.5)) return GREEN
  return CREAM
}
const renderIcon = (size) => {
  const rgb = Buffer.alloc(size * size * 3)
  const n = 3 // 3x3 超取樣，邊緣不鋸齒
  for (let py = 0; py < size; py++)
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0]
      for (let sy = 0; sy < n; sy++)
        for (let sx = 0; sx < n; sx++) {
          const c = colorAt((px + (sx + 0.5) / n) / size, (py + (sy + 0.5) / n) / size)
          acc[0] += c[0]
          acc[1] += c[1]
          acc[2] += c[2]
        }
      for (let k = 0; k < 3; k++) rgb[(py * size + px) * 3 + k] = Math.round(acc[k] / (n * n))
    }
  return encodePng(size, rgb)
}
const pwaDir = join(root, 'public/assets/pwa')
mkdirSync(pwaDir, { recursive: true })
for (const i of icons) writeFileSync(join(pwaDir, i.file), renderIcon(i.size))

const md = `# UI 美術素材清單（交給 UX/UI）

> 由 \`node scripts/make_placeholders.mjs\` 依 \`src/assets.ts\` 產生，請勿手改。
> 目前畫面上的都是佔位檔（\`public/assets/ph/<id>.svg\`）。交件時用同名檔案取代；
> 若改成 .webp / .png，請同步改 \`src/assets.ts\` 的 \`assetUrl\`。

風格：2.5D 斜俯視、蠟筆手繪繪本風（簡報 v15）。語氣是慢下來、無壓陪伴。

| ID | 尺寸（px，@1x） | 用在 | 說明 |
|---|---|---|---|
${assets.map((a) => `| \`${a.id}\` | ${a.w}×${a.h} | ${a.where} | ${a.brief} |`).join('\n')}

共 ${assets.length} 項。建議另交 @2x。

## PWA 圖示（加到手機主畫面）

佔位檔是 PNG（\`public/assets/pwa/<file>\`，由同一支腳本產生）；交件時用同名檔案取代。\`public/manifest.webmanifest\` 與 \`index.html\` 的 \`apple-touch-icon\` 指向這些檔案。

| 檔名 | 尺寸（px） | 說明 |
|---|---|---|
${icons.map((i) => `| \`${i.file}\` | ${i.size}×${i.size} | ${i.brief} |`).join('\n')}

`
writeFileSync(join(root, 'docs/ui-assets.md'), md)
console.log(`${assets.length} placeholders → public/assets/ph, ${icons.length} PWA icons → public/assets/pwa, docs/ui-assets.md`)
