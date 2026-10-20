# 曦語 Whisper Trees（Web Demo）

[台北市政 debug 松](https://puma.taipei/hackathon) 題目 #1「把三千棵樹種回來」的參賽作品 Demo。

**網址：[https://whisper-trees-demo.southern-light.dev](https://whisper-trees-demo.southern-light.dev)**（市民端只能用手機開；桌機請加 `?demo=1` 進 Demo 模式：模擬定位（可以拖曳地圖上的人物、或點樹按「走過去」移動，離樹太遠一樣會被判「太遠」）、可掃示範樹牌。政府端 `/gov` 用桌機開）

台北每年移除約 3,164 棵樹。曦語把 16 萬棵行道樹與公園樹變成市民可以停下來、對它說話的「樹洞」；同時讓市民在空樹穴許願、澆水，政府依市民需求與樹蔭缺口排出補種順序，並公開進度。

- 掃公園處樹牌上**現有的 QR Code**，加上 **GPS** 確認人在樹旁，就能打卡。不需要新增任何設施。
- 樹洞內容只存在自己的雲端資料，其他使用者讀不到，不公開、無按讚、無留言；只顯示「這棵樹本週有幾道微光陪伴」。
- 許願與澆水數，就是補種優先分數裡的「市民需求」。

## 專案範圍

### Demo 會做的（主線）

| # | 功能 | 規格 |
|---|---|---|
| 1 | 附近街景地圖（樹木、候選空樹穴）；行政區樹蔭差距卡片已從市民端地圖移除（數據仍用在政府端優先分數） | [02-map](docs/specs/02-map.md) |
| 2 | 掃樹牌 QR Code + GPS 打卡 | [03-checkin](docs/specs/03-checkin.md) |
| 3 | 樹的頁面、樹洞（私密留言、微光人數、時空膠囊）、樹況回報（五類一鍵選：樹木修剪問題、病蟲害、遮蔭太多或修剪過度、新長枝芽擋路、其他） | [04-tree-page](docs/specs/04-tree-page.md) |
| 4 | 見縫插樹：空樹穴許願、澆水、進度追蹤 | [05-wish](docs/specs/05-wish.md) |
| 5 | 政府端：需求熱點、補種優先分數（權重滑桿）、改案件狀態 | [06-gov-console](docs/specs/06-gov-console.md) |

完整流程與優先順序見 [docs/specs/00-overview.md](docs/specs/00-overview.md)。

### 市民端畫面

底部導覽 5 個分頁（2026-10-19 起，見 [08 §11](docs/specs/08-extensions.md)）：

| 分頁 | 路徑 | 內容 |
|---|---|---|
| 集章冊 | `/stamps` | 頂端「集章／探索」兩區。**集章**：打開就停在你的區（新手引導選的「我的區」），全市行政區地圖（依章等級上色）→ 里完成度地圖 → 到未點亮的樹的建議步行路線（按「開始」回首頁，大地圖畫出這條路線與進度）；各區章與光點歷史；還沒有章的區是一張邀請（「去掃樹牌」）。**探索**（`/stamps?tab=explore`，舊網址 `/explore`、`/codex` 轉址過來）：探索地圖（迷霧：打卡過的樹周圍 50 m 散開，見 [09-fog](docs/specs/09-fog.md)）、新手任務、樹的圖鑑 |
| 首頁 | `/` | 地圖（只有「附近」街景，預設縮放 18.5；你選的動物站在你的位置；點樹飛到樹旁、浮出樹洞／樹的資料／樹況回報／怎麼走四個圈（Demo 多一個走過去），離太遠的灰掉；「怎麼走」在地圖上畫出沿路的步行路線與距離、分鐘；集章冊開始的里路線畫在地圖上，頂端列顯示已點亮幾棵）、掃樹牌 |
| 樹洞 | `/journal` | 我在各棵樹留下的話、我的許願 |
| 我的 | `/me` | 小芽（樹精，三階）、光點紀錄、徽章、設定（我的區、帳號、新手引導、關於曦語、Demo 工具）；陪你的動物（預設臺灣黑狗，另有石虎、臺灣藍鵲、黑冠麻鷺、穿山甲）與「現在的心情」（換心情、清除）在頂部 |

右上角是光點餘額，點了去商店 `/shop`。樹的頁面、掃描、商店是子頁面。Demo 切換台 [`/demo-control?demo=1`](https://whisper-trees-demo.southern-light.dev/demo-control?demo=1)：只在 Demo 模式顯示，在市民端（手機版）與各後台（政府端、發包商、GM、開放 API）之間切換；不從市民端連過去。

### 延伸功能（主線之後的示意）

主線之外的畫面（集章冊與其中的探索、樹洞、我的，以及只在 Demo 模式顯示的「Demo 切換台」`/demo-control?demo=1`）；全部是前端示意、模擬資料。見 [08-extensions](docs/specs/08-extensions.md)。

- 光點經濟（規則對齊團隊簡報 v17：靠近一棵樹 +10、同一棵樹第 2／3 個互動 +2／+1、日照最高 ×1.5、寂寞樹 ×2～×5、樹況回報 +15、每日第 11 棵起減半；受保護樹木基礎 20 用臺北市受保護樹木名冊依位置比對到的 1,161 棵，第一次在受保護樹木打卡成功還會掉落稀有配件「古木紋理頭飾」；打卡成功偶爾有「樹上住戶」昆蟲彩蛋（瓢蟲、獨角仙、蟬，模擬）加光點並收進圖鑑；見 [08 §1](docs/specs/08-extensions.md)）、商店、圖鑑、成長徽章、角色養成
- 打卡後的心情（**團隊簡報 v20 p15，2026-10-20**）：打卡成功或遠觀之後，樹洞卡上方有一列「現在的心情？（可以不選）」（平靜、開心、疲憊、難過、焦慮、生氣、說不上來；點了就存，再點別的就換；8 小時內最多問一次，GM 可調間隔）。玩家自己選、系統不猜、不評價、沒有光點；選了之後卡上只出現一句森林此刻的回應（只有文字，沒有建議、也沒有「你的光」）；之後想換或清除，到「我的」。只存最新一次的選擇與上次詢問時間，只有自己看得到。見 [04](docs/specs/04-tree-page.md)、[08 §11](docs/specs/08-extensions.md)
- 關於曦語 `/about`（「我的 → 設定與其他」進入）：名字由來、品牌精神與團隊介紹（團隊簡報 v20，不含聯絡方式）。見 [08 §11](docs/specs/08-extensions.md)；2026-10-21 第五輪團隊介紹改寫成「職稱＋本案做的事＋專長」三行，頁尾有「去掃一棵樹」與「回地圖」
- 動物、小芽、商店（**團隊簡報 v20，2026-10-20**）：陪你的動物五隻（臺灣黑狗〔預設〕、石虎、臺灣藍鵲、黑冠麻鷺、穿山甲）；小芽＝樹精，依累計光點長三階（初心／茁壯／智慧老樹精）；商店只賣虛擬造型（橡實帽、花冠羽毛、苔蘚斗篷）與相框，不再有捐款或認養。見 [08 §2、§5、§9](docs/specs/08-extensions.md)
- 集章冊：12 個行政區各依打卡過幾棵不同的樹得鐵（1）、銅（10）、銀（50）、金（200）章，另看每區累計的光點與明細；全由打卡紀錄與光點流水帳推算，不另存資料（已做，見 [08 §10](docs/specs/08-extensions.md)）
- 新手引導：收集第一道光（送橡實帽新手禮，不送光點）、加入手機主畫面、4 項新手任務，共 3 枚徽章（資料、徽章、引導一「收集光點」與加入主畫面已做；新手任務卡已做、瀏覽器與實機待驗，見 [08 §9](docs/specs/08-extensions.md)）
- 遊戲營運後台（GM）、發包商後台
- 政府端與廠商 API（OAuth 2.0 client credentials：承辦人在 `/gov` 建立用戶端、secret 只顯示一次；政府系統讀寫案件／回報／工單，廠商只看自己的工單）與 MCP：只做文件＋前端模擬，沒有真的伺服器，試打在 `/developers`（已做，見 [08 §7](docs/specs/08-extensions.md)）；另有開放資料下載（靜態 JSON）

### 登入與資料

- 匿名自動登入；「我的 → 設定與其他」可「用 Google 保留紀錄」。「以台北通登入」仍只做畫面。
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
| `protected_trees/protected_trees.csv` | [臺北市受保護樹木](https://data.gov.tw/dataset/121274)：3,874 棵（2026-10-20 下載；資料集 2026-10-13 更新；`source.json` 記連結與日期）。UTF-8 含 BOM，經緯度只有 4 位小數（約 11 m），沒有公園處 TreeID；由 `scripts/fetch_protected_trees.py` 下載 | 臺北市政府文化局 | WGS84 |
| `parks.json` | [臺北市公園基本資料](https://data.taipei/dataset/detail?id=ea732fb5-4bec-4be7-93f2-8ab91e74a6c6) | 工務局公園處 | WGS84 |

`material/raw/osm/` 為 2026-10-16 透過 Overpass API 下載的 OpenStreetMap 資料（公園範圍、具名道路），© OpenStreetMap contributors，依 [ODbL 1.0](https://opendatacommons.org/licenses/odbl/) 授權。

`material/raw/osm/admin_boundaries_osm.json` 為 2026-10-19 透過 Overpass API 下載的 OpenStreetMap 行政區界（臺北市、新北市、基隆市 `admin_level=4`，臺北市 12 區 `admin_level=7`），© OpenStreetMap contributors，依 ODbL 1.0 授權；由 `scripts/fetch_admin_osm.py` 下載，只用在集章冊示意地圖的背景。

`material/raw/village/village.zip` 為 2026-10-19 下載的內政部國土測繪中心[村（里）界](https://data.gov.tw/dataset/7438)（資料集「村里界圖(TWD97經緯度)」，SHP，版本 `VILLAGE_NLSC_1150817`，全國 7,986 個村里），依[政府資料開放授權條款第 1 版](https://data.gov.tw/license)使用；由 `scripts/fetch_villages.py` 下載（連結取自 data.gov.tw API，備援為 TGOS 的固定網址），用來做 456 個里的界線與每里樹木數，供之後的里層級集章地圖使用。

`material/raw/inat/` 為 2026-10-20 透過 iNaturalist 官方 API v1 下載的樹種照片（圖鑑輪播與樹的頁面用；樹的頁面每棵樹依編號固定顯示其中一張）：台北最常見的 40 個樹種，每種 4～6 張（共 198 張，「medium」約 500 px），由 `scripts/fetch_inat_photos.py` 下載，逐張記在 `material/raw/inat/manifest.json`（樹種、學名、照片與觀察編號、攝影者、授權、原始網址、下載日期）。**只收 CC0 與 CC BY 授權的照片**（不收 CC BY-NC、BY-SA、ND 與保留所有權利）；`photo_license` 篩選只代表觀察「至少有一張」符合，所以腳本逐張檢查照片自己的 `license_code`。每位攝影者在同一樹種最多一張，優先取台灣（place 7887）的研究級觀察、依票數排序，台灣不足 4 張才從其他地區補（`manifest` 的 `scope` 欄位記錄）。照片版權屬各攝影者；畫面上每張照片都標「© 攝影者, CC BY」或「CC0 攝影者」、授權條款連結與 iNaturalist 原始觀察連結。資料裡只有中文樹種名，學名對照是手動整理在腳本裡的，所以樹的頁面上標明「這個樹種的照片，不是這一棵樹」。API 回應的快取（`material/raw/inat/_cache/`）不進版控。

**樹牌 QR Code**：公園處樹牌上的 QR Code 內容為 `http://trees.gov.taipei/show/?treeid=<樹籍編號>`（以實拍樹牌 `SL0560111023` 解碼確認，照片在 `material/samples/`）。`treeid` 就是上表樹木資料的 `TreeID`，所以掃到樹牌就能查到這棵樹的座標、樹種、樹高與胸徑。

### 處理後的資料（由真實資料推算）

| 檔案 | 內容 | 產生方式 |
|---|---|---|
| `material/processed/treepits_merged.geojson` | 兩份樹穴合併，57,548 個；`has_tree: false` 為候選空樹穴 | `scripts/merge_treepits.py` |
| `material/processed/parks_osm_match.csv`、`parks_boundary.geojson` | 公園處 813 座公園對上 OSM 範圍，622 座有範圍 | `scripts/match_parks_osm.py` |
| `public/data/` | 網頁用的樹木點位（向量圖磚）、樹籍查詢表、空樹穴、行政區與樹種統計 | `scripts/build_web_data.py`，見 [01-data-pipeline](docs/specs/01-data-pipeline.md) |
| `public/data/taipei-outline.json` | 集章冊示意地圖的背景：台北市輪廓、12 區界、鄰近的新北與基隆（已投影成 SVG 路徑，約 11 KB）；OSM 資料，© OpenStreetMap contributors（ODbL），畫面上有出處 | `scripts/build_admin_outline.py` |
| `public/data/protected-trees.json` | 受保護樹木對上公園處 TreeID 的清單：3,874 棵中 1,161 棵對到（同樹種 8 m 內 1,064、其餘 3 m 內不論樹種 97），2,713 棵沒對到（多在學校、寺廟、私人土地，沒有公園處樹牌）；約 115 KB；打卡的基礎光點由 10 變 20，樹的頁面標「受保護樹木」。是位置比對的推測，不是官方對照；出處標臺北市政府文化局（政府資料開放授權條款第 1 版） | `scripts/build_protected_trees.py`，見 [08 §1](docs/specs/08-extensions.md) |
| `public/data/villages/<前綴>.json` | 臺北市 456 個里的界線（WGS84，簡化約 12 公尺）與每里的樹木總數（以樹木座標落在哪個里計；51 棵落在所有里之外，不計入），每區一個檔案（11～72 KB）；里界來自內政部國土測繪中心，畫面出處需標明 | `scripts/build_villages.py`，見 [08-extensions §10](docs/specs/08-extensions.md) |
| `public/data/roads/<前綴>.json` | 步行路網（怎麼走、集章冊里路線）：每區一個檔案（93～302 KB），OSM 具名道路（去掉快速道路與高架、不能走的），路口與路的盡頭為節點、邊帶長度與中間座標，每區外擴 300 公尺；**只含具名道路，小巷可能沒有**；© OpenStreetMap contributors（ODbL） | `scripts/build_road_graph.py`，見 [02-map](docs/specs/02-map.md)「怎麼走」 |
| `public/data/species-photos/` | 樹種照片的網頁版：最長邊 640 px、JPEG 品質 80、去掉 EXIF（含 GPS），共約 9.9 MB；`index.json` 記每張的攝影者、授權（只有 CC0 與 CC BY）、原始觀察連結；樹的頁面與圖鑑讀它 | `scripts/build_species_photos.py`（輸入 `material/raw/inat/`，見上方「真實開放資料」） |
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
| 樹況回報 | 同上；政府端預先放幾筆示範回報（`src/mock/reports.json`，用舊的兩類格式，讀取時換成新的五類） |
| 寂寞樹的「上次有人拜訪」 | 沒有全市拜訪資料；由樹籍編號當種子固定產生（約 22% 的樹是 30–120 天沒人去），光點紀錄標「（模擬）」，自己更近的拜訪優先（`src/features/game/visits.ts`） |
| 移樹紀錄與原因 | 逐年移除紀錄未完整開放 |
| 移樹前公告與意見數（`src/mock/notices.json`） | 市府目前沒有對外的移樹前公告；示範一筆 |
| 「以台北通登入」 | 仍是模擬畫面；真正的登入是匿名與 Google |
| Demo 模式的 GPS 位置 | 現場不在樹旁時，用 `?demo=1` 的模擬位置：預設站在示範樹旁，可以拖曳人物或按「走過去」移動；打卡仍依距離判斷 |
| 垃圾桶、路燈（DLC 預告） | 只放預告圖層 |
| 光點、商店購買（只賣虛擬造型與相框）、小芽造型、徽章 | 延伸功能示意，存在使用者自己的裝置（store） |
| 樹上住戶（昆蟲彩蛋：瓢蟲、獨角仙、蟬） | 不是真的昆蟲觀察；打卡成功時由「樹籍編號＋日期＋uid」當種子固定抽出（預設 15%，GM 可調），+3 光點，光點紀錄寫「樹上住戶：獨角仙（模擬）」，畫面與圖鑑標「模擬」；蟬只在 5～9 月；記錄存在 `inventory.insects`（`src/features/game/drops.ts`） |
| 打卡後的心情與森林的回應 | **心情是使用者自己選的真實輸入，不是模擬資料**（存在 `users/{uid}.mood`，見「隱私」）；森林的回應是依簡報 v20 p15 改寫的一句示意文字，沒有動畫與音效；簡報的「玩家的光與姿態」只留在資料裡備用、畫面不顯示；建議互動（冥想、環抱樹、呼吸）已從畫面拿掉，沒有做（`src/features/mood/mood.ts`） |
| 稀有配件「古木紋理頭飾」 | 掉落規則是我們定的示意（簡報 v17 第 19 頁的「稀有配件」）；受保護樹木名冊是真的，但「第一次打卡成功送一件」是模擬的遊戲規則；美術是佔位檔 |
| GM 後台的全市經濟數字、其他玩家與客訴（`src/mock/players.json`） | 沒有真實營運資料 |
| 發包商工單進度 | 沒有真實廠商，由後台畫面手動推進 |
| 承包廠商（綠野造園、蔭涼植栽、城市樹醫）與各自承包的行政區（`src/features/api/vendors.ts`） | 虛構的廠商，用來示範「廠商只看得到自己的工單」 |
| 開放 API／MCP 與 OAuth（`src/features/api/`） | 沒有伺服器，由瀏覽器裡的模擬閘道處理；API 用戶端、呼叫紀錄、token 只存在這台裝置；三個示範用戶端的 secret 公開 |
| 開放 API 的 `wishes.json` | 由 `src/mock/wishes.json` 產生的固定快照，檔案內標 `"mock": true` |

不使用任何真實個資；「市長，你給我聽好了」的資料不會用來反推陳情人身分。

## 隱私

- **樹洞**存在你自己的帳號底下，其他使用者讀不到。專案管理者在 Firebase console 技術上看得到。
- **樹況回報的備註**只有承辦人看得到；畫面提醒不要填個資。
- Firestore 不存 email 或姓名，只用匿名 uid。
- **打卡後的心情**是你自己的資料：只存最新一次的選擇與上次詢問的時間（`users/{uid}` 文件的 `mood` 欄位，本機模式存在這台裝置），不留歷史；**不顯示給其他使用者、不進政府端、不進 GM 統計、不進任何 API**。專案管理者在 Firebase console 技術上看得到（同樹洞）。可以隨時在「我的」清除；「刪除我的雲端資料並登出」也會一起刪掉。
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
uv run scripts/fetch_admin_osm.py  # 重新下載行政區界到 material/raw/osm/（Overpass 偶爾忙線，腳本會重試）
uv run scripts/build_admin_outline.py   # 產生 public/data/taipei-outline.json，順便做 --check
uv run scripts/fetch_villages.py   # 下載內政部村里界到 material/raw/village/village.zip（只在要更新時跑）
uv run scripts/build_villages.py   # 產生 public/data/villages/<前綴>.json（里界與每里樹數），順便做 --check
uv run scripts/build_road_graph.py # 產生 public/data/roads/<前綴>.json（步行路網，需要先有 villages），順便做 --check
uv run scripts/fetch_protected_trees.py   # 下載臺北市受保護樹木 CSV 到 material/raw/protected_trees/（只在要更新時跑）
uv run scripts/build_protected_trees.py   # 對上公園處 TreeID，產生 public/data/protected-trees.json，--check 檢查是否最新
uv run scripts/fetch_inat_photos.py   # 從 iNaturalist 下載樹種照片到 material/raw/inat/（只收 CC0 / CC BY；每秒 1 次請求，回應有快取；--check 離線檢查授權與張數）
uv run scripts/build_species_photos.py # 縮圖、去 EXIF，產生 public/data/species-photos/，順便做 --check
```

## 開發

```sh
npm install
npm run dev      # http://localhost:5173，加 ?demo=1 進 Demo 模式（可移動的模擬定位、可掃示範樹牌）
npm test
npm run test:rules   # 本機 Firestore + Auth emulator 跑規則測試與雲端 store 測試（tests/rules、tests/cloud；brew install openjdk）
cp .env.example .env.local   # 填入 6 個 VITE_FIREBASE_* 值；沒有這個檔就用 localStorage
npm run build    # 輸出 dist/，靜態網站
npm run deploy   # 建置並部署到 Cloudflare Pages（專案 whisper-trees，Ray Personal Account）
node scripts/make_placeholders.mjs   # 依 src/assets.ts 重新產生佔位美術與 docs/ui-assets.md
```

Firebase 設定與部署紀錄見 [docs/firebase-setup.md](docs/firebase-setup.md)。

美術目前都是佔位檔，交給設計的清單見 [docs/ui-assets.md](docs/ui-assets.md)。佔位檔畫面上**不寫任何標示文字**（公民看到的只是淡色框或一片葉子剪影；五隻動物沒有任何一個 emoji 是對的，所以各用一枚圓形徽章：柔和的底色加一個字，狗、石、鵲、鷺、甲）；地圖行動圈的圖示與微光、時空膠囊、新手禮的小圖示是程式裡的線條圖示（`src/components/icons.tsx`），不是佔位檔；網址帶 `?debug=1` 才改載入 `public/assets/ph-debug/` 的版本（多一行「id 佔位」「尺寸 佔位」，給設計與開發對照），`?debug=0` 關掉，同一個分頁內換頁維持。

比對規則（公園範圍、樹穴合併）見 [01-data-pipeline](docs/specs/01-data-pipeline.md)。
