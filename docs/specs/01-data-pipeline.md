# 01 資料前處理

把 `material/` 的開放資料轉成網頁直接讀得動的靜態檔，輸出到 `public/data/`。目標是手機在 4G 下也能流暢：不要把 16 萬棵樹的完整 GeoJSON（數十 MB）丟給瀏覽器。

## 輸入

| 檔案 | 用途 |
|---|---|
| `material/raw/TaipeiTree.csv` | 行道樹 90,395 棵（TWD97） |
| `material/raw/TaipeiParkTree.csv` | 公園樹木 72,011 棵（TWD97） |
| `material/processed/treepits_merged.geojson` | 合併後的樹穴 57,548 個（WGS84） |
| `material/processed/parks_boundary.geojson` | 公園範圍（OSM，ODbL） |
| `material/raw/sidewalk.json` | 人行道範圍（行政區統計用） |

### 欄位

- 行道樹：`TreeID, Dist, Region, RegionRemark, TreeType, Diameter, TreeHeight, SurveyDate, TWD97X, TWD97Y, UpdDate`
- 公園樹：`TreeID, Dist, ParkName, TreeType, Diameter, TreeHeight, TWD97X, TWD97Y, SurveyDate, UpdDate`
- `Diameter` 是胸徑（cm），`TreeHeight` 是樹高（m）。
- `RegionRemark` 常見值：空白、`無`、`東/西/南/北側人行道`，也有 `信義路二段北側安全島` 這類完整描述。打卡的「遠觀模式」以**包含** `安全島` 判斷；`無` 視為空白。

### 樹籍編號 `TreeID`

- 162,406 棵全部唯一，每棵都有座標。
- 多數為 2 個字母 + 10 位數字，例如 `SL0560111023`。另有 4,219 筆帶後綴，例如 `SL0174321005-001`。**一律整串比對**。
- 前 2 碼大致對應行政區（少數跨區）：

| 前綴 | 行政區 | 前綴 | 行政區 |
|---|---|---|---|
| BT | 北投 | NH | 內湖 |
| DA | 大安 | SL | 士林 |
| DT | 大同 | SS | 松山 |
| JJ | 中正 | SY | 信義 |
| JS | 中山 | WH | 萬華 |
| NG | 南港 | WS | 文山 |

## 輸出（P0）

### 1. 樹籍查詢表 `public/data/trees/<前綴>.json`

依 `TreeID` 前 2 碼拆成 12 檔（每檔約 1–2 萬棵）。掃到樹牌後只載入那一檔。

```json
{
  "species": ["榕樹", "楓香", "..."],
  "trees": {
    "SL0560111023": [121.53, 25.09, 1, 45.4, 9.5, "至善路一段", "安全島", "street"]
  }
}
```

陣列欄位依序：經度、緯度（WGS84，小數 6 位）、樹種索引、胸徑、樹高、路名或公園名、位置備註、類別（`street` 行道樹 / `park` 公園樹）、調查日期、行政區。

### 2. 地圖用樹木點位

用 `tippecanoe` 產生向量圖磚（`brew install tippecanoe`）。

裝不了就退而求其次：輸出 `public/data/tree-points/<前綴>.json`，每檔只放 `[經度, 緯度, 樹種索引]`，前端依畫面範圍載入。

兩種做法擇一，在本檔記下最後採用哪個。

**採用 tippecanoe 向量圖磚，輸出成靜態目錄**（2026-10-19）：`public/data/tree-tiles/{z}/{x}/{y}.pbf`，圖層 `trees`，屬性 `id`（TreeID）、`k`（`s` 行道樹／`p` 公園樹），z10–16，740 個檔、約 20 MB（未壓縮，由 Cloudflare 壓縮傳輸）。原本用單一 PMTiles 檔，但 Cloudflare Pages 不支援 HTTP Range，讀不到，所以改成目錄。

### 3. 空樹穴 `public/data/pits-empty.geojson`

- 只取 `kind == "樹穴"` 且 `has_tree == false`，共 16,781 個。
- 幾何轉成點（多邊形取中心點），座標小數 6 位。
- 屬性保留：`pit_id`、`district`、`road`、`area_m2`、`source`。
- 新工處樹穴沒有路名：取 50 m 內最近行道樹的路名，並標 `road_inferred: true`（16,781 個中 12,302 個有路名）。

## 輸出（P1）

### 4. 行政區統計 `public/data/districts.json`

每區：行道樹數、人行道長度（km）、每公里行道樹數、候選空樹穴數。用來顯示「大安是文山的 2.6 倍」。算法沿用簡報：行道樹數 ÷ 人行道長度（含安全島與綠帶）。

## 座標轉換

TWD97（EPSG:3826）→ WGS84（EPSG:4326），用 `pyproj`，`always_xy=True`。

驗算：`SL0560111023` 轉換後應落在士林區至善路一段。

## 腳本

- 新增 `scripts/build_web_data.py`（uv 腳本，相依套件寫在檔頭），一次產生上面所有輸出。
- 輸出檔可以進版控（網站部署需要），但 `material/raw/` 不需要部署。

## 既有處理規則（沿用 oshen-wave-tree）

### 樹穴合併（`scripts/merge_treepits.py`）

- 公園處 CSV 有重複列，同一樹穴常以「路名」與「行政區」各出現一次，先依 `TreeHoleID` 合併。
- 公園處樹穴點位距新工處樹穴多邊形 2 m 內，視為同一樹穴（`source: both`）；否則新增為點位（`source: pkl`）。
- `has_tree`：1.5 m 內有登錄的行道樹或公園樹。`false` 只代表「候選空樹穴」，可能是座標偏移或新植未登錄，需要現場確認。
- 公園處樹穴沒有行政區時，取最近新工處樹穴的行政區（`district_inferred: true`）。

### 公園範圍比對（`scripts/match_parks_osm.py`）

1. 同名：OSM 有同名公園，且離官方中心點 80 m 內（`method: name`）。
2. 包含：官方中心點落在某個 OSM 公園範圍內（`contains`）。
3. 交叉口：從 `pm_location` 解析路名（如「光明路、中山路交叉口」），用 OSM 道路找出交會點，取 60 m 內同名（`intersection+name`）或面積為官方 0.5–2 倍（`intersection+area`）的公園。

`ratio` = OSM 面積 ÷ 官方面積；`contains` 與 `intersection+*` 的品質較差，使用前看一下 `ratio`。

## 受保護樹木名冊（2026-10-20）

不是公園處資料的一部分，獨立一條：`scripts/fetch_protected_trees.py` 下載 [臺北市受保護樹木](https://data.gov.tw/dataset/121274) 到 `material/raw/protected_trees/`，`scripts/build_protected_trees.py` 依位置與樹種比對到 TreeID，輸出 `public/data/protected-trees.json`。方法、門檻與結果見 [08 §1](08-extensions.md)。

## 驗收

- [ ] `uv run scripts/build_web_data.py` 一次跑完，沒有錯誤。
- [x] `uv run scripts/build_protected_trees.py --check` 通過：名冊 3,874 棵、比對到 1,161 棵、每個 TreeID 只用一次且都查得到（`protectedTrees.test.ts` 也檢查）。
- [ ] 查詢表涵蓋 162,406 棵，`SL0560111023`、`SY0030551077`、帶後綴的 `SL0174321005-001` 都查得到。
- [ ] `pits-empty.geojson` 有 16,781 個點。
- [ ] 單一查詢表檔案 gzip 後小於 500 KB。
