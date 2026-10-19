// 依 src/assets.ts 的清單產生佔位 SVG（public/assets/ph/）與給設計的清單 docs/ui-assets.md。
// Run: node scripts/make_placeholders.mjs
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join, relative } from 'node:path'
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

// 地圖人物與行動圈圖示：佔位檔多放一個 emoji 讓畫面看得出是什麼（正式美術取代後就不需要了）
const GLYPH = {
  'avatar-blue-magpie': '🐦',
  'avatar-night-heron': '🐦‍⬛',
  'avatar-squirrel': '🐿️',
  'avatar-pangolin': '🦔',
  'action-scan': '📷',
  'action-whisper': '💬',
  'action-info': '🌳',
  'action-report': '✂️',
}

const outDir = join(root, 'public/assets/ph')
mkdirSync(outDir, { recursive: true })
for (const a of assets) {
  const small = Math.min(a.w, a.h) <= 120
  const fs = Math.max(8, Math.min(small ? Math.round(a.w / 7) : 18, Math.floor((a.w * 1.6) / a.id.length)))
  const glyph = GLYPH[a.id]
  const svg = glyph
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${a.w}" height="${a.h}" viewBox="0 0 ${a.w} ${a.h}">
<text x="50%" y="${Math.round(a.h * 0.62)}" text-anchor="middle" font-size="${Math.round(a.h * 0.62)}">${glyph}</text>
<text x="50%" y="${a.h - 3}" text-anchor="middle" font-family="sans-serif" font-size="7" fill="hsl(${hue(a.id)} 30% 30%)">${esc(a.id)} 佔位</text>
</svg>
`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${a.w}" height="${a.h}" viewBox="0 0 ${a.w} ${a.h}">
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

// ---- 掃 src/ 找出每個素材在程式裡的參照位置（檔案:行號），寫進清單 ----
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p)
    return /\.(tsx?|css)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : []
  })
const sources = walk(join(root, 'src'))
  .filter((p) => !p.endsWith(join('src', 'assets.ts')))
  .map((p) => ({ rel: relative(root, p), lines: readFileSync(p, 'utf8').split('\n') }))
const refs = new Map(assets.map((a) => [a.id, []]))
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
for (const { rel, lines } of sources) {
  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`
    for (const a of assets) {
      // 只認用到素材的寫法：<Art id="…">、art: '…'、assetUrl('…')、直接寫路徑 assets/ph/….svg
      const q = `['"\`]${reEsc(a.id)}['"\`]`
      if (new RegExp(`<Art\\b[^>]*${q}|\\bart:\\s*${q}|assetUrl\\(${q}|assets/ph/${reEsc(a.id)}\\.`).test(line)) refs.get(a.id).push(at)
    }
    // 動態組出的 ID，例如 \`badge-\${b.id}\`：算到所有同字首的素材
    for (const m of line.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)*-)\$\{/g)) {
      for (const a of assets) if (a.id.startsWith(m[1])) refs.get(a.id).push(`${at}（動態）`)
    }
  })
}
const refCell = (id) => refs.get(id).map((r) => `\`${r}\``).join('<br>') || '（尚未使用）'

// public/assets 下，不是佔位檔、也不是 PWA 圖示的其他圖片
const others = readdirSync(join(root, 'public/assets'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && !['ph', 'pwa'].includes(e.name))
  .flatMap((d) => readdirSync(join(root, 'public/assets', d.name)).map((f) => `assets/${d.name}/${f}`))
  .map((path) => ({
    path,
    refs: sources.flatMap(({ rel, lines }) => lines.flatMap((l, i) => (l.includes(path) ? [`${rel}:${i + 1}`] : []))),
  }))

const md = `# UI 美術素材清單（交給 UX/UI）

> 由 \`node scripts/make_placeholders.mjs\` 依 \`src/assets.ts\` 產生，請勿手改。
> 新增素材：在 \`src/assets.ts\` 加一筆，跑上面的指令，畫面用 \`<Art id="…">\`。「程式參照」欄是掃描 \`src/\` 自動找出的。

風格：2.5D 斜俯視、蠟筆手繪繪本風（簡報 v15）。語氣是慢下來、無壓陪伴。

## 交件方式

- 目前畫面上的都是佔位檔，位置是 \`public/assets/ph/<id>.svg\`。
- 交件時用**同名檔案**覆蓋同一個位置即可，程式不用改。
- 若改成 .webp／.png，副檔名不同，要同步改 \`src/assets.ts\` 的 \`assetUrl\`（全部素材要用同一種格式）。
- 尺寸是畫面上的 @1x 大小；請另交 @2x（寬高各乘 2），透明背景的素材請保留透明。

## 素材

| ID | 尺寸 @1x | @2x | 放置位置 | 用在哪個畫面 | 程式參照 | 說明 |
|---|---|---|---|---|---|---|
${assets.map((a) => `| \`${a.id}\` | ${a.w}×${a.h} | ${a.w * 2}×${a.h * 2} | \`public/assets/ph/${a.id}.svg\` | ${a.where} | ${refCell(a.id)} | ${a.brief} |`).join('\n')}

共 ${assets.length} 項。

## PWA 圖示（加到手機主畫面）

佔位檔是 PNG（\`public/assets/pwa/<file>\`，由同一支腳本產生）；交件時用同名檔案取代。\`public/manifest.webmanifest\` 與 \`index.html\` 的 \`apple-touch-icon\` 指向這些檔案。

| 檔名 | 尺寸（px） | 放置位置 | 說明 |
|---|---|---|---|
${icons.map((i) => `| \`${i.file}\` | ${i.size}×${i.size} | \`public/assets/pwa/${i.file}\` | ${i.brief} |`).join('\n')}

## 其他圖片（不是佔位檔）

${others.length ? `| 檔案位置 | 程式參照 |\n|---|---|\n${others.map((o) => `| \`public/${o.path}\` | ${o.refs.map((r) => `\`${r}\``).join('<br>') || '（尚未使用）'} |`).join('\n')}` : '（無）'}
`
writeFileSync(join(root, 'docs/ui-assets.md'), md)
console.log(`${assets.length} placeholders → public/assets/ph, ${icons.length} PWA icons → public/assets/pwa, docs/ui-assets.md`)
