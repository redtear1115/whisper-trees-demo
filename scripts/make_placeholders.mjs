// 依 src/assets.ts 的清單產生佔位 SVG（public/assets/ph/）與給設計的清單 docs/ui-assets.md。
// Run: node scripts/make_placeholders.mjs
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
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

// 動物的占位（行動圈圖示已改成程式內的線條圖示 src/components/icons.tsx，不再有 action-* 佔位檔）。
// 五隻動物沒有任何一個 emoji 是對的（穿山甲被當成刺蝟、石虎不是家貓、黑冠麻鷺不是黑鳥），所以不用 emoji。
// 五隻動物各自一枚圓形徽章：
// 柔和的底色加一個字（狗、石、鵲、鷺、甲），在美術交件前就分得出是哪一隻。底色刻意避開綠色（地圖上的樹是綠點）。
// 底色與字色的對比 ≥ 6.5:1（WCAG AA 需要 4.5:1）
const ANIMAL_BADGE = {
  'avatar-taiwan-dog': { char: '狗', bg: '#F7DDA6', fg: '#5A3A00' },
  'avatar-leopard-cat': { char: '石', bg: '#F6CFC0', fg: '#6B2A14' },
  'avatar-blue-magpie': { char: '鵲', bg: '#C9DDF4', fg: '#1D3F6A' },
  'avatar-malayan-night-heron': { char: '鷺', bg: '#DDD3F0', fg: '#43306E' },
  'avatar-pangolin': { char: '甲', bg: '#E8D5BD', fg: '#4A2F14' },
}
const ANIMAL_NAME = {
  'avatar-taiwan-dog': '臺灣黑狗',
  'avatar-leopard-cat': '石虎',
  'avatar-blue-magpie': '臺灣藍鵲',
  'avatar-malayan-night-heron': '黑冠麻鷺',
  'avatar-pangolin': '穿山甲',
}

// 中性的葉子剪影（單位座標 0..96，置中），沒有 emoji 的占位用
const leaf = (cx, cy, size, h) => {
  const k = size / 96
  return `<g transform="translate(${cx - 48 * k} ${cy - 48 * k}) scale(${k})" fill="hsl(${h} 35% 82%)" stroke="hsl(${h} 30% 36%)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M48 8C74 22 80 54 48 88C16 54 22 22 48 8Z"/><path d="M48 24V80" fill="none"/></g>`
}
// 動物的占位：圓形徽章（底色＋深色細框＋一個字）。圖高 96，圓置中偏上，底下留一行給 ?debug=1 的標示
const badge = (cx, cy, r, { char, bg, fg }) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${bg}" stroke="${fg}" stroke-opacity="0.55" stroke-width="3"/>\n<text x="${cx}" y="${cy + r * 0.36}" text-anchor="middle" font-family="'PingFang TC','Noto Sans TC','Microsoft JhengHei',sans-serif" font-weight="700" font-size="${Math.round(r * 1.05)}" fill="${fg}">${char}</text>`
// 小芽的剪影：一根莖、兩片葉子
const sprout = (cx, cy, size, h) => {
  const k = size / 96
  return `<g transform="translate(${cx - 48 * k} ${cy - 48 * k}) scale(${k})" fill="hsl(${h} 35% 82%)" stroke="hsl(${h} 30% 36%)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M48 88V44" fill="none"/><path d="M48 50C48 30 32 20 14 22C14 42 28 54 48 50Z"/><path d="M48 44C48 26 62 14 82 16C82 36 68 48 48 44Z"/></g>`
}

// 樹的剪影（地圖拉近時的樹、拉近畫面的大樹）：圓底座、樹幹、三團樹冠。地圖上一次畫上百棵，
// 用虛線框的通用佔位會整片都是框，所以這三張畫成簡單的樹。圈內（可以摸）亮綠，圈外灰藍綠。
const TREE_SHAPE = {
  'map-tree-near': { crown: '#5DAA67', light: '#8BCB8F', base: '#CFE8C9' },
  'map-tree-far': { crown: '#7FA3A6', light: '#A9C4C5', base: '#CFE8C9' },
  'tree-focus': { crown: '#3F9150', light: '#7CC48A', base: '#D7EBCF' },
}
const treeShape = (w, h, { crown, light, base }) => {
  const cx = w / 2
  const r = w * 0.27
  return [
    `<ellipse cx="${cx}" cy="${h * 0.9}" rx="${w * 0.36}" ry="${h * 0.07}" fill="${base}" stroke="#7FA86F" stroke-width="${Math.max(1, w / 64)}"/>`,
    `<path d="M${cx - w * 0.06} ${h * 0.9} L${cx - w * 0.04} ${h * 0.55} L${cx + w * 0.04} ${h * 0.55} L${cx + w * 0.06} ${h * 0.9} Z" fill="#9A6B3F"/>`,
    `<circle cx="${cx - r * 0.75}" cy="${h * 0.45}" r="${r}" fill="${crown}"/>`,
    `<circle cx="${cx + r * 0.75}" cy="${h * 0.45}" r="${r}" fill="${crown}"/>`,
    `<circle cx="${cx}" cy="${h * 0.3}" r="${r * 1.1}" fill="${crown}"/>`,
    `<circle cx="${cx - r * 0.35}" cy="${h * 0.25}" r="${r * 0.45}" fill="${light}" opacity="0.7"/>`,
  ].join('\n')
}

