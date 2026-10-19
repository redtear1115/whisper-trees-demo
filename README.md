# 曦語 Whisper Trees（Web Demo）

[台北市政 debug 松](https://puma.taipei/hackathon) 題目 #1「把三千棵樹種回來」的參賽作品 Demo。

**網址：https://whisper-trees.pages.dev**（市民端只能用手機開；桌機請加 `?demo=1` 進 Demo 模式：模擬定位、可掃示範樹牌。政府端 `/gov` 用桌機開）

台北每年移除約 3,164 棵樹。曦語把 16 萬棵行道樹與公園樹變成市民可以停下來、對它說話的「樹洞」；同時讓市民在空樹穴許願、澆水，政府依市民需求與樹蔭缺口排出補種順序，並公開進度。

- 掃公園處樹牌上**現有的 QR Code**，加上 **GPS** 確認人在樹旁，就能打卡。不需要新增任何設施。
- 樹洞內容只存在自己的雲端資料，其他使用者讀不到，不公開、無按讚、無留言；只顯示「這棵樹本週有幾道微光陪伴」。
- 許願與澆水數，就是補種優先分數裡的「市民需求」。

## 專案範圍

### Demo 會做的（主線）

| # | 功能 | 規格 |
|---|---|---|
| 1 | 全市樹木地圖、候選空樹穴、行政區樹蔭差距 | [02-map](docs/specs/02-map.md) |
| 2 | 掃樹牌 QR Code + GPS 打卡 | [03-checkin](docs/specs/03-checkin.md) |
| 3 | 樹的頁面、樹洞（私密留言、微光人數、時空膠囊）、樹況回報（修剪有問題／樹木生病） | [04-tree-page](docs/specs/04-tree-page.md) |
| 4 | 見縫插樹：空樹穴許願、澆水、進度追蹤 | [05-wish](docs/specs/05-wish.md) |
| 5 | 政府端：需求熱點、補種優先分數（權重滑桿）、改案件狀態 | [06-gov-console](docs/specs/06-gov-console.md) |

完整流程與優先順序見 [docs/specs/00-overview.md](docs/specs/00-overview.md)。

### 延伸功能（主線之後的示意）

主線之外的畫面，從「更多」進入；全部是前端示意、模擬資料。見 [08-extensions](docs/specs/08-extensions.md)。

- 光點經濟、商店、圖鑑、成長徽章、角色養成
- 遊戲營運後台（GM）、對外開放 API（靜態 JSON）、發包商後台

### 登入與資料

- 匿名自動登入；選單可「用 Google 保留紀錄」。「以台北通登入」仍只做畫面。
- 資料存在 Firebase（Firestore，asia-east1）。後台（政府端、發包商、GM）寫入限白名單帳號，其他人是「示範：只在這台裝置」的本機示範模式。
- 沒有設定 Firebase 時，退回本機 localStorage。設定見 [docs/firebase-setup.md](docs/firebase-setup.md)。

### 這次不做（放在「未來展望」）

- Apple Watch 冥想、AI 初審照片
- 樹木認養（單人或多人合資）、彩繪石尋寶：見[討論紀錄](docs/discussion-2026-10-17.md)
- 3D 街廓、樓層窗景
- NFC 打卡：目前沒有 NFC 樹牌，也沒有驗證過，改用現有的 QR 樹牌 + GPS

### 未來擴充（DLC）

同一套「市民回報 × 後台營運 × 政府資料」可以延伸到其他市政設施。Demo 只在地圖圖層放預告，不做互動，見 [07-dlc-preview](docs/specs/07-dlc-preview.md)。

- **垃圾桶**：回報滿溢、建議佈點（對應 debug 松題目 #2）
- **路燈**：回報故障（公園處「行道樹路燈資訊網」本來就把行道樹和路燈放在同一個系統）

## 資料：哪些是真的、哪些是模擬的

### 真實開放資料

`material/raw/` 為 2026-10-16 下載的原始檔，依[政府資料開放授權條款第 1 版](https://data.gov.tw/license)使用。

| 檔案 | 資料集 | 提供機關 | 座標 |
| --- | --- | --- | --- |
| `TaipeiTree.csv` | [臺北市行道樹及公園樹木分布圖](https://data.gov.tw/dataset/128274)：行道樹 90,395 棵 | 工務局公園處 | TWD97 |
| `TaipeiParkTree.csv` | 同上：公園樹木 72,011 棵 | 工務局公園處 | TWD97 |
| `TaipeiTreeHole.csv` | 同上：樹穴 | 工務局公園處 | TWD97 |
| `treepit_nwo.json` | [臺北市人行道固定設施物＿樹穴](https://data.gov.tw/dataset/134908) | 工務局新工處 | EPSG:3826 |
| `sidewalk.json` | [臺北市人行道範圍圖](https://data.taipei/dataset/detail?id=715d3a83-8445-4496-b6bf-b0900538b7e7) | 工務局新工處 | EPSG:3826 |
| `parks.json` | [臺北市公園基本資料](https://data.taipei/dataset/detail?id=ea732fb5-4bec-4be7-93f2-8ab91e74a6c6) | 工務局公園處 | WGS84 |

`material/raw/osm/` 為 2026-10-16 透過 Overpass API 下載的 OpenStreetMap 資料（公園範圍、具名道路），© OpenStreetMap contributors，依 [ODbL 1.0](https://opendatacommons.org/licenses/odbl/) 授權。

**樹牌 QR Code**：公園處樹牌上的 QR Code 內容為 `http://trees.gov.taipei/show/?treeid=<樹籍編號>`（以實拍樹牌 `SL0560111023` 解碼確認，照片在 `material/samples/`）。`treeid` 就是上表樹木資料的 `TreeID`，所以掃到樹牌就能查到這棵樹的座標、樹種、樹高與胸徑。

### 處理後的資料（由真實資料推算）

| 檔案 | 內容 | 產生方式 |
|---|---|---|
| `material/processed/treepits_merged.geojson` | 兩份樹穴合併，57,548 個；`has_tree: false` 為候選空樹穴 | `scripts/merge_treepits.py` |
| `material/processed/parks_osm_match.csv`、`parks_boundary.geojson` | 公園處 813 座公園對上 OSM 範圍，622 座有範圍 | `scripts/match_parks_osm.py` |
| `public/data/` | 網頁用的樹木點位（向量圖磚）、樹籍查詢表、空樹穴、行政區與樹種統計 | `scripts/build_web_data.py`，見 [01-data-pipeline](docs/specs/01-data-pipeline.md) |
| `public/api/v1/` | 開放 API 的靜態 JSON（行政區、樹種、端點清單；許願為模擬） | 同上 |

推算的限制：

- **候選空樹穴 16,781 個**：`kind` 為樹穴、且 1.5 m 內沒有登錄樹木。可能是座標偏移或新植未登錄，需要現場抽查。
- **遮蔭率**：以胸徑推估冠幅，再除以人行道面積，是估計值。
- **公園範圍**：`method` 為 `contains` 或 `intersection+*` 的比對品質較差，使用前要看 `ratio`。

### 模擬資料

以下資料目前不存在或未開放，Demo 使用模擬資料。全部放在 `src/mock/`，畫面上以「模擬」標記；Demo 時也會口頭說明。

| 資料 | 為什麼用模擬 |
|---|---|
| 樹洞留言 | 真實使用者的留言存在自己的雲端資料（`users/{uid}/whispers`）；範例時空膠囊仍是模擬（`src/mock`） |
| 「本週微光陪伴人數」 | 沒有真實使用者，以固定種子產生 |
| 許願、澆水數 | 真實使用者的許願與澆水已存在 Firestore；種子數量仍是模擬 |
| 補種案件的處理進度（已收件 → 會勘中 → 已排程 → 已種植） | 市府沒有這套流程，由白名單承辦帳號在政府端切換；評審操作的改動只留在自己的裝置 |
| 樹況回報 | 同上；政府端預先放幾筆示範回報（`src/mock/reports.json`） |
| 移樹紀錄與原因 | 逐年移除紀錄未完整開放 |
| 移樹前公告與意見數（`src/mock/notices.json`） | 市府目前沒有對外的移樹前公告；示範一筆 |
| 「以台北通登入」 | 仍是模擬畫面；真正的登入是匿名與 Google |
| Demo 模式的 GPS 位置 | 現場不在樹旁時，用 `?demo=1` 固定位置 |
| 垃圾桶、路燈（DLC 預告） | 只放預告圖層 |
| 光點、商店購買、小芽造型、徽章 | 延伸功能示意，存在使用者自己的裝置（store） |
| GM 後台的全市經濟數字、其他玩家與客訴（`src/mock/players.json`） | 沒有真實營運資料 |
| 發包商工單進度 | 沒有真實廠商，由後台畫面手動推進 |
| 開放 API 的 `wishes.json` | 由 `src/mock/wishes.json` 產生的固定快照，檔案內標 `"mock": true` |

不使用任何真實個資；「市長，你給我聽好了」的資料不會用來反推陳情人身分。

## 隱私

- **樹洞**存在你自己的帳號底下，其他使用者讀不到。專案管理者在 Firebase console 技術上看得到。
- **樹況回報的備註**只有承辦人看得到；畫面提醒不要填個資。
- Firestore 不存 email 或姓名，只用匿名 uid。
- 「提示點」（seen）只留在這台裝置。
- 登出會清掉這台裝置上的快取。

## 已知限制（Demo 接受的風險）

- 一個人可開很多匿名帳號，灌高澆水數或洗版許願；管理者可以刪除。
- 光點帳本存在使用者自己的資料裡，使用者可以改自己的光點。
- GPS 可以偽造。
- 專案擁有者在 console 看得到所有資料。
- 免費額度用完時，網站退回本機模式。
- 被放棄的匿名帳號資料不會清理。
- 管理者角色只有一種，沒有分級。

## 如果市府上任 100 天內要落地

> 待隊上決定，建議涵蓋：主責局處（公園處）、需要開放的資料（移樹紀錄、樹穴現況）、樹牌 QR 指向的網址如何導到新服務、預估成本。

## 參考與致謝

- [taipei-trees.org](https://taipei-trees.org/guide)：已有在網頁內掃樹牌查樹的做法；曦語在掃碼之外加上 GPS 現場確認、樹洞、許願與政府端。
- 3-30-300 原則（Konijnendijk, 2023）、Tree Equity Score、新加坡「見縫插樹」。

## 使用的開源套件與 AI 工具

| 套件 | 用途 | 授權 |
|---|---|---|
| React、React Router | 前端框架、路由 | MIT |
| Vite、TypeScript、Vitest | 建置、型別、測試 | MIT／Apache-2.0 |
| MapLibre GL JS | 地圖 | BSD-3-Clause |
| @zxing/browser、@zxing/library | 掃樹牌 QR Code | Apache-2.0 |
| firebase | 匿名／Google 登入、Firestore 雲端資料 | Apache-2.0 |
| SunCalc | 日出日落（夜間模式） | BSD-2-Clause |
| tippecanoe | 產生樹木點位向量圖磚 | BSD-2-Clause |
| OpenFreeMap | 底圖圖磚（免金鑰） | 資料 © OpenMapTiles、OpenStreetMap |

本專案使用 Claude Code 協助整理資料、撰寫規格與程式。

## 重新產生資料

需要 [uv](https://docs.astral.sh/uv/)：

```sh
uv run scripts/merge_treepits.py
uv run scripts/match_parks_osm.py
uv run scripts/build_web_data.py   # 需要 tippecanoe（brew install tippecanoe）
```

## 開發

```sh
npm install
npm run dev      # http://localhost:5173，加 ?demo=1 進 Demo 模式（模擬定位、可掃示範樹牌）
npm test
npm run test:rules   # 本機 Firestore emulator 跑規則測試（brew install openjdk）
cp .env.example .env.local   # 填入 6 個 VITE_FIREBASE_* 值；沒有這個檔就用 localStorage
npm run build    # 輸出 dist/，靜態網站
npm run deploy   # 建置並部署到 Cloudflare Pages（專案 whisper-trees，Ray Personal Account）
node scripts/make_placeholders.mjs   # 依 src/assets.ts 重新產生佔位美術與 docs/ui-assets.md
```

Firebase 設定與部署紀錄見 [docs/firebase-setup.md](docs/firebase-setup.md)。

美術目前都是佔位檔，交給設計的清單見 [docs/ui-assets.md](docs/ui-assets.md)。

比對規則（公園範圍、樹穴合併）見 [01-data-pipeline](docs/specs/01-data-pipeline.md)。
