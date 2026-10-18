// 依 src/assets.ts 的清單產生佔位 SVG（public/assets/ph/）與給設計的清單 docs/ui-assets.md。
// Run: node scripts/make_placeholders.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(root, 'src/assets.ts'), 'utf8')
const assets = [...src.matchAll(/\{ id: '([^']+)', w: (\d+), h: (\d+), where: '([^']+)', brief: '([^']+)' \}/g)].map(
  ([, id, w, h, where, brief]) => ({ id, w: +w, h: +h, where, brief }),
)

const hue = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const outDir = join(root, 'public/assets/ph')
mkdirSync(outDir, { recursive: true })
for (const a of assets) {
  const small = Math.min(a.w, a.h) < 120
  const fs = small ? Math.max(9, Math.round(a.w / 7)) : 18
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${a.w}" height="${a.h}" viewBox="0 0 ${a.w} ${a.h}">
<rect x="1" y="1" width="${a.w - 2}" height="${a.h - 2}" rx="${small ? 14 : 12}" fill="hsl(${hue(a.id)} 45% 90%)" stroke="hsl(${hue(a.id)} 35% 55%)" stroke-width="2" stroke-dasharray="6 4"/>
<text x="50%" y="${small ? '50%' : '46%'}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="${fs}" fill="hsl(${hue(a.id)} 30% 30%)">${esc(a.id)}</text>
${small ? '' : `<text x="50%" y="58%" text-anchor="middle" font-family="sans-serif" font-size="13" fill="hsl(${hue(a.id)} 20% 40%)">${a.w}×${a.h} 佔位</text>`}
</svg>
`
  writeFileSync(join(outDir, `${a.id}.svg`), svg)
}

const md = `# UI 美術素材清單（交給 UX/UI）

> 由 \`node scripts/make_placeholders.mjs\` 依 \`src/assets.ts\` 產生，請勿手改。
> 目前畫面上的都是佔位檔（\`public/assets/ph/<id>.svg\`）。交件時用同名檔案取代；
> 若改成 .webp / .png，請同步改 \`src/assets.ts\` 的 \`assetUrl\`。

風格：2.5D 斜俯視、蠟筆手繪繪本風（簡報 v15）。語氣是慢下來、無壓陪伴。

| ID | 尺寸（px，@1x） | 用在 | 說明 |
|---|---|---|---|
${assets.map((a) => `| \`${a.id}\` | ${a.w}×${a.h} | ${a.where} | ${a.brief} |`).join('\n')}

共 ${assets.length} 項。建議另交 @2x。
`
writeFileSync(join(root, 'docs/ui-assets.md'), md)
console.log(`${assets.length} placeholders → public/assets/ph, docs/ui-assets.md`)