// 今天互動過的樹腳邊的小花（地圖拉近時疊在樹的圖示上，同樣大小、同樣底部對齊）：底座左右兩叢，五瓣花加葉子。
const FLOWERS = [
  { x: 0.17, y: 0.9, r: 0.105, petal: '#F6A5B8' },
  { x: 0.33, y: 0.99, r: 0.085, petal: '#FFD66B' },
  { x: 0.7, y: 0.97, r: 0.105, petal: '#C9A7EB' },
  { x: 0.86, y: 0.87, r: 0.085, petal: '#F6A5B8' },
]
const flowers = (w, h) =>
  FLOWERS.map(({ x, y, r, petal }) => {
    const cx = w * x
    const cy = h * y - w * r
    const pr = w * r * 0.55
    const leaf = `<ellipse cx="${cx + pr}" cy="${cy + pr * 1.6}" rx="${pr * 0.9}" ry="${pr * 0.45}" fill="#6FB46F" transform="rotate(-30 ${cx + pr} ${cy + pr * 1.6})"/>`
    const petals = [0, 72, 144, 216, 288]
      .map((deg) => {
        const a = (deg * Math.PI) / 180
        return `<circle cx="${(cx + Math.sin(a) * pr).toFixed(2)}" cy="${(cy - Math.cos(a) * pr).toFixed(2)}" r="${pr.toFixed(2)}" fill="${petal}" stroke="#fff" stroke-width="0.6"/>`
      })
      .join('')
    return `${leaf}${petals}<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(pr * 0.7).toFixed(2)}" fill="#F2B33D"/>`
  }).join('\n')

