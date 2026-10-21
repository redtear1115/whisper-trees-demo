# AGENTS.md

曦語 Whisper Trees 的 Web Demo，參加台北市政 debug 松題目 #1。**提交期限：2026-10-24（六）16:00**。

## 開始工作前要讀的文件

依序讀：

1. `README.md`：專案範圍（做 / 不做 / DLC），以及哪些資料是真實、哪些是模擬。
2. `docs/specs/00-overview.md`：Demo 路線、各功能的 P0/P1/P2、技術選擇。
3. 跟你這次任務有關的規格：

| 任務 | 規格 |
|---|---|
| 資料前處理、`public/data/` | `docs/specs/01-data-pipeline.md` |
| 地圖、圖層 | `docs/specs/02-map.md` |
| 掃樹牌、GPS、Demo 模式 | `docs/specs/03-checkin.md` |
| 樹的頁面、樹洞、微光 | `docs/specs/04-tree-page.md` |
| 許願、澆水、進度 | `docs/specs/05-wish.md` |
| 政府端、優先分數 | `docs/specs/06-gov-console.md` |
| 垃圾桶、路燈預告 | `docs/specs/07-dlc-preview.md` |
| 光點、商店、圖鑑、徽章、角色、GM、開放 API、發包商、導覽列、集章冊 | `docs/specs/08-extensions.md` |
| 探索的迷霧地圖 | `docs/specs/09-fog.md` |

規格和程式不一致時，先停下來問，不要自己挑一邊改。範圍或決定有變時，同一次修改要一起更新規格和 README。

## 規則

- **只做 P0，做完再做 P1**。P2 只寫進文件，不實作。
- **打卡是「樹牌 QR Code + GPS」，不做 NFC**。樹牌 QR 內容是 `http://trees.gov.taipei/show/?treeid=<TreeID>`。
- **真實與模擬資料要分開**：
  - 真實資料只從 `material/` 經 `scripts/` 產生到 `public/data/`。
  - 模擬資料只放在 `src/mock/`，畫面上標「模擬」。
  - 新增任何模擬資料時，同步更新 README 的「模擬資料」表。
- `material/raw/` 是原始開放資料，**不要修改**；要改處理方式就改 `scripts/`，再重新產生。
- 不使用任何真實個資：Firestore 與畫面只存、只顯示 uid，不存 email 或姓名；回報備註提示勿填個資，只有承辦人看得到。
- 樹洞存在使用者自己的雲端資料（`users/{uid}/whispers`），其他使用者讀不到；專案管理者在 console 技術上看得到，README 要寫明。
- 所有資料存取都經過 `store` 模組。設定了 `VITE_FIREBASE_*` 時後端是 Firestore（見 `docs/firebase-setup.md`），否則是 localStorage；元件不直接碰 localStorage 或 Firestore。
- 安全規則的唯一來源是 `firestore.rules`；部署步驟與紀錄在 `docs/firebase-setup.md`。
- 手機版優先：寬 360 px 不能出現水平捲動，輸入框字級至少 16 px。
- 使用者看得到的文字一律用繁體中文。

## 資料

- `material/raw/`：2026-10-16 下載的政府開放資料與 OSM（來源與授權見 README）。
- `material/processed/`：`scripts/merge_treepits.py`、`scripts/match_parks_osm.py` 的輸出。
- `material/raw/inat/`：iNaturalist 樹種照片（2026-10-20，只收 CC0 與 CC BY，逐張記在 `manifest.json`）。不要手動增減照片；要換就改 `scripts/fetch_inat_photos.py` 再重跑。授權規則不可放寬（不收 NC / SA / ND）。
- `material/samples/tree-tag-SL0560111023.jpg`：真實樹牌照片，掃碼的測試素材。
- 樹籍編號 `TreeID` 要整串比對，有 4,219 筆帶 `-001` 這類後綴。

## 指令

Python 腳本用 uv 執行：

```sh
uv run scripts/merge_treepits.py
uv run scripts/match_parks_osm.py
uv run scripts/build_web_data.py   # 產生 public/data/，需要 tippecanoe
uv run scripts/fetch_protected_trees.py   # 下載受保護樹木名冊到 material/raw/protected_trees/（只在要更新時跑）
uv run scripts/build_protected_trees.py   # 對上 TreeID，產生 public/data/protected-trees.json（--check 檢查）
uv run scripts/fetch_inat_photos.py    # 樹種照片：iNaturalist，只收 CC0 / CC BY，下載到 material/raw/inat/（--check 驗授權與張數）
uv run scripts/build_species_photos.py # 縮圖、去 EXIF，產生 public/data/species-photos/（--check）
uv run scripts/fetch_admin_osm.py  # 下載 OSM 行政區界到 material/raw/osm/admin_boundaries_osm.json（只在要更新時跑）
uv run scripts/build_admin_outline.py   # 產生 public/data/taipei-outline.json（集章冊背景）；加 --check 只檢查
uv run scripts/fetch_villages.py   # 下載內政部村里界到 material/raw/village/village.zip（只在要更新時跑）
uv run scripts/build_villages.py   # 產生 public/data/villages/<前綴>.json（456 里的界線與每里樹數）；加 --check 只檢查
uv run scripts/build_road_graph.py # 產生 public/data/roads/<前綴>.json（步行路網，來自 OSM 具名道路；需要先有 villages）；加 --check 只檢查
```

前端：

```sh
npm run dev     # 加 ?demo=1 進 Demo 模式
npm test        # vitest
npm run test:rules   # 本機 Firestore emulator 跑規則測試（tests/rules）與雲端 store 測試（tests/cloud），需要 brew install openjdk；改 firestore.rules 一定要跑
npm run build   # tsc + vite build
npm run deploy  # 部署到 Cloudflare Pages：https://whisper-trees-demo.southern-light.dev（部署前先問）
node scripts/make_placeholders.mjs   # 佔位美術，清單在 src/assets.ts
```

- `.env.local`：複製 6 個 `VITE_FIREBASE_*` 值進去，不要進版控。Cloudflare Pages 建置時也要設同樣 6 個變數。
- 美術一律先用佔位檔：在 `src/assets.ts` 加一筆，跑上面的腳本，畫面用 `<Art id="…">`。
- 延伸功能（光點、商店、GM 等）見 `docs/specs/08-extensions.md`。

- Cloudflare Pages 不支援 HTTP Range，所以樹木點位用靜態圖磚目錄，不用 PMTiles；`public/data/404.html` 讓缺的資料檔回 404，而不是回網頁。

## 驗證

- 每份規格最後都有「驗收」清單；完成一項功能時逐條驗證，並回報哪幾條沒過。
- 掃碼與 GPS 要在實機上測過才算完成；只在桌機瀏覽器測過，要說明。
