# UI 美術素材清單（交給 UX/UI）

> 由 `node scripts/make_placeholders.mjs` 依 `src/assets.ts` 產生，請勿手改。
> 新增素材：在 `src/assets.ts` 加一筆，跑上面的指令，畫面用 `<Art id="…">`。「程式參照」欄是掃描 `src/` 自動找出的。

風格：2.5D 斜俯視、蠟筆手繪繪本風（簡報 v15）。語氣是慢下來、無壓陪伴。

## 交件方式

- 目前畫面上的都是佔位檔，位置是 `public/assets/ph/<id>.svg`。
- 交件時用**同名檔案**覆蓋同一個位置即可，程式不用改。
- 若改成 .webp／.png，副檔名不同，要同步改 `src/assets.ts` 的 `assetUrl`（全部素材要用同一種格式）。
- 尺寸是畫面上的 @1x 大小；請另交 @2x（寬高各乘 2），透明背景的素材請保留透明。

## 素材

| ID | 尺寸 @1x | @2x | 放置位置 | 用在哪個畫面 | 程式參照 | 說明 |
|---|---|---|---|---|---|---|
| `logo` | 160×48 | 320×96 | `public/assets/ph/logo.svg` | 頁首 | （尚未使用） | 曦語 Whisper Trees 字標，蠟筆手繪感 |
| `tree-hero` | 720×400 | 1440×800 | `public/assets/ph/tree-hero.svg` | 樹的頁面頂部 | `src/pages/TreePage.tsx:71` | 2.5D 斜俯視的一棵行道樹與人行道，繪本風；日間版 |
| `tree-hero-night` | 720×400 | 1440×800 | `public/assets/ph/tree-hero-night.svg` | 樹的頁面頂部（夜間） | `src/pages/TreePage.tsx:71` | 同上夜間版，「樹木休息中」的氣氛 |
| `glow` | 96×96 | 192×192 | `public/assets/ph/glow.svg` | 微光、光點 | `src/pages/MePage.tsx:48`<br>`src/pages/ShopPage.tsx:47`<br>`src/pages/TreePage.tsx:79` | 一道微光／光點的圖示，柔和發光 |
| `capsule` | 96×96 | 192×192 | `public/assets/ph/capsule.svg` | 時空膠囊卡片 | `src/pages/TreePage.tsx:89`<br>`src/pages/TreePage.tsx:113` | 時空膠囊（信封或種子膠囊） |
| `sapling` | 96×96 | 192×192 | `public/assets/ph/sapling.svg` | 許願、地圖許願圖層 | `src/features/wish/WishForm.tsx:77`<br>`src/index.css:510`<br>`src/pages/MapPage.tsx:497` | 小樹苗；地圖上依澆水數放大 |
| `watering` | 96×96 | 192×192 | `public/assets/ph/watering.svg` | 澆水按鈕 | `src/features/wish/WishCard.tsx:40` | 澆水壺 |
| `empty-pit` | 96×96 | 192×192 | `public/assets/ph/empty-pit.svg` | 空樹穴抽屜 | `src/pages/MapPage.tsx:600` | 空的樹穴（方形土坑） |
| `scan-tag` | 240×160 | 480×320 | `public/assets/ph/scan-tag.svg` | 掃樹牌說明 | （尚未使用） | 公園處樹牌與 QR Code 的位置示意 |
| `sprout-0` | 240×240 | 480×480 | `public/assets/ph/sprout-0.svg` | 我的小芽 | `src/features/game/character.ts:11` | 角色「小芽」第 1 階：種子 |
| `sprout-1` | 240×240 | 480×480 | `public/assets/ph/sprout-1.svg` | 我的小芽 | `src/features/game/character.ts:12` | 角色「小芽」第 2 階：發芽 |
| `sprout-2` | 240×240 | 480×480 | `public/assets/ph/sprout-2.svg` | 我的小芽 | `src/features/game/character.ts:13` | 角色「小芽」第 3 階：小樹苗 |
| `sprout-3` | 240×240 | 480×480 | `public/assets/ph/sprout-3.svg` | 我的小芽 | `src/features/game/character.ts:14` | 角色「小芽」第 4 階：小樹 |
| `sprout-4` | 240×240 | 480×480 | `public/assets/ph/sprout-4.svg` | 我的小芽 | `src/features/game/character.ts:15` | 角色「小芽」第 5 階：大樹 |
| `item-hat-straw` | 160×160 | 320×320 | `public/assets/ph/item-hat-straw.svg` | 商店、小芽換裝 | `src/features/game/config.ts:46`<br>`src/features/onboarding/OnboardingEffects.tsx:62`<br>`src/features/onboarding/TourSheet.tsx:139` | 造型：草帽（疊在角色上，透明背景） |
| `item-scarf-leaf` | 160×160 | 320×320 | `public/assets/ph/item-scarf-leaf.svg` | 商店、小芽換裝 | `src/features/game/config.ts:47` | 造型：落葉圍巾（疊在角色上，透明背景） |
| `item-lantern` | 160×160 | 320×320 | `public/assets/ph/item-lantern.svg` | 商店、小芽換裝 | `src/features/game/config.ts:48` | 造型：螢火提燈（疊在角色上，透明背景） |
| `item-frame-spring` | 160×160 | 320×320 | `public/assets/ph/item-frame-spring.svg` | 商店 | `src/features/game/config.ts:49` | 樹的頁面相框：春櫻（商品縮圖；實際相框另需 720×400 外框） |
| `item-frame-autumn` | 160×160 | 320×320 | `public/assets/ph/item-frame-autumn.svg` | 商店 | `src/features/game/config.ts:50` | 樹的頁面相框：秋楓（同上） |
| `item-fund` | 160×160 | 320×320 | `public/assets/ph/item-fund.svg` | 商店 | `src/features/game/config.ts:51` | 回到城市：捐給補種基金 |
| `item-water-bag` | 160×160 | 320×320 | `public/assets/ph/item-water-bag.svg` | 商店 | `src/features/game/config.ts:52` | 回到城市：認養新植樹苗的澆水袋 |
| `species-card` | 160×160 | 320×320 | `public/assets/ph/species-card.svg` | 圖鑑 | `src/features/codex/CodexSection.tsx:70` | 樹種卡通用底圖；正式版每個樹種一張（先做前 40 名，清單見 public/data/species.json） |
| `badge-first` | 120×120 | 240×240 | `public/assets/ph/badge-first.svg` | 成長徽章 | `src/features/game/badges.ts:38（動態）` | 第一次相遇 |
| `badge-species-3` | 120×120 | 240×240 | `public/assets/ph/badge-species-3.svg` | 成長徽章 | `src/features/game/badges.ts:38（動態）` | 認識三種樹 |
| `badge-species-10` | 120×120 | 240×240 | `public/assets/ph/badge-species-10.svg` | 成長徽章 | `src/features/game/badges.ts:38（動態）` | 樹的朋友（10 種） |
| `badge-far-view` | 120×120 | 240×240 | `public/assets/ph/badge-far-view.svg` | 成長徽章 | `src/features/game/badges.ts:38（動態）` | 遠遠看著你（安全島樹） |
| `badge-capsule` | 120×120 | 240×240 | `public/assets/ph/badge-capsule.svg` | 成長徽章 | `src/features/game/badges.ts:38（動態）` | 時空膠囊（回到同一棵樹） |
| `badge-wisher` | 120×120 | 240×240 | `public/assets/ph/badge-wisher.svg` | 成長徽章 | `src/features/game/badges.ts:38（動態）` | 種下一個願望 |
| `badge-waterer` | 120×120 | 240×240 | `public/assets/ph/badge-waterer.svg` | 成長徽章 | `src/features/game/badges.ts:38（動態）` | 澆水十次 |
| `badge-night` | 120×120 | 240×240 | `public/assets/ph/badge-night.svg` | 成長徽章 | `src/features/game/badges.ts:38（動態）` | 夜行者（夜間打卡） |
| `badge-reporter` | 120×120 | 240×240 | `public/assets/ph/badge-reporter.svg` | 成長徽章 | `src/features/game/badges.ts:38（動態）` | 樹的守望者（樹況回報） |
| `badge-first-light` | 120×120 | 240×240 | `public/assets/ph/badge-first-light.svg` | 成長徽章 | `src/features/game/badges.ts:38（動態）` | 第一道光（第一次收集光點） |
| `badge-home-screen` | 120×120 | 240×240 | `public/assets/ph/badge-home-screen.svg` | 成長徽章 | `src/features/game/badges.ts:38（動態）` | 回家的路（從手機桌面圖示打開） |
| `badge-newcomer` | 120×120 | 240×240 | `public/assets/ph/badge-newcomer.svg` | 成長徽章 | `src/features/game/badges.ts:38（動態）` | 城市的新朋友（完成新手任務） |
| `stamp-iron` | 120×120 | 240×240 | `public/assets/ph/stamp-iron.svg` | 集章冊 | `src/features/game/districts.ts:52`<br>`src/pages/StampsPage.tsx:112` | 行政區集章：鐵章（打卡 1 棵不同的樹）。圓形印章，中間留空放行政區名 |
| `stamp-bronze` | 120×120 | 240×240 | `public/assets/ph/stamp-bronze.svg` | 集章冊 | `src/features/game/districts.ts:53` | 行政區集章：銅章（10 棵）。同一組造型，材質不同 |
| `stamp-silver` | 120×120 | 240×240 | `public/assets/ph/stamp-silver.svg` | 集章冊 | `src/features/game/districts.ts:54` | 行政區集章：銀章（50 棵） |
| `stamp-gold` | 120×120 | 240×240 | `public/assets/ph/stamp-gold.svg` | 集章冊 | `src/features/game/districts.ts:55` | 行政區集章：金章（200 棵） |

共 38 項。

## PWA 圖示（加到手機主畫面）

佔位檔是 PNG（`public/assets/pwa/<file>`，由同一支腳本產生）；交件時用同名檔案取代。`public/manifest.webmanifest` 與 `index.html` 的 `apple-touch-icon` 指向這些檔案。

| 檔名 | 尺寸（px） | 放置位置 | 說明 |
|---|---|---|---|
| `icon-192.png` | 192×192 | `public/assets/pwa/icon-192.png` | Android 主畫面與 manifest 圖示。滿版底色，主體放在中間 80%（也當遮罩圖示用） |
| `icon-512.png` | 512×512 | `public/assets/pwa/icon-512.png` | manifest 大圖示、啟動畫面。規格同上 |
| `apple-touch-icon.png` | 180×180 | `public/assets/pwa/apple-touch-icon.png` | iOS 加入主畫面的圖示。不透明、不要自己切圓角（系統會切） |

## 其他圖片（不是佔位檔）

| 檔案位置 | 程式參照 |
|---|---|
| `public/assets/photo/tree-tag.jpg` | `src/features/checkin/Scanner.tsx:78` |