// 兩種版本：public/assets/ph/<id>.svg 是公民看得到的（沒有任何標示文字）；public/assets/ph-debug/<id>.svg 多一行
// 「id 佔位」「尺寸 佔位」給設計與開發對照，只在網址帶 ?debug=1 時才載入（src/lib/debug.ts）。
const outDir = join(root, 'public/assets/ph')
const debugDir = join(root, 'public/assets/ph-debug')
mkdirSync(outDir, { recursive: true })
mkdirSync(debugDir, { recursive: true })
// 已交件的素材（ph/ 裡不是這支腳本產生的檔案，例如設計交的動物美術）不覆蓋：只認這支腳本寫出的開頭
const placeholderHead = (a) => `<svg xmlns="http://www.w3.org/2000/svg" width="${a.w}" height="${a.h}" viewBox="0 0 ${a.w} ${a.h}">\n`
const delivered = new Set(
  assets
    .filter((a) => {
      try {
        return !readFileSync(join(outDir, `${a.id}.svg`), 'utf8').startsWith(placeholderHead(a))
      } catch {
        return false
      }
    })
    .map((a) => a.id),
)
for (const a of assets) {
  // 已交件的除錯版直接用正式美術，免得 ?debug=1 還看到佔位
  if (delivered.has(a.id)) {
    copyFileSync(join(outDir, `${a.id}.svg`), join(debugDir, `${a.id}.svg`))
    continue
  }
  const small = Math.min(a.w, a.h) <= 120
  const fs = Math.max(8, Math.min(small ? Math.round(a.w / 7) : 18, Math.floor((a.w * 1.6) / a.id.length)))
  const h = hue(a.id)
  const animal = ANIMAL_NAME[a.id]
  const isSprout = a.id.startsWith('sprout-')
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${a.w}" height="${a.h}" viewBox="0 0 ${a.w} ${a.h}">`
  const cap = (y, size, text, fill) => `<text x="50%" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size}" fill="${fill}">${esc(text)}</text>\n`
  let body // 公民版
  let debug // 除錯版多出來的字
  if (TREE_SHAPE[a.id]) {
    body = `${treeShape(a.w, a.h, TREE_SHAPE[a.id])}\n`
    debug = cap(a.h - 2, Math.max(7, Math.round(a.w / 18)), `${a.id} 佔位`, `hsl(${h} 30% 30%)`)
  } else if (a.id === 'map-met-flowers') {
    body = `${flowers(a.w, a.h)}\n`
    debug = cap(a.h * 0.5, Math.max(7, Math.round(a.w / 18)), `${a.id} 佔位`, `hsl(${h} 30% 30%)`)
  } else if (animal) {
    body = `${badge(a.w / 2, a.h / 2 - 2, a.h * 0.43, ANIMAL_BADGE[a.id])}\n`
    debug = cap(a.h - 1, 7, `${a.id} ${animal} 佔位`, `hsl(${h} 30% 30%)`)
  } else if (isSprout) {
    // 小芽：只有剪影，沒有框，視覺重量跟旁邊的動物差不多
    body = `${sprout(a.w / 2, a.h / 2, a.h * 0.62, 135)}\n`
    debug = cap(a.h - 6, 12, `${a.id} ${a.w}×${a.h} 佔位`, `hsl(${h} 30% 30%)`)
  } else {
    body = `<rect x="1" y="1" width="${a.w - 2}" height="${a.h - 2}" rx="${small ? 14 : 12}" fill="hsl(${h} 45% 90%)" stroke="hsl(${h} 35% 55%)" stroke-width="2" stroke-dasharray="6 4"/>\n${leaf(a.w / 2, a.h / 2, Math.min(a.w, a.h) * 0.34, h)}\n`
    debug = `${cap(small ? '50%' : '46%', fs, a.id, `hsl(${h} 30% 30%)`).replace('<text ', '<text dominant-baseline="middle" ')}${small ? '' : cap('58%', 13, `${a.w}×${a.h} 佔位`, `hsl(${h} 20% 40%)`)}`
  }
  writeFileSync(join(outDir, `${a.id}.svg`), `${head}\n${body}</svg>\n`)
  writeFileSync(join(debugDir, `${a.id}.svg`), `${head}\n${body}${debug}</svg>\n`)
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

風格：2.5D 斜俯視、蠟筆手繪繪本風。語氣是慢下來、無壓陪伴。

## 交件方式

- 目前畫面上的都是佔位檔，位置是 \`public/assets/ph/<id>.svg\`（公民看到的版本，沒有標示文字）。網址帶 \`?debug=1\` 時改載入 \`public/assets/ph-debug/<id>.svg\`（多一行「id 佔位」「尺寸 佔位」，給設計與開發對照）；交件時只要覆蓋 \`ph/\` 的檔案，\`ph-debug/\` 可以不管。
- 交件時用**同名檔案**覆蓋同一個位置即可，程式不用改。重跑這支腳本不會蓋掉已交件的檔案（不是腳本產生的就跳過），清單上標「（已交件）」。
- 若改成 .webp／.png，副檔名不同，要同步改 \`src/assets.ts\` 的 \`assetUrl\`（全部素材要用同一種格式）。
- 尺寸是畫面上的 @1x 大小；請另交 @2x（寬高各乘 2），透明背景的素材請保留透明。

## 素材

| ID | 尺寸 @1x | @2x | 放置位置 | 用在哪個畫面 | 程式參照 | 說明 |
|---|---|---|---|---|---|---|
${assets.map((a) => `| \`${a.id}\`${delivered.has(a.id) ? '（已交件）' : ''} | ${a.w}×${a.h} | ${a.w * 2}×${a.h * 2} | \`public/assets/ph/${a.id}.svg\` | ${a.where} | ${refCell(a.id)} | ${a.brief} |`).join('\n')}

共 ${assets.length} 項。

## PWA 圖示（加到手機主畫面）

佔位檔是 PNG（\`public/assets/pwa/<file>\`，由同一支腳本產生）；交件時用同名檔案替換。\`public/manifest.webmanifest\` 與 \`index.html\` 的 \`apple-touch-icon\` 指向這些檔案。

| 檔名 | 尺寸（px） | 放置位置 | 說明 |
|---|---|---|---|
${icons.map((i) => `| \`${i.file}\` | ${i.size}×${i.size} | \`public/assets/pwa/${i.file}\` | ${i.brief} |`).join('\n')}

## 其他圖片（不是佔位檔）

${others.length ? `| 檔案位置 | 程式參照 |\n|---|---|\n${others.map((o) => `| \`public/${o.path}\` | ${o.refs.map((r) => `\`${r}\``).join('<br>') || '（尚未使用）'} |`).join('\n')}` : '（無）'}
`
writeFileSync(join(root, 'docs/ui-assets.md'), md)
console.log(`${assets.length} placeholders → public/assets/ph (+ ph-debug), ${icons.length} PWA icons → public/assets/pwa, docs/ui-assets.md`)
