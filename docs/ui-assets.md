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
| `tree-hero` | 720×400 | 1440×800 | `public/assets/ph/tree-hero.svg` | 樹的頁面頂部 | `src/pages/TreePage.tsx:99` | 2.5D 斜俯視的一棵行道樹與人行道，繪本風；日間版 |
| `tree-hero-night` | 720×400 | 1440×800 | `public/assets/ph/tree-hero-night.svg` | 樹的頁面頂部（夜間） | `src/pages/TreePage.tsx:99` | 同上夜間版，「樹木休息中」的氣氛 |
| `glow` | 96×96 | 192×192 | `public/assets/ph/glow.svg` | 微光、光點 | `src/pages/ShopPage.tsx:46`<br>`src/pages/TreePage.tsx:114` | 一道微光／光點的圖示，柔和發光 |
| `capsule` | 96×96 | 192×192 | `public/assets/ph/capsule.svg` | 時空膠囊卡片 | `src/pages/TreePage.tsx:124`<br>`src/pages/TreePage.tsx:150` | 時空膠囊（信封或種子膠囊） |
| `sapling` | 96×96 | 192×192 | `public/assets/ph/sapling.svg` | 許願、地圖許願圖層 | `src/features/wish/WishForm.tsx:77`<br>`src/index.css:505`<br>`src/pages/MapPage.tsx:818` | 小樹苗；地圖上依澆水數放大 |
| `watering` | 96×96 | 192×192 | `public/assets/ph/watering.svg` | 澆水按鈕 | `src/features/wish/WishCard.tsx:40` | 澆水壺 |
| `empty-pit` | 96×96 | 192×192 | `public/assets/ph/empty-pit.svg` | 空樹穴抽屜 | `src/pages/MapPage.tsx:912` | 空的樹穴（方形土坑） |
| `scan-tag` | 240×160 | 480×320 | `public/assets/ph/scan-tag.svg` | 掃樹牌說明 | （尚未使用） | 公園處樹牌與 QR Code 的位置示意 |
| `sprout-0` | 240×240 | 480×480 | `public/assets/ph/sprout-0.svg` | 我的小芽 | `src/features/game/character.ts:12` | 角色「小芽」＝樹精（團隊簡報 v20 p14），第 1 階：初心樹精。2.5D 蠟筆繪本風，剛醒來、圓圓小小、頭上一片新芽、眼神好奇，透明背景 |
| `sprout-1` | 240×240 | 480×480 | `public/assets/ph/sprout-1.svg` | 我的小芽 | `src/features/game/character.ts:13` | 角色「小芽」第 2 階：茁壯樹精。同一個角色長大了，身形變穩、枝葉變多，樹皮紋路出現（規格同上） |
| `sprout-2` | 240×240 | 480×480 | `public/assets/ph/sprout-2.svg` | 我的小芽 | `src/features/game/character.ts:14` | 角色「小芽」第 3 階：智慧老樹精。同一個角色的老年樣子，樹冠茂密、鬍鬚般的垂枝與苔蘚，神情溫和（規格同上） |
| `item-hat-acorn` | 160×160 | 320×320 | `public/assets/ph/item-hat-acorn.svg` | 商店、小芽換裝、新手禮 | `src/features/game/config.ts:75`<br>`src/features/onboarding/OnboardingEffects.tsx:62`<br>`src/features/onboarding/TourSheet.tsx:182` | 造型：橡實帽（疊在五隻動物與小芽身上，透明背景）。新手禮 |
| `item-crown-feather` | 160×160 | 320×320 | `public/assets/ph/item-crown-feather.svg` | 商店、小芽換裝 | `src/features/game/config.ts:76` | 造型：花冠羽毛（花環插一根羽毛，疊在五隻動物與小芽身上，透明背景） |
| `item-cape-moss` | 160×160 | 320×320 | `public/assets/ph/item-cape-moss.svg` | 商店、小芽換裝 | `src/features/game/config.ts:77` | 造型：苔蘚斗篷（披在肩上，疊在五隻動物與小芽身上，透明背景） |
| `item-hat-ancient` | 160×160 | 320×320 | `public/assets/ph/item-hat-ancient.svg` | 小芽換裝、打卡後的稀有配件卡 | `src/features/game/DropCards.tsx:12`<br>`src/features/game/config.ts:114` | 稀有配件：古木紋理頭飾，木紋年輪，疊在角色上，透明背景（只能在受保護樹木掉落，不在商店賣） |
| `item-frame-spring` | 160×160 | 320×320 | `public/assets/ph/item-frame-spring.svg` | 商店 | `src/features/game/config.ts:78` | 樹的頁面相框：春櫻（商品縮圖；實際相框另需 720×400 外框） |
| `item-frame-autumn` | 160×160 | 320×320 | `public/assets/ph/item-frame-autumn.svg` | 商店 | `src/features/game/config.ts:79` | 樹的頁面相框：秋楓（同上） |
| `insect-ladybug` | 120×120 | 240×240 | `public/assets/ph/insect-ladybug.svg` | 圖鑑「樹上住戶」、打卡後的彩蛋卡（模擬） | `src/features/game/drops.ts:28` | 樹上住戶：瓢蟲，蠟筆繪本風，小、透明背景 |
| `insect-beetle` | 120×120 | 240×240 | `public/assets/ph/insect-beetle.svg` | 圖鑑「樹上住戶」、打卡後的彩蛋卡（模擬） | `src/features/game/drops.ts:29` | 樹上住戶：獨角仙，蠟筆繪本風，小、透明背景 |
| `insect-cicada` | 120×120 | 240×240 | `public/assets/ph/insect-cicada.svg` | 圖鑑「樹上住戶」、打卡後的彩蛋卡（模擬） | `src/features/game/drops.ts:30` | 樹上住戶：蟬（只在 5～9 月出現），蠟筆繪本風，小、透明背景 |
| `species-card` | 160×160 | 320×320 | `public/assets/ph/species-card.svg` | 圖鑑 | `src/features/codex/CodexSection.tsx:108` | 樹種卡通用底圖；正式版每個樹種一張（先做前 40 名，清單見 public/data/species.json） |
| `badge-first` | 120×120 | 240×240 | `public/assets/ph/badge-first.svg` | 成長徽章 | `src/features/game/badges.ts:67（動態）` | 第一次相遇 |
| `badge-species-3` | 120×120 | 240×240 | `public/assets/ph/badge-species-3.svg` | 成長徽章 | `src/features/game/badges.ts:67（動態）` | 認識三種樹 |
| `badge-species-10` | 120×120 | 240×240 | `public/assets/ph/badge-species-10.svg` | 成長徽章 | `src/features/game/badges.ts:67（動態）` | 樹的朋友（10 種） |
| `badge-far-view` | 120×120 | 240×240 | `public/assets/ph/badge-far-view.svg` | 成長徽章 | `src/features/game/badges.ts:67（動態）` | 遠遠看著你（安全島樹） |
| `badge-capsule` | 120×120 | 240×240 | `public/assets/ph/badge-capsule.svg` | 成長徽章 | `src/features/game/badges.ts:67（動態）` | 時空膠囊（回到同一棵樹） |
| `badge-wisher` | 120×120 | 240×240 | `public/assets/ph/badge-wisher.svg` | 成長徽章 | `src/features/game/badges.ts:67（動態）` | 種下一個願望 |
| `badge-waterer` | 120×120 | 240×240 | `public/assets/ph/badge-waterer.svg` | 成長徽章 | `src/features/game/badges.ts:67（動態）` | 澆水十次 |
| `badge-night` | 120×120 | 240×240 | `public/assets/ph/badge-night.svg` | 成長徽章 | `src/features/game/badges.ts:67（動態）` | 夜行者（夜間打卡） |
| `badge-reporter` | 120×120 | 240×240 | `public/assets/ph/badge-reporter.svg` | 成長徽章 | `src/features/game/badges.ts:67（動態）` | 樹的守望者（樹況回報） |
| `badge-first-light` | 120×120 | 240×240 | `public/assets/ph/badge-first-light.svg` | 成長徽章 | `src/features/game/badges.ts:67（動態）` | 第一道光（第一次收集光點） |
| `badge-home-screen` | 120×120 | 240×240 | `public/assets/ph/badge-home-screen.svg` | 成長徽章 | `src/features/game/badges.ts:67（動態）` | 回家的路（從手機桌面圖示打開） |
| `badge-newcomer` | 120×120 | 240×240 | `public/assets/ph/badge-newcomer.svg` | 成長徽章 | `src/features/game/badges.ts:67（動態）` | 城市的新朋友（完成新手任務） |
| `stamp-iron` | 120×120 | 240×240 | `public/assets/ph/stamp-iron.svg` | 集章冊 | `src/features/game/districts.ts:52` | 行政區集章：鐵章（打卡 1 棵不同的樹）。圓形印章，中間留空放行政區名 |
| `stamp-bronze` | 120×120 | 240×240 | `public/assets/ph/stamp-bronze.svg` | 集章冊 | `src/features/game/districts.ts:53` | 行政區集章：銅章（10 棵）。同一組造型，材質不同 |
| `stamp-silver` | 120×120 | 240×240 | `public/assets/ph/stamp-silver.svg` | 集章冊 | `src/features/game/districts.ts:54` | 行政區集章：銀章（50 棵） |
| `stamp-gold` | 120×120 | 240×240 | `public/assets/ph/stamp-gold.svg` | 集章冊 | `src/features/game/districts.ts:55` | 行政區集章：金章（200 棵） |
| `avatar-taiwan-dog` | 96×96 | 192×192 | `public/assets/ph/avatar-taiwan-dog.svg` | 地圖上代表你、新手引導、我的 | `src/features/avatar/animals.ts:17` | 地圖人物：臺灣黑狗（預設）。開朗樂天，鐮刀尾是招牌。2.5D 繪本風的小動物站著、正面朝向鏡頭，透明背景，腳底在圖的下緣中央（地圖定位點）。五隻動物都帶著同一片發光葉子，點狀眼睛、臉部留白（團隊簡報 v17，v20 增為五隻）。 |
| `avatar-leopard-cat` | 96×96 | 192×192 | `public/assets/ph/avatar-leopard-cat.svg` | 地圖上代表你、新手引導、我的 | `src/features/avatar/animals.ts:18` | 地圖人物：石虎。冷淡的觀察家，耳後白斑是招牌。規格同上。五隻動物都帶著同一片發光葉子，點狀眼睛、臉部留白（團隊簡報 v17，v20 增為五隻）。 |
| `avatar-blue-magpie` | 96×96 | 192×192 | `public/assets/ph/avatar-blue-magpie.svg` | 地圖上代表你、新手引導、我的 | `src/features/avatar/animals.ts:19` | 地圖人物：臺灣藍鵲。火爆脾氣，長尾巴。規格同上。五隻動物都帶著同一片發光葉子，點狀眼睛、臉部留白（團隊簡報 v17，v20 增為五隻）。 |
| `avatar-malayan-night-heron` | 96×96 | 192×192 | `public/assets/ph/avatar-malayan-night-heron.svg` | 地圖上代表你、新手引導、我的 | `src/features/avatar/animals.ts:20` | 地圖人物：黑冠麻鷺。呆萌的大笨鳥，常定格發呆、偶爾歪頭。規格同上。五隻動物都帶著同一片發光葉子，點狀眼睛、臉部留白（團隊簡報 v17，v20 增為五隻）。 |
| `avatar-pangolin` | 96×96 | 192×192 | `public/assets/ph/avatar-pangolin.svg` | 地圖上代表你、新手引導、我的 | `src/features/avatar/animals.ts:21` | 地圖人物：穿山甲。容易緊張，緊張時捲成球。規格同上。五隻動物都帶著同一片發光葉子，點狀眼睛、臉部留白（團隊簡報 v17，v20 增為五隻）。 |
| `action-scan` | 64×64 | 128×128 | `public/assets/ph/action-scan.svg` | 點樹後的行動圈 | （尚未使用） | 圖示：掃樹牌打卡（QR Code 框）。發光圓圈裡的單色小圖示，透明背景，灰色狀態由程式處理 |
| `action-whisper` | 64×64 | 128×128 | `public/assets/ph/action-whisper.svg` | 點樹後的行動圈 | `src/features/map/treeRings.ts:74` | 圖示：樹洞（樹幹上的小洞或對話氣泡）。規格同上 |
| `action-info` | 64×64 | 128×128 | `public/assets/ph/action-info.svg` | 點樹後的行動圈 | `src/features/map/treeRings.ts:75` | 圖示：樹的資料（樹牌或葉子加一個 i）。規格同上 |
| `action-report` | 64×64 | 128×128 | `public/assets/ph/action-report.svg` | 點樹後的行動圈 | `src/features/map/treeRings.ts:76` | 圖示：樹況回報（剪刀或旗標）。規格同上 |
| `action-route` | 64×64 | 128×128 | `public/assets/ph/action-route.svg` | 點樹後的行動圈 | `src/features/map/treeRings.ts:82` | 圖示：怎麼走（彎彎的路線加一個終點標記）。規格同上 |
| `action-walk` | 64×64 | 128×128 | `public/assets/ph/action-walk.svg` | 點樹後的行動圈（只有 Demo 模式） | `src/features/map/treeRings.ts:88` | 圖示：走過去（腳印）。規格同上 |
| `fog-empty` | 240×160 | 480×320 | `public/assets/ph/fog-empty.svg` | 探索頁空狀態（還沒打卡） | `src/features/fog/FogMap.tsx:81` | 繪本風：一棵小樹苗被淡淡的霧蓋住，旁邊一盞小提燈；暖黃光暈、蠟筆質感，透明背景，主體置中、四周留白 |

共 50 項。

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
| `public/assets/photo/tree-tag.jpg` | `src/features/checkin/Scanner.tsx:93` |
