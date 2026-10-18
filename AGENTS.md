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
| 光點、商店、圖鑑、徽章、角色、GM、開放 API、發包商 | `docs/specs/08-extensions.md` |

規格和程式不一致時，先停下來問，不要自己挑一邊改。範圍或決定有變時，同一次修改要一起更新規格和 README。

## 規則

- **只做 P0，做完再做 P1**。P2 只寫進文件，不實作。
- **打卡是「樹牌 QR Code + GPS」，不做 NFC**。樹牌 QR 內容是 `http://trees.gov.taipei/show/?treeid=<TreeID>`。
- **真實與模擬資料要分開**：
  - 真實資料只從 `material/` 經 `scripts/` 產生到 `public/data/`。
  - 模擬資料只放在 `src/mock/`，畫面上標「模擬」。
  - 新增任何模擬資料時，同步更新 README 的「模擬資料」表。
- `material/raw/` 是原始開放資料，**不要修改**；要改處理方式就改 `scripts/`，再重新產生。
- 不使用任何真實個資；樹洞內容只存在使用者的裝置。
- 所有資料存取都經過 `store` 模組（目前是 localStorage），元件不直接碰 localStorage。
- 手機版優先：寬 360 px 不能出現水平捲動，輸入框字級至少 16 px。
- 使用者看得到的文字一律用繁體中文。

## 資料

- `material/raw/`：2026-10-16 下載的政府開放資料與 OSM（來源與授權見 README）。
- `material/processed/`：`scripts/merge_treepits.py`、`scripts/match_parks_osm.py` 的輸出。
- `material/samples/tree-tag-SL0560111023.jpg`：真實樹牌照片，掃碼的測試素材。
- 樹籍編號 `TreeID` 要整串比對，有 4,219 筆帶 `-001` 這類後綴。

## 指令

Python 腳本用 uv 執行：

```sh
uv run scripts/merge_treepits.py
uv run scripts/match_parks_osm.py
uv run scripts/build_web_data.py   # 產生 public/data/，需要 tippecanoe
```

前端：

```sh
npm run dev     # 加 ?demo=1 進 Demo 模式
npm test        # vitest
npm run build   # tsc + vite build
node scripts/make_placeholders.mjs   # 佔位美術，清單在 src/assets.ts
```

- 美術一律先用佔位檔：在 `src/assets.ts` 加一筆，跑上面的腳本，畫面用 `<Art id="…">`。
- 延伸功能（光點、商店、GM 等）見 `docs/specs/08-extensions.md`；討論紀錄見 `docs/discussion-2026-10-17.md`。

## 驗證

- 每份規格最後都有「驗收」清單；完成一項功能時逐條驗證，並回報哪幾條沒過。
- 掃碼與 GPS 要在實機上測過才算完成；只在桌機瀏覽器測過，要說明。
