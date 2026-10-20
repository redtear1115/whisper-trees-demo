# 08 延伸功能（主線之後的示意）

2026-10-19 決定：主線 Demo 能在 2 分鐘內走完後，再加上以下功能。**全部是前端可操作的示意**：同一個靜態站、資料存在 store（localStorage）、畫面標「模擬」。美術一律用佔位檔，清單見 [docs/ui-assets.md](../ui-assets.md)。

現場 2 分鐘 Demo 不走這些畫面；評審或票選民眾可以從底部導覽（首頁、集章冊、樹洞、我的）進去看；後台示範是獨立頁面 `/demo-control`（見 §11）。

## 設計原則（沿用 00 的語氣）

- 慢下來、無壓陪伴：**不做排行榜、連續登入、紅點催促、限時倒數**。
- 光點只能「在現場」或「幫城市」得到，不能用錢買。
- 光點的去處只有虛擬造型（團隊簡報 v20 p25，2026-10-20 決定）：商店只賣虛擬造型與相框，不換現金或實物，也不當捐款。

## 1. 光點經濟 `/me`（餘額在每個分頁右上角）

2026-10-20 使用者決定**對齊團隊簡報 v17**（第 19、23 頁）。仍是**示範用的模擬經濟**，每個數字都由 GM 調（§6）。純函式在 `src/features/game/points.ts`，發點與流水帳在 `ledger.ts`，參數在 `config.ts`。

| 行為 | 光點（預設） | 限制與說明 |
|---|---|---|
| 靠近一棵樹（打卡成功） | **+10** | 同一棵樹每天一次 |
| 遠觀模式打卡 | +5 | 同上；簡報沒有這條，沿用原本的值 |
| 同一棵樹的第 2、第 3 個互動 | **+2、+1**，之後不再增加 | 見下「互動怎麼算」 |
| 換一棵新的樹 | 重新 +10 | 每棵樹各算各的 |
| 日照加成 | 最高 **×1.5** | 倍率，取代原本固定 +2。日出到日落之間像一座小山：日出與日落 ×1，正午前後最高（台北 10 月中午約 ×1.5，上午 8 點約 ×1.3）；夜間 ×1 |
| 寂寞樹（30 天以上沒人拜訪） | **×2～×5** | 剛滿 30 天 ×2，之後每多 20 天 +1，上限 ×5（GM 可調）。「上次有人拜訪」**是模擬**，見下 |
| 受保護樹木 | 基礎 **20**（取代 10） | 只影響打卡成功（遠觀照舊 +5）。**名冊已接上（2026-10-20）**：臺北市受保護樹木比對到的 1,161 棵會觸發，見下 |
| 樹況回報 | **+15** | 固定點數，每棵樹每天一次，不受日照、寂寞樹影響。簡報的「社區複驗通過再 +5」**不做**（沒有複驗流程） |
| 許願 | +5 | 沿用 |
| 見縫插樹澆水支持 | **+3** | 每個願每天一次（本來就有的限制）；原本是 +2 |
| 每日第 11 棵樹起 | 打卡光點**減半** | 一天裡不同的樹，從第 11 棵起打卡（含遠觀）×0.5，避免整天專門刷；隔天重算。只減打卡，後續互動照舊 |

**互動怎麼算（我們的定義）**：同一棵樹同一天，**打卡（含遠觀）、留樹洞、樹況回報**各算一個互動，依發生順序是第 1、2、3 個；第 1 個拿基礎點（打卡 +10），第 2、3 個拿 +2、+1，第 4 個起不發。**樹況回報固定 +15**，不管它是第幾個，但仍佔一格。**澆水不算**（澆的是願望，不是這棵樹）；許願也不算。樹洞不是「靠近一棵樹」，最多算第 2 個互動（沒打卡就留樹洞的邊角情形）。例：打卡（+10）→ 留樹洞（+2）→ 回報（+15）；打卡 → 回報 → 樹洞（+1）。

**倍率乘在哪**：日照與寂寞樹倍率乘在「打卡與後續互動」的點數上（10、+2、+1），不乘回報、許願、澆水。全域倍率與活動倍率乘在所有光點上。算法：`round(基礎 × 全域 × 活動 × 寂寞樹 × 日照 × 減半)`。

**寂寞樹的「上次有人拜訪」（模擬）**：我們沒有全市的拜訪資料，所以由樹籍編號當種子固定算出「幾天沒人來」（`src/features/game/visits.ts`）：約 22% 的樹落在 30–120 天（寂寞樹），其餘 1–29 天；同一棵樹永遠得到同一個數字。使用者自己在**今天以前**去過、而且比模擬的更近，就用自己的那一次（今天的打卡不算，不然永遠不寂寞）。光點紀錄一律標「（模擬）」。例：示範樹 `DA0030211045` 是 60 天 → ×4。

**受保護樹木（2026-10-20 接上名冊）**：公園處開放資料本身沒有受保護樹木的欄位（`RegionRemark` 只有方位與「安全島」），名冊是另一份資料：[臺北市受保護樹木](https://data.gov.tw/dataset/121274)（臺北市政府文化局，政府資料開放授權條款第 1 版，CSV 3,874 筆，UTF-8 含 BOM、WGS84 經緯度只有 4 位小數，約 11 m；欄位有樹木編號、樹種名稱、學名、胸徑、地址、管理單位）。`scripts/fetch_protected_trees.py` 從 data.gov.tw API 找 CSV 連結並下載到 `material/raw/protected_trees/`（同目錄 `source.json` 記連結與日期）。
- **比對方式**（`scripts/build_protected_trees.py`）：名冊沒有公園處的 TreeID，所以依位置對：座標轉成 TWD97 後，①同樹種（名稱正規化：去掉括號、「台」→「臺」，另有 榕→榕樹、樟→樟樹、垂葉榕→垂榕）8 m 內最近的公園處樹木，`match: "species"`；②剩下的，3 m 內最近、不論樹種，`match: "near"`（不確定度較高，已標記）。兩輪都由近到遠一對一：一棵受保護樹木最多對到一個 TreeID，一個 TreeID 也最多被一棵用掉；TreeID 整串比對（含 `-001` 後綴）。8 m 是因為名冊座標四捨五入到 4 位小數，最多差約 7 m。
- **結果**：3,874 棵中比對到 1,161 棵（species 1,064、near 97），2,713 棵沒對到——多半在學校、寺廟、私人土地，公園處沒有掛牌（名冊 `地理位置名稱` 為學校 578、私有住宅 168 等）。輸出 `public/data/protected-trees.json`（約 115 KB，`{attribution, source, generated, method, trees: [{treeId, protectedNo, species, distanceM, match}]}`）；`--check` 重算並比對。
- **前端**：`src/features/game/protectedTrees.ts` 啟動時讀一次（`main.tsx`），`isProtectedTree(id)` 同步查、沒讀到前回 false；掃樹牌發光點前會 `await loadProtectedTrees()`，剛開 App 就掃也算得到。樹的頁面對受保護樹木顯示綠色小標籤「受保護樹木」（[04](04-tree-page.md)）。光點紀錄寫「受保護樹木 基礎 20」。
- **限制**：位置比對是推測，不是官方對照；同一排緊鄰的同種樹可能對錯一棵。簡報提到的稀有配件掉落**已做最小版**，見下「打卡的小驚喜」。

**打卡的小驚喜（2026-10-20，簡報 v17 第 14、19、20 頁的最小版）**：打卡成功後，樹的頁面標題圖下方安靜地出現一到兩張卡（`DropCards`），沒有倒數、沒有催促。邏輯在 `src/features/game/drops.ts`，由掃樹牌頁在發完打卡光點後呼叫，結果隨路由 state 帶到樹的頁面（只顯示這一次；離開再回來就沒有了）。
- **稀有配件「古木紋理頭飾」**（`hat-ancient`，佔位美術 `item-hat-ancient`）：**第一次**在受保護樹木（`isProtectedTree`）打卡**成功**時掉落，**每個使用者一次、不是每棵樹一次**；遠觀不給（也不會用掉「第一次」），名冊還沒讀到時當一般樹。卡片寫「這棵受保護的老樹送你一件古木紋理頭飾」，附連到 `/me` 的連結。它放進 `inventory.owned`（和商店買的造型同一處），不在商店賣、不能用光點買，也不受 GM 的商店設定影響（定義在 `config.ts` 的 `RARE_ITEMS`）；我的「換裝」和商店造型一樣可以穿，並多一行「稀有・受保護樹木」說明。
- **樹上住戶（昆蟲彩蛋，模擬）**：打卡成功、而且是**這棵樹今天第一次打卡成功**時，有 **15%**（GM 可調）的機率跳出瓢蟲、獨角仙或蟬其中一隻，卡片寫「樹上有一隻獨角仙探出頭」（沒有音效，簡報的「以叫聲回應」不做）。出現時：①加 **+3 光點**（GM 可調；乘全域與活動倍率，不乘日照與寂寞樹），獨立一筆光點紀錄「樹上住戶：獨角仙（模擬）」，key 是 `insect:<樹籍編號>:<日期>`，連到那棵樹、也算進該區的光點歷史；②記進圖鑑的「樹上住戶」（§3）。遠觀不抽；同一棵樹同一天重掃（不是第一次）不抽，所以不會重領。
- **抽籤是決定性的**：種子是 `樹籍編號:台北日期:uid`（本機模式沒有 uid 就用 `local`），`hashString`（FNV-1a）取 10,000 分之一的精度，低於機率就出現，再用另一個雜湊從當天出得來的昆蟲裡挑一隻。同一棵樹、同一天、同一個使用者永遠同一個結果，重新整理不會重抽；機率 0 一定沒有、1 一定有。**蟬只在 5～9 月出現**（台北日曆月），其他月份從瓢蟲與獨角仙挑；瓢蟲與獨角仙全年。
- **儲存**：沒有新的欄位。稀有配件在 `ext.inventory.owned`；昆蟲第一次遇見的紀錄在 `ext.inventory.insects`（`{ <昆蟲 id>: { treeId, at } }`，每種只留第一次），雲端就是 `users/{uid}.inventory` 這個 map 的欄位，`firestore.rules` 對 `users/{uid}` 只限本人讀寫，**不需要改規則**；本機轉雲端（`migrate.ts`）會合併 `insects`，同一種昆蟲留較早遇見的那次。光點在 `ext.ledger`。
- 整個昆蟲機制是**模擬**：卡片、圖鑑區塊與光點紀錄都標「模擬」，README 的模擬資料表有列；它不是真的昆蟲觀察。

**光點紀錄的原因**：每一筆寫明用了哪些規則，例如「打卡成功・寂寞樹 ×3（模擬）・日照 ×1.5」「留樹洞・同一棵樹第 2 個互動」「打卡成功・今天第 11 棵起減半」「樹況回報」；有活動時最後加活動名稱。舊的流水帳（有單獨的「日照加成」`sun` 紀錄）照舊顯示與歸區，不改寫。

**簡報有、這版不做**：樹況回報的社區複驗 +5；許願的樹長成大樹由澆水的市民平分 10,000 光點；樹木成長累積徽章每級距 +300；領養樹木（小額捐款）。

- 打卡成功時樹的頁面顯示「光點 +N」小動畫（04 的 P1）。
- 光點紀錄（流水帳）在 `/me` 可以看到。

## 2. 商店 `/shop`

**只賣虛擬造型**（團隊簡報 v20 p25，2026-10-20 決定；原本的「回到城市」捐款與認養澆水袋已拿掉）。兩類商品，只改外觀：

- **造型**（五種動物都能穿戴，也穿在小芽身上）：橡實帽 `hat-acorn`（30，也是新手禮）、花冠羽毛 `crown-feather`（50）、苔蘚斗篷 `cape-moss`（80）。商店的造型名稱依簡報 v20 p25（舊的草帽、落葉圍巾、螢火提燈改名）。另有**稀有配件**（古木紋理頭飾）：不在商店賣、不能買，只能在受保護樹木第一次打卡成功時掉落（見 §1「打卡的小驚喜」）；它在 `/me` 的「換裝」和商店買的造型放在一起，多一行「稀有・受保護樹木」。
- **樹的頁面相框**：春櫻 `frame-spring`、秋楓 `frame-autumn`（各 40）。

商品、價格、上下架由 GM 後台管理。

**舊資料相容**（2026-10-20）：簡報 v20 前的造型 id 讀取時對應到新的，舊使用者保有原本的東西：`hat-straw`（草帽）→ `hat-acorn`、`scarf-leaf`（落葉圍巾）→ `crown-feather`、`lantern`（螢火提燈）→ `cape-moss`。對應發生在 `inventory()` 的 owned／equipped 與 GM 存過的商品清單（`config.ts` 的 `LEGACY_ITEM_ID`，不改寫已存的資料）；只對這三個 id，稀有的 `hat-ancient` 與相框不動。舊的 `inventory.civic`（捐款次數）與 GM 存的 civic 商品（`fund-10`、`water-bag`）只讀不寫：資料原樣留著、不會當機、畫面不顯示，新的購買也不再寫入。

## 3. 圖鑑（集章冊「探索」區的下半部；`/explore`、`/codex` 轉址到 `/stamps?tab=explore`，2026-10-20 起探索併進集章冊）

- 列出台北數量最多的樹種（真實資料：`public/data/species.json`，由 `build_web_data.py` 產生），每種顯示全市棵數。
- 在那個樹種的樹打卡過，就「收集」到，顯示第一次遇見的日期與樹籍編號。
- 沒收集到的顯示剪影（佔位圖），不催促。
- **樹種照片（2026-10-20）**：收集到的樹種，卡片縮圖改用該樹種的第一張照片（下緣標攝影者與授權），點縮圖開一個小視窗，裡面是 `PhotoCarousel` 輪播（樹的頁面則每棵樹固定一張，見 [04](04-tree-page.md)「樹種照片」）；Esc 或「關上」收起。沒收集到的仍是剪影，不顯示照片。目前涵蓋最常見的 40 種，其餘樹種維持佔位圖。
- **樹上住戶（2026-10-20，模擬）**：樹的圖鑑下方多一區「樹上住戶」（標「模擬」），三格：瓢蟲、獨角仙、蟬。還沒遇見的是虛線剪影（寫「還沒遇見」，區塊標題下一行說「還沒有遇見，不用急」）；遇見的顯示「第一次遇見」的日期與「看這棵樹」連結（第一次遇見的那棵）。資料來自 `inventory.insects`，抽籤與光點規則見 §1「打卡的小驚喜」。打卡後卡片的「看圖鑑」連到 `/stamps?tab=explore#insects`。簡報的鳥、松鼠、猴子**不做**。
- **照片授權規則（不可放寬）**：只用 iNaturalist，只收 **CC0 與 CC BY**；每張照片自己的 `license_code` 要是這兩種（觀察的授權不算）；每種 4～6 張、每位攝影者一張；畫面上每張都標攝影者、授權、原始觀察連結。`uv run scripts/fetch_inat_photos.py --check` 與 `build_species_photos.py --check` 會檢查這些條件。

## 4. 成長徽章 `/me`

共 12 枚，依自己的紀錄計算，不需要另存：第一次打卡、認識 3／10 種樹、遠觀者（安全島樹）、時空膠囊（同一棵樹回來第二次）、許願者、澆水 10 次、夜行者（夜間打卡）、樹的守望者（樹況回報）。

**顯示（2026-10-20）**：`/me` 的徽章區收合時標題下一行就說為什麼：還沒有就「做到一件小事就會亮起，不用急」，只有一枚就「第一道光：你收集了第一個光點」，多枚列前兩枚名字加「…」（純函式 `badgeSummary`，每枚有過去式的 `note`，在 `badges.ts`）。展開後一枚一列（左圖右字）：得到的寫 `note`（你做了什麼），沒得到的寫「還沒得到・」加提示。

新手引導帶來 3 枚（細節見 §9）：

| 徽章 | 條件 | 怎麼算 |
|---|---|---|
| 第一道光 `first-light` | 第一次收集到光點 | 存下來的流水帳有一筆「正數且帶 key」的紀錄（只有 `award()` 會寫）。**不看合併 GM 補發的 `ledger()`**，GM 補發不算 |
| 回家的路 `home-screen` | 從手機桌面的圖示打開曦語 | **需要另存**：`onboarding.homeScreenAt`（上面「不需要另存」對這一枚不成立，因為「從桌面圖示打開」無法由其他紀錄推算） |
| 城市的新朋友 `newcomer` | 完成新手任務 | 4 項任務都完成（由紀錄與旗標推算） |

## 5. 角色養成「小芽」 `/me`

- 2026-10-20 依團隊簡報 v20 p14 改版：小芽就是簡報的**樹精**，從 5 階改成 3 階，階段名是樹精的名字，角色名仍叫「小芽」。依**累計獲得**的光點長大（花掉不會變小），**不看真實樹齡**：初心樹精 0 → 茁壯樹精 100 → 智慧老樹精 300（原 5 階門檻 0／30／100／250／500；新門檻約是 8 次與 25 次打卡）。單一來源 `STAGES`（`character.ts`）。
- 佔位美術 `sprout-0`～`sprout-2`（2.5D 蠟筆風，同一個角色由小到老）。
- 可以穿戴商店買的造型。
- **文案（2026-10-20 決定，批評修正 P）**：小芽是陪你的動物種出來的植物，文案只往前看、不講「還差多少」：不寫「再 N 光點長成…」。初心樹精階段、0 光點「還是剛醒來的初心樹精。收集到第一道光，牠就會慢慢長大。」；其餘「一路收集了 N 光點，小芽正慢慢長向「茁壯樹精」。」；最後一階「小芽已經長成智慧老樹精了，謝謝你一路陪著牠。」；小字「光點花掉了，小芽也不會變小。」**只對手上還有光點、或花過光點（流水帳有扣點紀錄，買過東西）的人顯示**（`shouldReassureSpend`；2026-10-20 第三輪 B：0 光點又沒買過東西的人看到會困惑），否則沒有小字。純函式 `growthCopy(earned)`（`src/features/game/character.ts`）回傳 headline／line／note／percent／valuetext（第二個參數 `spendNote` 決定要不要放那句小字，預設不放），有單元測試（含「不出現再 N 光點、還差」、安心話只在被要求時出現）。
- 進度條是 `role="progressbar"`（`aria-valuemin=0`、`aria-valuemax=100`、`aria-valuenow` = 這一階段走了幾 %、`aria-valuetext` 例如「小芽是初心樹精，正長向茁壯樹精，已走了 14%」）。

## 6. 遊戲營運後台（GM） `/gm`

- 光點規則（2026-10-20）：基礎點數（打卡、遠觀、樹況回報、許願、澆水）、同一棵樹第 2／3 個互動、每天第幾棵起減半、日照最高倍率、寂寞樹（門檻天數、最低與最高倍率、每多幾天加 ×1）、受保護樹木基礎、全域倍率；每項下面有一行說明（受保護樹木註明只用在名冊比對到的樹）。另有**樹上住戶（昆蟲彩蛋，模擬）**兩項：出現機率（%，預設 15，0 = 不出現、100 = 每棵樹今天第一次打卡成功都出現）與額外光點（預設 3，0 = 只進圖鑑、不發光點）；欄位是 `insectChance`（0～1）、`insectBonus`。稀有配件沒有 GM 參數（固定：每人一件）。另有**打卡後問心情的間隔**（小時，`moodIntervalHours`，預設 8，範圍 0～168，0 = 每次打卡都問）：打卡成功或遠觀之後問「現在的心情？」的最短間隔，選了或略過都從那一刻起算（規則見 [04](04-tree-page.md)「打卡後的心情」）；欄位放在「倍率」表的樹上住戶兩項旁邊（同樣是打卡後的小互動），說明寫「選心情沒有光點，心情只有玩家自己看得到」。GM 只能調間隔，看不到任何人的心情。資料結構與預設值見 `src/features/game/config.ts`，舊的 GM 設定（有 `points.sun`／`points.whisper`）會被忽略。
- 活動：名稱、期間、倍率（例如「植樹節雙倍光點」）。期間內市民端顯示活動橫幅。
- 商店：價格、上下架。
- 經濟概況（模擬）：本週發出／回收的光點（捐款統計已隨「回到城市」拿掉）。
- 玩家查詢與客服：模擬玩家與客訴（GPS 漂移、樹牌被遮住、異常速度），可以補發光點給這台裝置，原因必填並寫進玩家的光點紀錄。
- 頁首標「示範：營運人員視角」。改動寫回 store，市民端分頁即時更新。

## 7. 對外開放 API 與 MCP `/developers`

2026-10-19 決定做法，2026-10-20 改成 OAuth 2.0 並補上角色、用戶端管理與 MCP。目的：**政府端（公園處既有系統）與承包廠商不用進我們的網站，直接呼叫 API 讀寫**，不是給大眾下載資料。

- **層級：文件＋前端模擬**。沒有伺服器；`https://whisper-trees.pages.dev/api/v1/…`、`/oauth/token`、`/mcp` 都只是示意網址。`/developers` 的試打與 MCP 試用由瀏覽器裡的模擬閘道處理（`src/features/api/`），畫面標「模擬」。`/developers` 是桌機工具，不在 `MobileOnly` 裡，360 px 仍可讀。
- **範圍：讀寫全部**。寫入走和畫面同一組 store 函式（`setWishStatus`、`saveOrder` 經 `advance`、回報處理），所以 `/gov`、`/vendor`、市民端「我的許願」即時更新。
- **授權：OAuth 2.0 client credentials**（取代原本的 API key）。

### 驗證流程

1. `POST /oauth/token`，`grant_type=client_credentials`，用戶端用 HTTP Basic 或表單欄位 `client_id`／`client_secret` 驗證，`scope` 選填（空白分隔，不填 = 該用戶端的全部）。回 `{ access_token, token_type: "Bearer", expires_in: 3600, scope }`。
2. 呼叫 API：`Authorization: Bearer <access_token>`。token 1 小時過期，沒有 refresh token。
3. 錯誤依 RFC 6749／6750，格式 `{ error, error_description }`：token 端點 `invalid_request`／`unsupported_grant_type`／`invalid_scope`（400）、`invalid_client`（401，client 錯或已撤銷）；API `invalid_token`（401，附 `WWW-Authenticate: Bearer error="invalid_token"`，含過期、不存在、用戶端已撤銷）、沒帶 token 的 401（`WWW-Authenticate` 不含 error）、`insufficient_scope`（403，`WWW-Authenticate` 的 `scope` 列出需要的 scope）。另有 404 `not_found`、405、409 `invalid_state`（工單狀態不能這樣推進）、422 `validation_failed`（有 `field`）。

### 角色與 scope

scope 清單只定義在 `src/features/api/scopes.ts`，API 與 MCP 都引用它（有單元測試）。

| 角色 | scope | 能做什麼 |
|---|---|---|
| 政府系統 | `hotspots:read` `priorities:read` `cases:read` `cases:write` `reports:read` `reports:write` `workorders:read` `workorders:write` | 讀熱點、優先分數、案件、回報、全部工單；改案件狀態、處理回報、推進任何工單 |
| 廠商（綁定一家廠商 id） | `workorders:own:read` `workorders:own:write` | 只看得到指派給自己廠商的工單；接單、開始施工、完工回報；其他端點一律 403。別家廠商的工單回 404（不透露存在） |

政府系統用戶端不能持有廠商 scope，反之亦然。工單的廠商由行政區決定（模擬：綠野造園＝中正、大同、中山、松山；蔭涼植栽＝大安、信義、萬華、士林；城市樹醫＝文山、內湖、南港、北投，見 `vendors.ts`）。

### 端點（v1）

列表回 `{ data, meta: { total, limit, offset } }`，支援 `limit`（1–200，預設 50）、`offset`；時間 ISO 8601（UTC）。欄位與範例回應見 `/developers`「端點」，單一來源 `src/features/api/docs.ts`。

| 端點 | scope（擇一） | 說明 |
|---|---|---|
| `GET /api/v1/hotspots` | `hotspots:read` | 依路段彙整未結案許願，依澆水數排序；`district` 篩選 |
| `GET /api/v1/priorities` | `priorities:read` | 優先分數排行；權重用 `demand`、`shade`、`feasibility`、`fairness`（0–100，預設各 25，回應 `meta.weights` 為換算後的比例）、`include_closed`；算法同 [06](06-gov-console.md) |
| `GET /api/v1/cases`、`GET /api/v1/cases/{id}` | `cases:read` | 案件（許願）；`status`、`district` 篩選；明細含狀態歷程與預設權重的分數 |
| `PATCH /api/v1/cases/{id}` | `cases:write` | `{ status, reason }`；`rejected` 沒填 `reason` 回 422 |
| `GET /api/v1/reports` | `reports:read` | 樹況回報（含備註）；`kind`（五類 id 之一，其他值回 400）、`district` 篩選。舊資料讀取時換成新的五類 |
| `PATCH /api/v1/reports/{id}` | `reports:write` | `{ status: open｜acknowledged｜dismissed, reason }`；`dismissed` 必填 `reason`；`/gov` 的回報清單會顯示「已受理／已駁回」 |
| `GET /api/v1/work-orders` | `workorders:read` 或 `workorders:own:read` | 補種工單（案件「可種・已排程」或已有工單紀錄）與養護工單（每筆樹況回報）；狀態 `pending`／`accepted`／`in_progress`／`done`；`status`、`type` 篩選。id 形如 `wo_wish_<案件id>`、`wo_report_<回報id>` |
| `POST /api/v1/work-orders/{id}/accept｜progress｜complete` | `workorders:write` 或 `workorders:own:write` | 接單 → 開始施工 → 完工（body 可帶 `note`）；狀態不對回 409；補種工單完工後案件同一次改成「已種植」 |

### 用戶端管理

- **承辦人在 `/gov`「API 用戶端」建立**：名稱、類型（政府系統／廠商，廠商要選哪一家）、scope（依類型預設全勾，可取消勾選，不能超出該類型）。`client_secret` **只顯示一次**（附複製鈕），也在「重新產生」時顯示一次；系統只存 **SHA-256（`crypto.subtle`）與最後 4 碼**。可重新產生（舊 secret 立刻失效）、撤銷（該用戶端的 token 立刻失效）。清單顯示建立時間、最近使用、狀態。
- **廠商在 `/vendor`「我的 API 用戶端」**：只讀，看發給自己廠商的用戶端：`client_id`、scope、狀態、最近呼叫；沒有 secret（`/vendor` 沒有登入，用頁面上的「目前廠商身分（模擬）」選單切換）。
- 內建三個**示範用戶端**（`wt-demo-gov`、`wt-demo-vendor-green`、`wt-demo-vendor-cool`），secret 公開寫在 `/developers`，給試打用，不能撤銷。
- **存放**：store 的 `ext` 三個 key：`apiClients`（用戶端）、`apiLog`（最近 100 筆呼叫紀錄與各用戶端最近使用時間，模擬的使用紀錄）、`reportReviews`（回報處理狀態）。本機模式存在 localStorage；**雲端模式這三個 key 只寫本機覆寫層（`overlay.ext`），不管是不是承辦人都不進 Firestore，沒有改 `firestore.rules`**（模擬用，其他裝置看不到）。API 呼叫造成的案件／工單改動仍照原本規則：承辦人（白名單）寫雲端，其他人只寫本機覆寫層。
- access token 只存在記憶體（`TokenStore`），重新整理頁面就失效。

### `/developers` 頁

概覽（流程：用戶端 → token → API）、驗證（token 請求 curl、示範用戶端、錯誤表）、端點（每個端點的 scope、參數、curl、範例回應）、**試打 console**（輸入或挑示範用戶端 → 取得 token → 選端點或自己改方法與路徑 → 送出，顯示 curl 等價式、狀態碼、標頭與 JSON；「快轉 1 小時」可以看 token 過期）、MCP、開放資料下載。全部標「模擬」。

### MCP（文件＋模擬）

- MCP server 的網址是 `https://whisper-trees.pages.dev/mcp`（Streamable HTTP）。**示意，並沒有真的服務**；`/developers` 的「MCP 試用」用同一個模擬閘道跑 JSON-RPC（`initialize`、`notifications/initialized`、`ping`、`tools/list`、`tools/call`）。
- 授權與 REST 相同：`Authorization: Bearer <access_token>`。`tools/list` 只列出 token 的 scope 用得到的工具（政府 token 8 個，廠商 token 只有 `list_work_orders`、`update_work_order`）；呼叫沒權限的工具回「Unknown tool」（-32602），不透露它存在。`tools/call` 轉成對應的 REST 請求，權限與廠商篩選的邏輯因此完全一致；錯誤回 `isError: true`。
- 工具（各附 JSON Schema，見 `src/features/api/mcp.ts`）：`list_hotspots`、`get_priorities`、`list_cases`、`update_case_status`、`list_reports`、`update_report`、`list_work_orders`、`update_work_order`（`action`: accept｜progress｜complete）。
- 文件頁附 Claude Code（`.mcp.json`，`type: http`＋`headers`）、Claude Desktop（`mcp-remote`）與一般 HTTP MCP 用戶端的設定範例。

### 程式結構（`src/features/api/`）

`scopes.ts`（scope 與角色）、`secret.ts`／`clients.ts`（secret 產生與雜湊、用戶端生命週期、內建示範用戶端）、`tokens.ts`（簽發與過期）、`gateway.ts`（token 端點、Bearer 驗證、路由、錯誤）、`resources.ts`（資料轉成 API 形狀、優先分數、熱點、工單）、`mcp.ts`（工具與 JSON-RPC）、`clientStore.ts`／`runtime.ts`（接 store 的單例）、`docs.ts`、`Playground.tsx`、`ClientSections.tsx`。純邏輯都在不碰 store 的模組裡，用 `DataSource` 介面注入資料，`__tests__/` 有單元測試（含錯誤 secret、過期 token、缺 scope、廠商動別家工單、已撤銷用戶端）。

以下靜態 JSON 保留為「開放資料下載」：

- 靜態 JSON，由 `build_web_data.py` 產生。大檔不重複放，直接用網站的 `public/data/`：
  - `/api/v1/index.json`：端點清單與授權
  - `/data/trees/{前綴}.json`：樹籍查詢（與網站共用格式）
  - `/data/pits-empty.geojson`：候選空樹穴
  - `/api/v1/districts.json`：行政區統計
  - `/api/v1/species.json`：樹種統計
  - `/api/v1/wishes.json`：許願與補種進度（**模擬**快照，檔內 `"mock": true`）
- `/developers`「開放資料下載」列出這些檔案、欄位與範例，可以在頁面上直接試打（免授權）。
- 授權：真實資料沿用政府資料開放授權條款；OSM 衍生資料 ODbL。

## 8. 發包商後台 `/vendor`

- 給植栽／養護廠商。政府端把案件改成「可種・已排程」，就出現在工單列表。
- 工單：接單 → 施工中 → 完工回報（可附照片，只在本機預覽、不上傳）。完工後案件狀態變「已種植」，市民端即時更新。
- 樹況回報（04，五類）也會變成養護工單，說明裡寫類別（舊回報的細項放括號）；工單與 API 的 `kind` 是新的五個 id（`pruning`、`pest`、`shade`、`sprout`、`other`），`kind_label` 是畫面文字。
- 工單依行政區對應到承包廠商（模擬，見 §7），工單上標「承包：○○」。
- 「我的 API 用戶端」：看承辦人發給這家廠商的 OAuth 用戶端（client_id、scope、狀態、最近呼叫），**沒有 secret**；用戶端用 API 接單、施工、完工的規則見 §7。以「目前廠商身分（模擬）」選單切換廠商。
- 頁首標「示範：廠商視角」；寫入限白名單帳號（同 [06](06-gov-console.md)）。

## 9. 新手引導 `/`、集章冊「探索」區（原 `/explore`）與 `/me`

2026-10-19 使用者決定，屬 P1 延伸功能（不擋主線）。分三個切片：S1 資料與徽章（已做）、S2 引導一的畫面與加入主畫面（已做，實機待測）、S3 新手任務卡（已做，實機待測）。

### 決定

- 「能量」就是現有的**光點**，不改名；「樹語」就是現有的**樹洞**。
- 引導可略過、不催促（沿用設計原則：不做紅點、連續登入、倒數）。
- **引導一「收集光點」**：使用者真的收集到光點一次（現場打卡，或 Demo 模式打卡）才算完成，得到「第一道光」。之後帶去加入手機主畫面，得到「回家的路」。
- **引導二「新手任務」**：任務清單，順序不拘；4 項都完成得到「城市的新朋友」。
- **新手禮**：完成引導一（拿到第一道光）送一頂橡實帽 `hat-acorn`（簡報 v20 前是草帽 `hat-straw`，見 §2 的舊 id 對應）。**不送光點**，所以「光點只能在現場或幫城市得到」的原則不變。
- **和打卡後的心情的先後（2026-10-20）**：第一次打卡後，樹的頁面同時有「第一道光」慶祝視窗與「現在的心情？」。慶祝視窗開著（或馬上要開）時心情卡先不出現，按「好」關掉後才出現；`OnboardingEffects` 的三種慶祝視窗（第一道光、回家的路、城市的新朋友）開關時設定 `setCelebrationOpen`，等的人用 `useCelebrationBlocking()`（`src/features/onboarding/celebrationGate.ts`）。引導停在第 3 步時慶祝在地圖頁的引導抽屜，不擋樹的頁面上的心情卡。見 [04](04-tree-page.md)。

### 任務（順序不拘）

| 任務 | 完成條件 | 連結 |
|---|---|---|
| 去商店換上新手禮，或買一件 | 小芽穿上了造型或相框（`inventory.equipped.outfit` 或 `.frame`） | `/shop` |
| 看看圖鑑與成就 | 看過圖鑑和 `/me` 的徽章區（`viewedCodexAt` 與 `viewedBadgesAt` 都有） | `/explore`、`/me` |
| 在樹洞留一句話 | 自己留過至少一則樹洞（示範的膠囊不算） | 樹的頁面 |
| 在空樹穴許願 | `myWishIds` 不是空的 | 地圖上的空樹穴 |

全新使用者不靠 GM 補發就能做完：換上新手禮不花光點，許願、樹洞、看圖鑑也都免費。

### 資料與新手禮的規則

- 旗標存在 `ext.onboarding`（雲端是 `users/{uid}.onboarding` 的 map 欄位；規則不用改，`users/{uid}` 本來就是本人可讀寫）：`animal`（陪你的動物，`'taiwan-dog' | 'leopard-cat' | 'blue-magpie' | 'malayan-night-heron' | 'pangolin'`，沒有或不認得就當 `taiwan-dog`；舊值 `night-heron` 算黑冠麻鷺、`squirrel`（赤腹松鼠已移除）算預設，只在讀取時對應；2026-10-19 加、2026-10-20 改五隻，同樣逐欄合併、不需改 `cloud.ts` 與 `firestore.rules`）、`tourStep`、`tourSub`（第 0 步的小步驟，2026-10-20；見下「引導一」）、`tourDismissedAt`、`homeScreenAt`、`viewedCodexAt`、`viewedBadgesAt`、`giftAt`、`tasksCollapsed`（收合任務卡）、`newcomerCelebratedAt`（A3 慶祝過）、`firstLightCelebratedAt`（A1 慶祝過）。
- 只能用 `patchOnboarding(partial)` 寫：以目前的值為底合併，雲端以 map 逐欄合併，所以不會蓋掉另一台裝置或舊快取寫的欄位。
- 新手禮**只記 `onboarding.giftAt`**。擁有權由 `inventory()` 推算（`giftAt` 有值就把 `hat-acorn` 算進 `owned`，不重複）；`buy('hat-acorn')` 回傳「已擁有」。換上橡實帽走原本的 `equip`，由使用者操作。**不會自動寫入 `ext.inventory` 或 `ext.ledger`**，光點與餘額都不動。
- 自動寫入（偵測從桌面圖示打開、送新手禮）要等**目前這個 uid 的使用者文件載入完成**（`userReady()`／`useUserReady()`）；換 uid（例如用 Google 登入切換）會重設，本機模式與退回本機時一律 ready。`grantStarterGift()` 在 ready 之前什麼都不做。

### 我的區（2026-10-20 使用者決定，第三輪 B）

- **資料**：`onboarding.homeDistrict` = 中文區名，和 `PREFIX_DISTRICT`／`TAIPEI_DISTRICTS` 一模一樣（如「大安區」）；`onboarding.homeDistrictChoice` = `'other'`（選了「其他」，由定位或亂數決定）或 `'pick'`（自己點選）。讀用 `homeDistrict(s?)`（不是 12 區之一的值回傳 undefined）；寫用 `patchOnboarding`。`onboarding` 本來就是雲端 `users/{uid}.onboarding` 的 map 欄位，**不需要改 `cloud.ts` 或 `firestore.rules`**。雲端是逐欄合併、欄位清不掉，所以從「其他」改成自己點選時寫 `'pick'`，不寫 undefined。
- **選擇器**（`DistrictPicker`，`src/features/onboarding/`；2026-10-20 第四輪 Y 重排）：由上到下是全寬的「用目前位置」（`district-here`）、12 區 3 欄 4 列的單選（每格 44 px 高，原生 radio，`district-option-<區名>`）、全寬虛線的「其他（不在台北市）」（`district-other`）；點了立刻存；有一個 `role="status"` 的說明（`district-note`）。360 px 沒有水平捲動。**12 區由北往南**（`DISTRICTS_NORTH_TO_SOUTH`，依村里界重心緯度；每列是同一緯度帶、由西往東讀）：北投 士林 內湖／大同 中山 松山／萬華 中正 大安／文山 信義 南港。最後一列的南港在東北邊（緯度比文山、信義高），放在右下角是為了讓每一列都由西往東；原本的 `TAIPEI_DISTRICTS` 順序（資料與集章冊用）不動。
- **「用目前位置」**（`resolveHereDistrict`，純函式）：問目前位置（Demo 模式用模擬位置、其他用 GPS）；在台北市內 → 選那一區（`homeDistrictChoice: 'pick'`），說「你現在在○○區。」；沒有位置（拒絕、逾時）→「沒有拿到你的位置。直接點一區，或選「其他」。」；在市界外 →「你現在不在台北市。直接點一區，或選「其他」。」**失敗不亂數挑、不存任何東西，選項都還開著。** Demo 的模擬位置在大安區，所以 Demo 按它會是大安區。
- **「其他」怎麼決定**（`resolveOtherDistrict`，純函式，rng 可注入）：問目前位置（Demo 模式用模擬位置、其他用 GPS）。位置在台北市內（`prefixAtAsync` → `PREFIX_DISTRICT`）→ 用那一區；沒有位置（拒絕、逾時）或在市界外 → 12 區亂數挑一區。**兩種都說同一句：「先從○○區開始集章，之後可以在「我的」換。」**（2026-10-20 第四輪 Y 改成講清楚用途；在 `/me` 內按的時候省掉「之後可以在「我的」換」，只說「先從○○區開始集章。」）Demo 的模擬位置預設在大安區的示範樹旁，所以 Demo 選「其他」會是大安區。
- **什麼時候有、什麼時候沒有**：只有在引導第 0 步的「你在哪一區？」選過、或在 `/me` 設過才有。略過／按「之後再說」的人、Demo 模式（引導不自動打開）、已過第 0 步的舊使用者，沒設就沒有 `homeDistrict`；用到的人（例如集章冊）要處理「沒有」。
- **在 `/me`**：頂部 hero 動物那一列下面有「我的區：大安區」（沒設是「我的區：還沒選」）與「換一區」（沒設是「選一區」）按鈕（`swap-district`，≥ 44 px，`aria-expanded`），展開同一個 `DistrictPicker`（含「用目前位置」與新順序）；「換一隻」保留。展開後選到的那一格會 `scrollIntoView({ block: 'nearest' })` 捲進來，格子與提示帶 `scroll-margin-bottom: nav 高 + 40 px`，不會被底部導覽或中間凸起的掃樹牌鈕蓋住（第四輪 Y；頁面本來就比 hero 長，所以用 scroll-margin 而不是在 hero 裡多塞一塊空白）。

### 引導一「收集光點」的畫面（S2）

地圖頁下方的小抽屜（`role="dialog"`、`aria-modal="false"`、`data-testid="tour-sheet"`、`data-step`），不擋地圖操作；開著時暫時收起地圖工具，點地圖上的樹或許願時抽屜讓位。步驟邏輯是純函式（`src/features/onboarding/tour.ts`），`tourStep` 存在 `onboarding`。**動物步驟編號是 0，其餘維持 1–4、5 = 走完**（不搬資料）。**第 0 步在畫面上拆成兩個小步驟（2026-10-20 第四輪 Y）：先選動物，再「你在哪一區？」，兩個都是 `tourStep = 0`，用 `onboarding.tourSub`（`'animal'` | `'district'`，沒有就是 `'animal'`）分**：「就牠了」寫 `tourSub: 'district'`；「好了，出發」與「先跳過」寫 `tourStep: 1`；第 1 步的「上一步」寫 `{ tourStep: 0, tourSub: 'district' }`；重看走完（或沒開始過）的人寫 `{ tourStep: 0, tourSub: 'animal' }`（雲端欄位清不掉，所以寫值不寫 undefined）。已存 `tourStep ≥ 1` 的人完全不受影響，舊版用戶端不認得 `tourSub`、會畫原本的第 0 步。進度點改 6 個（動物、區、光點是什麼、去掃樹牌、慶祝、加到主畫面；`tourPosition`）。已存的 `tourStep` 1–5 意思不變；沒存過步驟的新使用者從 0 開始（開著時補存 0）；已經在第 1 步以後的人不會被拉回選動物（得到預設穿山甲，可在 `/me` 換；也不會有「我的區」，要在 `/me` 設）；「新手引導」重看、或走完後重看，從 0 開始。進度點 6 個（`aria-label`「第 n 步，共 6 步」）：

| 步驟 | 內容 |
|---|---|
| 0a | **選一隻陪你的動物**（2026-10-19 加）：動物 5 選 1（2026-10-20 依團隊簡報 v20 p13 由 v17 的 4 隻改成 5 隻，順序：**臺灣黑狗〔預設，排第一〕**、石虎、臺灣藍鵲、黑冠麻鷺〔id `malayan-night-heron`〕、穿山甲；赤腹松鼠移除、夜鷺換成黑冠麻鷺，v17 時預設的穿山甲改排最後；個性見下表），佔位美術，點了立刻存、地圖上的人物立刻換（`AnimalPicker`，`data-testid="animal-picker"`、`animal-option-<id>`）。「就牠了」把目前的選擇存成 `onboarding.animal` 並進 0b；沒點過動物就是預設臺灣黑狗。「之後再說」收起整個引導。按鈕固定在抽屜底部（`tour-actions sticky`） |
| 0b | **你在哪一區？**（2026-10-20 加區，同日第四輪 Y 拆成獨立小步驟；`data-sub="district"`）：`DistrictPicker`（見下「我的區」：用目前位置、12 區由北往南、其他）。「好了，出發」（沒選區前 disabled）與「先跳過」都到第 1 步，**不選也可以**；這一步沒有「之後再說」（「先跳過」之後第 1 步就有）。標題下有一行說明「集章冊會先從這一區開始，之後可以在「我的」換。」（`district-why`，第四輪批評 4：說明為什麼要選）；底部按鈕列的下緣高過導覽中間的掃樹牌圓鈕 12 px 以上（`.tour-actions.sticky` 下方留白 20 → 46 px，所有步驟共用），「先跳過」「之後再說」不會貼到或蓋到圓鈕；12 區按鈕本來就是 3 欄、每格 ≥ 44 px 高（實測 360 px 寬 105×44），不用再放大。抽屜在這一步可以長到導覽上方 72 px（用不到地圖），**定位鈕、12 區、其他、提示、按鈕在 390×664 與 360×740 都不用捲動**（Playwright 量過：抽屜高 458 px、沒有 overflow，最低一個選項的底邊在固定按鈕列上方 4 px 以上）。之後可在 `/me` 頂部的「換一隻」「換一區」改 |
| 1 | 光點是什麼、怎麼得到：表格數值讀 GM 設定的 `gameConfig().points`（打卡、遠觀、樹洞、許願、澆水）。「下一步」 |
| 2 | 去掃樹牌 → `/scan`。「附近沒有樹牌？」說明 Demo 模式（`?demo=1`，已在 Demo 模式就改說明模擬定位） |
| 3 | 第一次拿到光點：慶祝徽章「第一道光」＋新手禮橡實帽（連到 `/me` 換上、`/shop`）。拿到第一道光就直接跳到這一步 |
| 4 | 加到主畫面：沒綁 Google 的先建議「用 Google 保留紀錄」（說明 iOS 主畫面 App 的儲存空間和 Safari 分開），再給說明。2026-10-20 改成三個可切換的分頁（`tour-install-tabs`）：「iPhone（Safari）」「iPhone（Chrome）」「Android」，預設打開偵測到的那一個（`defaultInstallGuide`；電腦與內建瀏覽器先開 iPhone Safari）。iPhone Safari：點下方「分享」（沒看到就先點「⋯」再點「分享」，iOS 26）→ 分享選單往上滑、往下找「加入主畫面」→ 右上角「新增」；iPhone Chrome：網址列右邊「分享」→「加入主畫面」→「新增」；Android Chrome 有 `beforeinstallprompt` 就給「安裝到主畫面」按鈕（`main.tsx` 一開始就接住事件），否則「⋮」→「加到主畫面／安裝應用程式」，另附三星瀏覽器一行。電腦上多一個網站的 QR Code（`tour-install-qr`），用手機掃了再照做。App 內建瀏覽器（LINE、Threads…）先提示改用 Safari／Chrome 開啟（見 [00](00-overview.md)「App 內建瀏覽器」）。「我加好了」走完 |

**陪你的動物（團隊簡報 v20 p13，2026-10-20）**：地圖上代表你的小動物，五隻，各有個性；單一來源 `src/features/avatar/animals.ts`，名稱用「臺」跟全站一致（簡報寫「台」）。個性目前只是選擇畫面的一句話（`/me` 頂部顯示目前這隻的那一句），動畫是 P2。

| id | 名稱 | 個性（一句話） |
|---|---|---|
| `taiwan-dog`（預設） | 臺灣黑狗 | 開朗樂天；鐮刀尾是招牌，開心時繞圈搖尾巴 |
| `leopard-cat` | 石虎 | 冷淡的觀察家；耳後白斑是招牌，安靜坐在樹下觀察四周 |
| `blue-magpie` | 臺灣藍鵲 | 火爆脾氣；看到人類侵入領域就飛過去巴頭 |
| `malayan-night-heron` | 黑冠麻鷺 | 呆萌的大笨鳥；常在草地上定格發呆、偶爾歪頭 |
| `pangolin` | 穿山甲 | 容易緊張；緊張時捲成球 |

- 舊值只在讀取時對應（`animalOf`），不改寫已存的資料：`night-heron` → `malayan-night-heron`、`squirrel` 與其他不認得的 → `taiwan-dog`。
- 沒做的：個性動畫（繞圈搖尾巴、巴頭、定格、捲球）；造型疊在動物上的美術（目前造型只疊在小芽身上，佔位清單的簡介已寫成「五種動物都能穿戴」）。

- **什麼時候開**：使用者文件已載入（`useUserReady()`，不然看不到有沒有按過「之後再說」）、沒按過「之後再說」、`tourStep` 未走完。還沒拿到第一道光的新使用者一開地圖就看到；**已拿到第一道光的人，只有「開始過」引導（`tourStep` 有存）才會接著看到第 3、4 步**，早就有光點、沒看過引導的人不會被打擾（要看可以從「我的」進）。開著時若 `tourStep` 還沒存，補存 0，讓「開始過」成立。**Demo 模式（`?demo=1`）不自動打開**（2026-10-19 決定：現場展示不多按），從「我的 → 設定與其他 →新手引導」打開過才顯示。
- **之後再說**：記 `tourDismissedAt`，之後不再自動出現。
- **第一道光的慶祝只一次**（2026-10-19 決定）：引導停在第 3 步時由引導畫；否則（按過「之後再說」、Demo 模式、早就有光點的舊使用者）由 `OnboardingEffects` 跳一次慶祝視窗，含新手禮與「到小芽換上」連結。兩種都記 `firstLightCelebratedAt`，不會重複（`firstLightCelebration`）。
- **「我的」的「新手引導」**（`/me` 的「設定與其他」）：把 `tourDismissedAt` 改成 `0`（雲端是逐欄合併，欄位寫 `undefined` 清不掉，所以用 0 表示沒收起），`tourStep` 維持原本停的步驟；已走完或沒開始過就從第 1 步。
- **新手禮**：`OnboardingEffects`（App 層級，不論在哪一頁）在 `userReady` 且有第一道光時呼叫 `grantStarterGift()`，所以在樹的頁面打卡完就送了，不必回地圖。
- **回家的路**：同一個 `OnboardingEffects` 偵測從桌面圖示打開（`matchMedia('(display-mode: standalone)')` 或 `navigator.standalone`），使用者文件載入後若沒有 `homeScreenAt` 就記下並跳出慶祝；換 uid（例如 standalone 內用 Google 登入）會重新檢查，所以 Google 帳號也會記到。`patchOnboarding` 合併寫，不洗掉其他旗標。
- **慶祝元件**（`Celebration`／`CelebrationDialog`）：徽章圖（`<Art id="badge-…">`）、名稱、一句話，輕輕發光（尊重減少動態），可按「好」或 Esc 收起；不加紅點、不計時。
- **PWA**：`public/manifest.webmanifest`（名稱「曦語 Whisper Trees」、短名「曦語」、`display: standalone`、主題色 `#3f7d4e`）、`index.html` 的 manifest／`apple-touch-icon`／`apple-mobile-web-app-capable`／`mobile-web-app-capable`／`apple-mobile-web-app-title`；`public/_headers` 讓 manifest 以 `application/manifest+json` 提供。圖示是 PNG 佔位檔（192、512、180），由 `node scripts/make_placeholders.mjs` 依 `src/assets.ts` 的 `PWA_ICONS` 產生，清單在 [docs/ui-assets.md](../ui-assets.md)。沒有 service worker，不做離線。

### 新手任務卡（S3）

- **任務卡**（`TasksCard`，在集章冊「探索」區；2026-10-19 起從 `/me` 搬到 `/explore`，2026-10-20 探索併進集章冊，`/me` 不再放，避免重複；每項是**整列連結、≥ 44 px 高**（`task-row`），不是只有字是連結）（，清單 `tasks-list`、每項 `task-<id>` 帶 `data-done`、`tasks-count`、`tasks-toggle`）：拿到第一道光後出現，4 項依 `tasks()` 推算打勾，順序不拘、可收合（`tasksCollapsed` 存在 `onboarding`）。「在樹洞留一句話」說明「到地圖點一棵樹，進樹的頁面」，「在空樹穴許願」說明「到地圖點一個空樹穴」，連結都回地圖。4 項做完卡片換成一行小字（`tasks-card-done`），不再有按鈕。
- **看過旗標**（`useViewedFlag`）：集章冊「探索」區的圖鑑區（`data-testid="codex-section"`）真的出現在畫面上時記 `viewedCodexAt`（IntersectionObserver）；`/me` 的徽章區（`data-testid="badges-section"`）真的出現在畫面上時記 `viewedBadgesAt`（IntersectionObserver，不支援就在載入時記）。只在使用者文件載入完成、旗標還沒有時寫一次。
- **地圖小入口**（`data-testid="tasks-chip"`，「新手任務 n/4」，連到 `/explore`）：拿到第一道光、引導已收起或走完、任務還沒全做完才出現；平靜的小膠囊，沒有紅點或數量徽章。位置在地圖頁首左上、和右上的光點餘額同一排（2026-10-20 起；原本在左下，緊貼導覽中間大按鈕旁的拇指弧線）。判斷是純函式 `showTasksChip`。
- **A3**：`OnboardingEffects` 在使用者文件載入後、4 項都完成、沒有 `newcomerCelebratedAt` 時記下時間並跳出「城市的新朋友」慶祝，只一次（`shouldCelebrateNewcomer`）。早就完成過的舊使用者會在下次開啟時看到一次。
- 雲端不用改：`onboarding` 本來就是 `users/{uid}` 的一個 map 欄位，新旗標照逐欄合併。

### 驗收

S1 資料與徽章

- [x] 流水帳只有 GM 補發（`adjust()`）時，「第一道光」不亮；`award()` 之後才亮。
- [x] 新手禮重複呼叫不會重複送，餘額不變，不寫 `ext.inventory`；`inventory()` 的 `hat-acorn` 只出現一次；送出後 `buy(hat-acorn)` 回傳已擁有。
- [x] `patchOnboarding` 不會洗掉原有欄位；4 項任務的判斷各有測試；新使用者依序做完（不靠 GM 補發）會拿到「城市的新朋友」；徽章共 12 枚。
- [x] 雲端（模擬器）：伺服器上已有 `inventory.owned = ['frame-spring']` 時，沒收到該資料的舊用戶端送新手禮，伺服器的 `owned` 不變，`inventory()` 兩件都有。
- [x] 雲端（模擬器）：旗標寫入後重啟雲端 store，`getExt('onboarding')` 一樣；伺服器已有 `tourDismissedAt` 時，再寫 `homeScreenAt` 兩個欄位都在。
- [x] `npm test`、`npm run test:rules`（含 `tests/cloud/`）、`npm run build` 通過。

S2 引導一與加入主畫面（已做；桌機 360 px 與單元測試驗過，實機項目待測）

- [x] 新使用者在地圖看到引導；「之後再說」重新整理後仍收起；「新手引導」（2026-10-19 前在選單，現在在 `/me`）從存下的步驟接著看；已有第一道光（沒開始過引導）的人看不到。
- [x] 第一次拿到光點（`award()`，與 Demo 打卡同一條路徑）出現「第一道光」慶祝，新手禮記入 `giftAt`，橡實帽出現在小芽的背包。**Demo 模式實際走掃描頁需要相機，只用呼叫 `award()` 驗過。**
- [x] 模擬 standalone 啟動只記一次「回家的路」，不洗掉其他旗標；`manifest.webmanifest` 內容類型正確（dev server 驗過；Cloudflare 靠 `_headers`，部署後要再確認）。
- [x] 360 px 沒有水平捲動、輸入框字級至少 16 px（引導裡沒有輸入框）、全部繁體中文。
- [ ] 實機 iPhone（需使用者同意部署後）：加入主畫面、「回家的路」亮起、standalone 內 Google 登入視窗可用；只在桌機測過的項目要註明。
- [x] Demo 模式不自動跳引導、「掃樹牌」按鈕在；拿到第一道光跳一次慶祝視窗，重新整理不再跳；從「新手引導」打開引導後拿到第一道光，由引導第 3 步慶祝、不另跳視窗（2026-10-19 Playwright 360 px，本機後端）。
- [x] 雲端（Firestore 模擬器）下的瀏覽器流程：2026-10-19 用 Playwright（360 px）在模擬器模式走過新使用者、之後再說＋重新整理、從「新手引導」接著看、第一道光慶祝與新手禮；重新整理後旗標仍在，模擬器的 `users/{uid}.onboarding` 是 map 欄位。standalone 在雲端模式只有整合測試涵蓋。

S3 新手任務（已做；本機後端 360 px Playwright 驗過）

- [x] 任務卡（當時在 `/me`，現在在 `/explore`）：4 項各自在真實操作後打勾（換上新手禮用 /me 的按鈕；樹洞與許願用 store 函式觸發），重新整理後仍在；看圖鑑區與 `/me` 徽章區會記下看過；地圖「新手任務 n/4」不和其他按鈕重疊，完成後消失。**收合按鈕沒有在瀏覽器裡驗。**
- [x] 完成 4 項只慶祝「城市的新朋友」一次（重新整理後不再出現）。

陪你的動物（2026-10-19，在 §9 引導第 0 步與 `/me` 選；地圖上的人物與點樹行動圈見 [02](02-map.md)）

- [x] 單元測試：`tourView` 新使用者從第 0 步開始（`needsInit`）、已存的 1–5 意思不變、已過第 0 步的人不被拉回、拿到第一道光從第 0 步直接跳第 3 步、`reopenPatch` 從第 0 步重來；`animalOf` 對沒有／不認得的值回傳穿山甲（預設）；每隻動物都有佔位素材，4 隻的素材說明都有「同一片發光葉子、點狀眼睛、臉部留白」。
- [x] 瀏覽器（Playwright 360 px，本機後端）：新使用者的引導停在第 0 步（`data-step="0"`、進度「第 1 步，共 5 步」）、（當時預設藍鵲，2026-10-20 改穿山甲）；選穿山甲地圖上的人物立刻換、重新整理仍在；「就牠了」到第 1 步、「上一步」回第 0 步；「之後再說」後到 `/me` 換松鼠，地圖也換；沒有水平捲動。
- [x] 第三輪 B（2026-10-20）：單元測試——`resolveOtherDistrict`（位置在台北市 → 那一區；市界外或沒有位置 → 注入 rng 後從 12 區挑，邊界值不越界）、預設動物與沒存動物的人是穿山甲、`homeDistrict` 寫入／驗證／不被後續 patch 蓋掉、`growthCopy` 安心話只在被要求時出現。瀏覽器（Playwright 390 與 360 px，本機後端）：新使用者（非 Demo）自動開引導、停在第 0 步、動物排序穿山甲／臺灣藍鵲／夜鷺／赤腹松鼠且穿山甲預設選中、下面有 12 區 3 欄（每格 44 px 高）與全寬「其他」、沒有水平捲動、「就牠了」固定在底部不用捲；沒有定位權限時選「其他」得到亂數的一區並說出來；Demo 模式（不自動開引導）從 `/me` 重開引導、選「其他」得到大安區（說「你現在在大安區…」）；`/me` 顯示「我的區：大安區」、「換一區」選文山區後重新整理仍在；0 光點的 `/me` 沒有「光點花掉了」那句；「模擬」標籤在頁尾資料說明。**沒有在實機、真的 GPS 定位在台北市內、雲端模式驗過。**
- [x] 團隊簡報 v20 改版（2026-10-20）單元測試：五隻動物的順序、名稱、預設（臺灣黑狗）；舊值 `night-heron`→黑冠麻鷺、`squirrel`→預設；商店只有 3 造型＋2 相框、沒有 civic；舊造型 id（owned／equipped）對應到新的且不重複、稀有的 `hat-ancient` 不受影響、舊 `civic` 資料原樣保留；GM 存過的舊商品清單改名並拿掉 civic；小芽三階（0／100／300）與 `growthCopy`（不含「還差」「再 N」、安心話只在被要求時出現）；舊的 civic 購買不再讓「商店」任務打勾。
- [x] 團隊簡報 v20 改版瀏覽器（Playwright 360 px，本機後端、無 Firebase，2026-10-20）：`/me` 三階小芽（初心／茁壯／智慧老樹精，進度條 `sprout-progress`）、標題「○○和小芽・階段」；帶舊資料（`hat-straw` 已穿、`night-heron`、`civic`）進來，換裝顯示橡實帽已穿上、頂部動物是黑冠麻鷺；「換一隻」展開 5 隻、逐一點選都立刻換，4 個字的名字一行放得下；`/shop` 只有造型與相框、沒有「回到城市」；`/gm` 沒有捐款統計且不當機；新手引導第 0a 步五選一、預設臺灣黑狗，選穿山甲地圖人物立刻換；各頁沒有水平捲動。**只在桌機瀏覽器模擬驗過，沒有實機。**
- [x] 第四輪 Y（2026-10-20）：單元測試——引導依序 動物 → 區 → 光點是什麼、第 1 步「上一步」回到區、`tourStep ≥ 1` 的人不受 `tourSub` 影響（有沒有 `tourSub` 結果相同）、沒有或不認得的 `tourSub` 當成動物、重看走完的人從動物開始、進度點 6 個；12 區排列涵蓋全部 12 區各一次且每列由北往南；`resolveHereDistrict`（市內／市外／沒位置，失敗不亂數）；其他的說明文字。瀏覽器（Playwright 390×664 與 360×740，非 Demo、新使用者、本機後端，定位分「拒絕」「在大安區」「在新店」）：引導先出現動物、「就牠了」後出現「你在哪一區？」、進度「第 2 步，共 6 步」；定位鈕、12 區、其他、提示、固定按鈕都在畫面內，抽屜沒有 overflow、沒有水平捲動、每個選項 ≥ 44 px；拒絕與市外時說原因、選項仍可點；在大安區按「用目前位置」選到大安區；拒絕時按「其他」得到亂數一區並說「先從○○區開始集章，之後可以在「我的」換。」；「好了，出發」到第 1 步、「上一步」回到區（區還在）、重新整理仍停在區、「先跳過」到第 1 步。`/me` 換一區：選到最後一列（南港、文山）展開後，選到的那格距掃樹牌鈕上方 ≥ 41 px。**沒有在實機、真的 GPS、雲端模式驗過。**
- [ ] 雲端（Firestore）下的動物同步：沿用 `onboarding` 的逐欄合併，**沒有另外在模擬器跑過 `animal` 欄位**。

## 10. 集章冊 `/stamps`

2026-10-19 使用者決定，屬 P1 延伸功能。入口：底部導覽最左邊的「集章冊」分頁（原本 `/me` 的按鈕與選單入口已移除）。

### 決定

- **章依行政區、依「打卡過幾棵不同的樹」**：打卡結果是 `success` 或 `farView` 都算，同一棵樹只算一次（`TreeID` 整串比對，`-001` 後綴算不同棵）。
- **四級**：鐵 1、銅 10、銀 50、金 200 棵。每一級的取得時間 `earnedAt` = 該區第 N 棵**不同的樹**第一次打卡的時間（與之後重複打卡、資料順序無關）。
- **全部由 `state.checkins` 推算，不新增儲存欄位、不改雲端與 `firestore.rules`。** 清資料或換裝置後章跟著打卡紀錄走。
- **樹屬於哪一區**：看 TreeID 前兩碼，對照表是 `src/features/game/districts.ts` 的 `PREFIX_DISTRICT`（BT 北投、DA 大安、DT 大同、JJ 中正、JS 中山、NG 南港、NH 內湖、SL 士林、SS 松山、SY 信義、WH 萬華、WS 文山），共 12 區。`public/data/trees/<前綴>.json` 每個檔案絕大多數的樹是同一區（有少數邊界樹的 `Dist` 與前綴不同，以前綴為準）；單元測試會讀這些檔案驗證對照表。不認得的前綴不計入。
- **各區光點歷史**：只看**基礎流水帳**（`baseLedger()`，不是合併 GM 補發的 `ledger()`），依 `award()` 寫的 key `${action}:${key}:${dayKey}` 歸區：
  - `checkin`／`farView`／`sun`／`whisper`：key 是樹籍編號，依前綴歸區。
  - `wish`／`water`：key 是許願 id，依該許願的 `district` 歸區（用 `allWishes()` 查）。
  - 沒有 key 的（花費、GM 補發）、查不到樹區或許願的一律不算。
  - key 解析：action 取第一個 `:` 前、日期取最後一個 `:` 後、中間整段是 key（目前樹籍編號與許願 id 都不含 `:`，但中間含 `:` 也不會切壞）。action 不在 `ACTION_LABEL` 內的不算。
- **示意地圖的背景（2026-10-19 使用者決定）**：區卡後面畫台北市輪廓與 12 區界（淡線），外圍的新北市、基隆市用較深的色塊，區卡的格子排法不變。資料用 OSM 行政區界（ODbL，同既有的 OSM 資料）：`scripts/fetch_admin_osm.py` 經 Overpass 下載到 `material/raw/osm/admin_boundaries_osm.json`（2026-10-19；臺北市、新北市、基隆市 `admin_level=4`，臺北市各區在 OSM 是 `admin_level=7`），`scripts/build_admin_outline.py` 組成多邊形、投影到 TWD97、把新北與基隆裁到「台北市外框＋4 公里」、簡化（25～60 公尺）後輸出已投影的 SVG 路徑 `public/data/taipei-outline.json`（約 11 KB，含出處欄位）。畫面是一張靜態 SVG（不用 MapLibre），`meet` 置中貼合格子容器，`aria-hidden`、不接受點擊；鄰近縣市在裁切邊緣淡出；區卡背景微透明（82%）讓區界透出來。載入失敗（404、格式不對）就不畫背景、也不顯示出處，其餘照常。地圖下方一行出處「行政區界：© OpenStreetMap contributors（ODbL）」。這是示意背景，區卡位置仍不精確對應地理位置。
- 語氣沿用設計原則：沒有紅點、排行、催促；文案「不用急」。章的美術是佔位檔 `stamp-iron`／`stamp-bronze`／`stamp-silver`／`stamp-gold`（清單見 [ui-assets](../ui-assets.md)），畫面用 `<Art id>`。

### 繪本紙面與手機上的操作（批評修正 S，2026-10-20 使用者決定：全部修、走蠟筆繪本、語氣平靜、不用紅點）

- **紙面**：面板是暖色紙（`PANEL_BG #eadfc4`，外圍新北、基隆 `#d9cdae` 舊紙色），淡淡的紙紋；邊緣用 SVG 濾鏡微微抖動、填色有一點蠟筆留白（`Crayon.tsx`，套在整組區塊上，相鄰區的共用邊不會裂；文字不套）；區與里的邊線是墨色（`INK_EDGE #4d4230`，對面板與每一種填色對比 ≥ 3:1）；面板與狀態卡圓角不對稱、邊框是紙邊色、陰影有偏移與模糊。未開始是比面板亮的空白紙格加虛線邊，一眼分得出（舊的深色版本「未開始」幾乎等於面板色）。區名、里名、卡片標題、章名用手寫體（`--font-voice`，LXGW 文楷）；章的圖案微微歪斜像蓋上去的。測試守住：字色 ≥ 4.5:1、邊線 ≥ 3:1、未開始與面板／鄰近縣市可分辨、里色階逐格字色 ≥ 4.5:1。
- **點了要看得到（P1）**：地圖高度上限（SVG `meet` 置中）：原本 `55svh`，2026-10-20 第四輪 X 改成 `36svh`（`CITY_MAP_VH`，見下面「第四輪 X」）；點區或點里之後：(1) 焦點移到卡片標題（`h2 tabindex=-1`，讀屏與鍵盤跟著走，`preventScroll`），(2) 一個 `role="status" aria-live="polite"` 說「已選取大安區，詳細在下方的卡片。」，(3) 卡片平順捲進畫面（`scrollIntoView({block:'nearest'})`，`prefers-reduced-motion` 時不平滑；`scroll-margin-bottom` 讓出導覽列與浮動切換鈕）。**捲動延後到「點兩下」時間窗（350 ms）之後**，否則第一下點完頁面就捲走，第二下會點到別的地方；點兩下進里地圖與 Enter 進入照舊。**取捨**：不做底部抽屜（bottom sheet）——抽屜會蓋住地圖（無法連點、換區要先關閉）、需要焦點陷阱，而卡片留在文件流裡可以邊看地圖邊滑；缺點是卡片可能在螢幕下方，所以才要捲進來。全市層只有一段、不能點的麵包屑不顯示（省一列），進到里或路線才出現。
- **切換鈕**：「地圖／依取得時間」（共用 `.segmented`）移到頁面底部，`position: sticky`，浮在導覽列上方（比中間凸出的按鈕高一點），單手拇指點得到；每個鈕高 44 px；內容很短（依取得時間）時用 flex `margin-top: auto` 讓它仍在底部。
- **點擊範圍**：全市地圖上螢幕不到 44 px 的區（大同、萬華）另外補一個透明的點擊圈（`tapPadRadius`，直徑 ≥ 44 px，只給手指用；鍵盤與讀屏走區塊本身）。里太小（例如 18×38 px），所以里層有「用列表選里（N 個）」（`VillageList`，`village-list-toggle`）：點亮多的排前面、同樣多的依名稱、沒有樹的最後，每一列是 ≥ 44 px 的按鈕（里名、已點亮／總棵數、小進度條），點了和點地圖一樣出卡片。里地圖本身不進 Tab 順序、對讀屏隱藏（原本約 53 個停靠點），**列表是鍵盤與讀屏的路**；全市層 12 區維持各一個按鈕。
- **出處**：只留一行小字（`credit.ts`）：全市「區界 © OpenStreetMap contributors（ODbL）。章圖是暫用的示意圖。」；里層「村里界 內政部國土測繪中心（政府資料開放授權條款第 1 版）；區界 © OpenStreetMap contributors（ODbL）；樹木 臺北市政府開放資料。章圖是暫用的示意圖。」授權標示都保留；畫面不再出現「佔位美術」這類開發者說明。資料檔裡的 `attribution` 欄位（含下載日期）照舊保留，畫面用精簡版。

### 里的步行路線（2026-10-19 使用者核准，只有函式庫）

集章冊的里路線（之後的畫面）用 `src/lib/route.ts` 的 `planTreeTour(graph, start, candidates, maxStops = 8)`：從 `start` 出發，每次走向路上距離最近的下一棵還沒點亮的樹（貪婪），回傳 `{ start, stops, path, meters, minutes }`；`path` 是整條路線座標（接點不重複）。路網由 `loadRoadGraph(前綴)` 載入（`public/data/roads/`，只含 OSM 具名道路，小巷可能沒有；細節與限制見 [02-map「怎麼走」](02-map.md)）。走不到的樹會被略過、一棵都排不出來回傳 null，畫面要處理「找不到路線」。

### 里（資料）

2026-10-19 使用者核准，只有資料與載入函式，還沒有畫面；之後的「里層級集章地圖」會用。

- **來源**：內政部國土測繪中心「村（里）界」（[data.gov.tw/dataset/7438](https://data.gov.tw/dataset/7438)「村里界圖(TWD97經緯度)」，政府資料開放授權條款第 1 版）。`scripts/fetch_villages.py` 下載到 `material/raw/village/village.zip`（2026-10-19，版本 `VILLAGE_NLSC_1150817`，不修改）。
- **產生**：`scripts/build_villages.py` 取 `COUNTYNAME` 臺北市（斷言 456 個里；各區 北投 42、士林 51、內湖 39、南港 20、松山 33、信義 41、大安 53、中山 42、大同 25、中正 31、萬華 36、文山 43），用與 `build_web_data.py` 相同的讀取與座標轉換載入**全部**真實樹木（162,406 棵），在 TWD97 公制座標上以精確多邊形做點在多邊形比對，得到每里 `total`；落在所有里之外的樹（河面、市界邊緣，51 棵）不計入任何里，只在輸出時印出 `trees_unassigned`。之後整批用 `coverage_simplify`（12 公尺，相鄰里共用的邊一起簡化，不會裂縫）簡化，轉回 WGS84、座標取 6 位小數。里依 `TOWNNAME` 歸區，檔名前綴對照 `districts.ts` 的 `PREFIX_DISTRICT`。
- **輸出**：`public/data/villages/<前綴>.json`，每區一個檔案（11～72 KB，預算 < 150 KB）：`{ district, attribution, villages: [{ id (VILLCODE), name, total, bbox, geometry (GeoJSON Polygon／MultiPolygon) }] }`。出處欄位 `attribution` 畫面用到時要顯示。
- **載入**：`src/lib/villages.ts`：`loadVillages(prefix)`（快取；失敗回傳 null、不重試）、`villageOf(lngLat, villages)`（點在多邊形，支援 MultiPolygon 與洞，先用 `bbox` 篩）、`countLitByVillage(trees, villages)`（打卡過的樹含座標 → 每里不同的樹棵數，同 id 只算一次）。
- **已知限制**：里界資料是 TWD97[2020] 經緯度、樹木座標由 TWD97 TM2 轉 WGS84，兩者與 WGS84 差距在公尺內，不處理；邊界上的樹歸第一個找到的里；有 14 個里沒有任何樹（多為山區或河濱）。

### 地圖（C，2026-10-19 使用者核准）

參考海報「台北大洋流」的風格（行政區是實心色塊、被選中的區亮起、狀態卡），但用本專案的綠色系。**2026-10-20 批評修正 S**：原本的深色資料海報面板改成繪本紙面（見下面「繪本紙面與手機上的操作」）。取代原本的 12 張區卡格子；切換鈕 `view-map` 現在叫「地圖」，`view-time` 不變。程式在 `src/features/stamps/`，入口 `StampAtlas`；純邏輯（配色、色階、投影、標籤位置、候選樹）有單元測試（`__tests__/stamps-map.test.ts`）。

三層，共用一條麵包屑（`atlas-crumbs`：「全市 › 內湖區 › XX里」，每一段可點回去）：

1. **全市**（`city-map`）：`taipei-outline.json` 的 12 區形狀，畫布裁到台北市外框＋70 單位，新北與基隆是較淡的外圍色塊。每區是一個按鈕（SVG `path`，`role="button"`、`aria-pressed`、`aria-label`「大安區：鐵章，3 棵」、Enter／空白鍵可操作、保留 `district-<前綴>`、`data-tier`、`data-count`）。填色像印泥一樣由淺到深：還沒走過 `#fcf8ec`（空白紙格，虛線邊；2026-10-20 起圖例與 aria-label 寫「還沒走過」，不寫「未開始」）、鐵 `#cfe2bf`、銅 `#9dc98c`、銀 `#5fa275`、金 `#e8b645`（`colors.ts`；區名字色與填色對比 ≥ 4.5:1，測試驗證），圖例在地圖上方（2026-10-20 第四輪 X 起）。區名畫在形狀中央（最大一塊的重心）。點一區：該區亮起（深墨色粗外框），下方出現狀態卡（`district-detail`：區名、章等級、不同的樹棵數、已得的章與日期、進度、光點總數、光點紀錄，沿用舊底部抽屜的內容與 testid）與「進入里地圖」（`enter-villages`）。**點兩下**（同一區 350 ms 內再點一次，`isDoubleTap`；不靠 `dblclick`，iPhone 才可靠；`touch-action: manipulation` 避免放大頁面）或對已選的區再按 Enter，直接進里地圖（2026-10-20 加）。舊的區卡格子與底部抽屜移除；因為每區就是按鈕，不另外放重複的清單。
2. **里**（`village-map`）：`loadVillages(前綴)` 的里，以該區範圍等距圓柱投影（經度乘 cos 緯度，保持長寬比；畫布寬 360、高 240～440）。每個里依「點亮的樹 ÷ 里內的樹」上色（里的比例都很小，所以用對數色階：0 棵 = 空白紙格；只要有 1 棵就從色階 0.25 起跳，一眼看得出變化；3 成以上滿格；`rampT`／`rampColor`；顏色分五格像印泥加深，不連續內插，因為連續內插會經過任何字色都不到 4.5:1 的中間亮度）。「點亮」= 這一區打卡過的不同的樹（成功或遠觀，與集章同一算法），座標來自 `public/data/trees/<前綴>.json`（`villageTrees.ts` 另外載入同一個檔案，`src/lib/trees.ts` 的快取沒有匯出），再用 `countLitByVillage` 歸到里。里名放得下才顯示（外框寬容得下整個名字），放不下的點了在卡片上看；太小點不到的里改用地圖下方的「里列表」（見下）。點一個里：卡片「XX里：已點亮 3／412 棵」（`village-progress`）與「規劃路線」（`plan-route`；沒有樹或全部點亮時停用）。畫面下方一行出處（見下「出處」）。
3. **路線**（`route-view`）：從使用者的位置（`useAnchor`：真實 GPS，Demo 模式用模擬位置）出發，走訪這一里**最近的、還沒點亮的**樹，最多 8 棵。候選樹 = 該區樹檔裡落在這個里（`inVillage`）且未點亮者，依直線距離取最近 60 棵交給 `src/lib/route.ts` 的 `planTreeTour`（路網 `loadRoadGraph(前綴)`）。MapLibre 地圖（沿用 `MAP_STYLE`、`MAP_LOCALE`）畫起點（你的位置）、依序編號的樹、終點與沿路的線；摘要「約 1.2 公里・步行 16 分鐘・8 棵」（`route-summary`）、停靠樹清單（連到樹的頁面）、「建議路線，只含具名道路」。沒有位置（沒給定位權限）顯示「需要你的位置才能規劃路線（或用 Demo 模式）」；位置移動或點亮新樹時路線會重算。
   **開始（2026-10-20）**：摘要下方有主要按鈕「開始」（`route-start`）：把這條路線（里名、區名、起點、停靠樹與座標、整條路線、公尺、分鐘、`startedAt`）存成「進行中的路線」並回首頁 `/`，大地圖畫出這條路線、編號的停靠樹與頂端列（已點亮 N／M 棵、看全程、結束），走過（開始後打卡）的站打 ✓；細節與驗收見 [02-map「里路線」](02-map.md)。進行中的路線只存在這個分頁（sessionStorage），按「結束」清掉；再按一次「開始」會換成新的路線。

限制：路線是建議，只含具名道路（由 `route.ts` 決定）；候選樹只看直線最近的 60 棵；沒有真實手機上的 GPS 驗證。

### 畫面（舊版，已被上面的「地圖（C）」取代；保留給「依取得時間」與抽屜內容的參考）

- 兩種檢視（切換鈕 `view-map`／`view-time`）：
  1. **示意地圖**（`stamp-map`）：12 張區卡用 CSS grid 大致排成台北的方位（北投、士林、內湖在上，大同、中山、松山、南港中間，萬華、中正、大安、信義在下，文山在最下），不是精確地圖；4 欄、寬 360 px 不水平捲動。每張卡（`district-<前綴>`，`data-tier`、`data-count`）顯示區名、目前最高的章（沒有就「未開始」）、不同的樹棵數。
  2. **依取得時間**（`stamp-list`，每枚 `stamp-item`）：所有已得到的章，新的在前，顯示區名、章、日期；沒有章時顯示說明（`stamp-list-empty`）。
- 點區卡開底部抽屜（`district-detail`，`role="dialog"`，可按「關閉」或 Esc）：已得到的各級章與日期、進度（`district-progress`，例如「7／10，再 3 棵拿銅章」；金章後「已集滿金章」）、該區累計光點（`district-light-total`）、可展開的光點明細（`district-ledger-toggle`、`district-ledger`；每筆日期、樹籍編號或許願路名、行為名稱、+N）。

### 頁面結構、我的區與零狀態（第三輪 A，2026-10-20 使用者決定）

- **探索併進集章冊**：`/stamps` 頂端是「集章／探索」兩區（`Segmented`，`mode="tabs"`，真正的 tablist／tabpanel；`stamps-seg`、`stamps-seg-stamps`、`stamps-seg-explore`；面板 `stamps-panel`、`explore-panel`）。選哪一區放在網址 `?tab=explore`（沒有 `tab` 就是集章；換區用 `replace`，不堆歷史）。「探索」區 = 探索地圖（迷霧，見 [09](09-fog.md)）、新手任務卡、樹的圖鑑（`src/features/stamps/ExploreSection.tsx`）；舊網址 `/explore`、`/codex` 轉址到 `/stamps?tab=explore`（`src/features/nav/redirects.ts`）。
- **「地圖／依取得時間」不再浮在畫面上**（批評 P1：它蓋住圖例、點兩下的提示和出處）：放在地圖**上面**一般排版（DOM 順序也在地圖之前，讀屏先遇到），樣式比頂端的「集章／探索」淡（只是換看法）；「依取得時間」下面不再有一塊空白。
- **我的區**：新手引導選的 `ext.onboarding.homeDistrict`（中文區名，如「大安區」）。集章冊打開時就選好這一區、狀態卡已經在地圖下面（不捲動、不搶焦點）；使用者自己點了別區就以點的為準；沒有「我的區」（沒選過、舊資料）或存的值不是 12 區之一，就維持原本空白的全市（純函式 `selectedDistrict`、`asDistrict`）。
- **零狀態是邀請，不是缺憾**：
  - 一區一棵不同的樹都還沒打卡（`isWaiting`）：狀態卡（`data-waiting="true"`）不排一整排 0，只有區名、虛線的空章、一句「這一區還是一張白紙。走到任何一棵樹旁掃樹牌，就會蓋上第一個章。」（`district-invitation`）、主要動作「去掃樹牌」（`district-scan`，到 `/scan`）、次要動作「進入里地圖」；光點紀錄只在真的有紀錄時才出現。沒有「未開始」「還沒有章」。
  - 里列表裡還沒點亮的里只有名字與一格淡虛線框，不寫「0／N 棵」（`villageUntouched`、`villageCountText`）；沒有樹的里仍寫「沒有樹木資料」。里卡片還沒點亮時是「這一里有 N 棵樹，走到任何一棵旁邊掃樹牌，就會點亮第一棵。」，沒有進度條。
  - 頂端說明在還沒有章時不寫「已集到 0 枚章」。圖鑑頁尾「還有 N 種等你遇見」拿掉，改成「台北最常見的樹」。
- **點一區之後只捲到剛好看得到標題列**：不再把整張卡捲進來；標題下緣超出導覽列上方多少才捲多少（已看得到就不捲），而且不讓地圖下緣捲出畫面（`revealDelta`）；焦點仍移到卡片標題、aria-live 照報。保留「點兩下進里地圖」。
- **≥ 44 px**：新手任務列整列、圖鑑卡的「看這棵樹 ›」整列（取代 16 px 的樹籍編號連結）、光點紀錄裡的樹籍編號連結；區的點擊圈（大同、萬華）照舊。

### 第四輪 X：集章冊第一屏與迷霧（2026-10-20 批評 3A 修正）

問題：390×664 打開集章冊，選中的區（我的區）的卡片在摺線下 450 px，文山區被中間的掃樹牌鈕蓋住。

- **「我的區」摘要列**（`home-summary`，在全市地圖上面，只有存的 `homeDistrict` 是 12 區之一時才有）：「我的區：大安區・3 棵」，一棵都沒有就「我的區：文山區・還是一張白紙」（`homeSummaryText`）；右邊「看我的區 ↓」（`home-jump`，≥ 44 px）把「我的區」選回來，焦點移到卡片標題，並把**整張卡片**捲進頂端與導覽之間（批評 4 修正：原本只捲到看得到標題、約 15 px，卡片仍被導覽蓋住）。
- **第一屏塞得下**：(1) 頂端說明句（兩行）搬到地圖下面（「依取得時間」檢視仍在列表上面），已集到的章數原本放在「地圖／依取得時間」同一列右邊（`stamp-count`，沒有章就不顯示；**第四輪批評 4 起併進「我的區」那一行，見下「第四輪批評 4 修正」**）；(2) 地圖高度上限 `55svh` → `36svh`（`CITY_MAP_VH`，CSS `.atlas-panel svg` 同步；不隨有沒有選區改變，否則第一次點區地圖會縮、第二下「點兩下」就點到別處）；(3) 圖例搬到地圖面板上方（一行，不再被導覽列中間的圓鈕蓋住），區名字級在畫面上至少 10 px（`LABEL_MIN_PX`）；(4) 摘要、狀態卡、地圖之間的間距收緊。**取捨**：地圖在 390×664 縮小（約 354×239 px 的面板，Taipei 本身約 180 px 寬），小區靠原本的點擊圈與下面的卡片；其餘空間是紙色留白。
- **沒有任何區在掃樹牌鈕下面**：用「整張地圖與卡片標題都在導覽列上緣之上」達成，不另外在 SVG 底部加邊（加邊只會讓地圖更高、更小）。往下捲時地圖本來就會經過那顆鈕。
- **用字**：圖例與區的 aria-label 一律「還沒走過」（原「未開始」）；里列表中還沒走過的里收在「還沒走過的 N 個里」按鈕後面（`village-untouched-toggle`，展開／收起、`aria-expanded`、44 px 高，展開的列表 `village-list-untouched`），走過的在上面（`splitUntouched`；**批評 4 起沒有樹木資料的里不再算「走過」**，見下）。
- **迷霧**：暖光半徑 1.5 → 1.7 倍、中央透明度 0.7 → 0.8、中段 0.5 → 0.6，縮小時至少畫 9 → 14 px，單次走過也看得出來，但仍是柔光。細節見 [09](09-fog.md)。

### 第四輪批評 4 修正：集章冊、里地圖（2026-10-20 使用者核准）

- **「看我的區 ↓」把整張卡片帶進畫面**（P1）：`fitDelta`（純函式，`reveal.ts`）算要捲多少，可視範圍 = Demo 細條（`.demo-badge`，有的話）之下 8 px 到「導覽上緣 − 掃樹牌圓鈕高出導覽的 34 px（`SCAN_DISC_RISE_PX`）− 8 px」；卡片放得下就讓卡片下緣停在範圍底、已在範圍內不動、卡片上緣在頂端列下面時往回捲；放不下（卡片比範圍高）就讓上緣貼齊範圍頂，標題與主要按鈕先看得到。點地圖上的區仍是舊行為（只捲到看得到標題列、地圖下緣留在畫面內，`revealDelta`）。`html:has(.tab-shell)` 加 `scroll-padding-bottom`（導覽高 + 48 px），鍵盤聚焦捲動也不會停在導覽底下。
- **第一屏縮短**（P1）：(1) 已集到的章數併進「我的區」摘要列（`home-summary` 第二行「已集 1 枚章」，`stampCountText`；沒有章就不寫），沒有「我的區」時才放在地圖卡片頂端、切換鈕右邊；(2) 「地圖／依取得時間」切換鈕（`Segmented`，`view-map`／`view-time`，a11y 不變）搬進地圖卡片的頂端列（`atlas-head`，在圖例與地圖之前，DOM 與閱讀順序仍是先切換鈕再地圖）；里地圖與路線層同一個位置；「依取得時間」檢視沒有地圖，切換鈕自成一列並帶章數。切換看法時切換鈕會換位置，所以切完把焦點放回新的那顆（`StampsPage`）；輪廓資料由頁面載入（`useOutline`，傳進 `StampAtlas`），切回地圖時不重新掛載。卡片內的切換鈕不再圍膠囊，頂端列約 48 px。**實測：卡片頂端 390×844 623 → 615 px、360×640 549 → 541 px，只省 8 px，因為切換鈕只是從地圖外移進地圖卡片；第一屏能不能看到整張卡片靠「看我的區」。**
- **頁尾與圓鈕**（P1）：`.tab-shell .page` 底部留白 導覽高 + 24 → 導覽高 + 52 px（圓鈕高出導覽 34 px 再留 18 px），捲到底最後一行（例如說明句、出處）在圓鈕上緣之上；空狀態的「去掃樹牌」（`district-scan`）按「看我的區」後在可視範圍內。
- **里地圖：點亮的里一定有名字**（P2）：原本里名要放得下才畫，永康里（點亮 3 棵）太小所以是一塊沒有名字的綠色。`villageNameMode`（`projection.ts`）：放得下 = `fit`；放不下但點亮過 = `forced`（字級 11 → 10、外框加粗、畫在所有名字最上面，可能壓到鄰里的字，點亮的里才有）；放不下又沒點亮 = 不畫（照舊，點了看卡片或用列表）。文字是 `aria-hidden` 的地圖裝飾，`data-testid="village-label-<id>"`。
- **沒有樹木資料的里不是「走過的」**（P2）：`splitUntouched` 回傳 `{ active, untouched, noData }`；列表上方只有點亮過的里，「還沒走過的 N 個里」只放有樹可以走的，沒有資料的（例如大安區群英里）收在自己的「沒有樹木資料的 N 個里」按鈕後面（`village-nodata-toggle`、`village-list-nodata`，≥ 44 px、`aria-expanded`），列上寫「沒有樹木資料」。

### 驗收

- [x] 單元測試：前綴對照（含讀 `public/data/trees` 驗證）、不同的樹只算一次、鐵／銅／銀／金門檻、`earnedAt`（重複打卡與亂序不影響）、key 解析、光點歸區（含許願與澆水走許願的行政區、排除無 key／花費／GM 補發／查不到的）。
- [x] 瀏覽器（Playwright 360 px，本機後端，2026-10-19）：種入打卡與流水帳後，示意地圖與依時間兩種檢視沒有水平捲動；區卡章與棵數正確；抽屜的進度、光點、明細（含許願與澆水歸到許願所在的區）與 Esc／關閉可用；沒有章時顯示說明；入口當時是 `/me` 與選單，現在是底部導覽。**沒有走真實掃碼打卡，也沒有在雲端模式或實機驗過。**
- [x] 背景（2026-10-19）：`uv run scripts/build_admin_outline.py --check` 確認 12 區名稱與 `districts.ts` 一致、檔案 < 60 KB；單元測試（`outline.test.ts`）檢查解析、12 區、大小；瀏覽器（Playwright 360 px，本機）：背景有畫、沒有水平捲動、擋掉資料檔（404）時沒有背景與出處、其餘照常。**沒有在實機與雲端模式驗過。**
- [x] 里（資料，2026-10-19）：`uv run scripts/build_villages.py --check` 確認 456 個里、12 個檔案、每檔 < 150 KB、幾何有效；各區 `total` 加總 = 162,355（全部 162,406 棵，51 棵不在任何里）；單元測試（`villages.test.ts`）檢查 `villageOf`（含洞、MultiPolygon、區外）、`countLitByVillage`（同一棵只算一次）、讀真實 `DA.json` 驗證形狀與樹的座標落在對的里。**還沒有畫面。**
- [x] 地圖（C，2026-10-19）：單元測試（`stamps-map.test.ts`）檢查路徑解析與重心、12 區標籤位置、五級配色與對比、色階（0 棵暗、1 棵有變化、單調、字色對比 ≥ 4.5:1）、投影（長寬比、北在上、退化範圍）、里名放得下與否、讀真實 `DA.json` 投影、打卡樹歸里與候選樹過濾、摘要文字；瀏覽器（Playwright 360 px，Demo 模式、種入大安打卡，本機）：全市配色、點大安出現狀態卡、進入里地圖、點亮的里變亮、卡片「已點亮 3／137 棵」、規劃路線畫出 8 個停靠點與摘要、無水平捲動、Enter 鍵可選區。**路線目前用的是暫時的直線版 `route.ts`（等路網版合併）；沒有驗證沒有位置時的提示、沒有在實機與雲端模式驗過。**
- [x] `npm test`、`npm run test:rules`、`npm run build` 通過。
- [x] 批評修正 S（2026-10-20，Playwright 390×844 與 360×740，行動裝置模擬、觸控，本機 Demo 模式、種入大安 14 棵與大同 1 棵）：點大安後狀態卡標題整個在導覽列上方、不用手動捲動；焦點在卡片標題；aria-live 有報；`prefers-reduced-motion` 下用鍵盤 Enter 選區也移焦點；連點兩下進里地圖；里地圖 0 個 Tab 停靠點；「用列表選里」列出 53 個里、每列 52 px 高、點第一列出卡片且在畫面內；切換鈕在畫面下方、每個鈕 44 px；大同、萬華各有 44 px 點擊圈；三種畫面都沒有水平捲動。單元測試（`stamps-map.test.ts`）：新配色對比與可分辨、色階逐格、點擊圈（含真實 12 區）、里列表排序（含真實 `DA.json`）、出處文字。**沒有在實機（iPhone 觸控、VoiceOver）驗過；SVG 濾鏡的紙感只在 Chromium 看過，Safari 與低階手機沒驗。**

- [x] 第三輪 A（2026-10-20，Playwright 390×844 與 360×740，Demo，本機無 Firebase，種入 `homeDistrict: '大安區'`）：大安沒有章時打開就選中大安、狀態卡是虛線空章加邀請、「去掃樹牌」到 `/scan`；大安有 14 棵時是一般的卡；沒有 `homeDistrict` 時沒有選區；「地圖／依取得時間」在地圖的 DOM 之前；圖例、出處與狀態卡在畫面中央取點時沒有被任何東西蓋住；點文山（390 px 只捲 72 px、360 px 捲 132 px）：卡片標題在導覽上方、地圖下緣仍在畫面內、焦點在標題、aria-live「已選取文山區…」；里列表 53 列，還沒點亮的只有名字與虛線框、整張列表沒有「0／」；里卡片「這一里有 509 棵樹…」；「依取得時間」沒有空白；「探索」區：網址 `?tab=explore`、迷霧地圖、任務列 44 px 以上、圖鑑頁尾「台北最常見的樹」、沒有「還有 N 種」；三種畫面沒有水平捲動；除了區地圖上大同、萬華的形狀本身（有 44 px 點擊圈）之外，沒有小於 44 px 的可點元件。單元測試：`homeDistrict` 選取、零狀態卡（SSR 渲染）、里零狀態輔助函式、`revealDelta`。**沒有在實機（iPhone 觸控、VoiceOver）驗過。**
- [x] 第四輪 X（2026-10-20，Playwright，Demo，本機無 Firebase，種入 `homeDistrict`「文山區」〔無章〕與「大安區」〔3 棵〕）：390×664 不捲動時，文山區輪廓 y 489–537、導覽圓鈕頂 579，卡片標題 574–601（導覽列頂 608）；360×740 輪廓 511–564、標題 602–629（導覽頂 684，圓鈕頂 655）；大安 390×664 輪廓 463–496。摘要列在第一屏（y 約 236–280），「看我的區 ↓」可用；沒有「我的區」時沒有摘要列；圖例、aria-label 都是「還沒走過」；里列表展開只看到走過的與沒資料的里，「還沒走過的 42 個里」44 px 高、展開後 42 列；三種畫面沒有水平捲動。單元測試：`homeSummaryText`、`splitUntouched`、「還沒走過」用字、章卡仍寫鐵章。**沒有在實機驗過；地圖在 360 px 上的區名字級約 10 px。**
- [x] 第四輪批評 4（2026-10-20，Playwright 360×640 與 390×844，Demo，本機無 Firebase，種入「文山區」〔無章〕、「大安區」〔3 棵〕與沒有 `homeDistrict`）：「看我的區」後卡片整張在 Demo 細條（34 px）與圓鈕頂之間〔360×640：文山 y 288–542、大安 89–542，圓鈕頂 555；390×844：文山 493–746、大安 293–746，圓鈕頂 759〕，「去掃樹牌」「進入里地圖」都在範圍內；捲到底最後一行在圓鈕之上；切換鈕在地圖卡片裡、DOM 在地圖之前，切到「依取得時間」再切回，焦點都在切換鈕上；章數在摘要列（無「我的區」時在切換鈕旁）；大安里地圖「永康里」有名字；列表上方只有永康里，群英里在「沒有樹木資料的 1 個里」裡；三種畫面沒有水平捲動。單元測試：`fitDelta`、`stampCountText`、`splitUntouched` 三段、`villageNameMode`。**沒有在實機驗過。**

## 11. 導覽、探索、樹洞、示範後台（S4）

2026-10-19 使用者決定。取代原本地圖右上角的「我的許願」「選單」與 `/more` 選單頁。

### 底部導覽

- 5 格，順序固定：首頁 `/`（地圖）、集章冊 `/stamps`、**［掃樹牌］**、樹洞 `/journal`、我的 `/me`（2026-10-20 決定；探索併進集章冊，不再是分頁）。分頁清單、五格順序、「目前在哪一頁」、掃樹牌帶什麼 state 都是純函式（`src/features/nav/tabs.ts`：`TABS`、`NAV_SLOTS`、`activeTab`、`showNav`、`centerAction`、`scanState`、`SCAN_CLOSE_TO`），有單元測試。
- **首頁是普通的一頁**：在 `/` 時 `aria-current="page"`、字加粗，和其他分頁一樣。**中間的大圓鈕每個分頁都是「掃樹牌」**（掃描框圖示、實心綠）：從任何一頁按都到 `/scan`；只有在首頁、地圖上選了樹時才帶 `hintTreeId`（`scanState`），其他分頁不帶。它的字是次要色，不是綠色加粗，所以不會和「目前的分頁」同時像選中（批評 P1）。**關閉掃描頁（左上的「回地圖」鈕，`aria-label`「關閉掃描，回地圖」；2026-10-20 原本寫「返回」但一律去首頁，改名）一律用 `replace` 回首頁 `/`**，不是上一頁；掃成功照舊進樹的頁面。
- 只顯示在這 4 個**分頁根頁面**（`TabLayout`）；`/tree/:id`、`/shop`、`/scan`、`/wishes` 是子頁面，沒有導覽、用返回連結；`/gov`、`/vendor`、`/gm`、`/developers`、`/demo-control` 也沒有。桌機閘門（`MobileOnly`）不變。
- 每格 ≥ 44 px 高（56 px + 底部安全區 `safe-area-inset-bottom`），目前的分頁 `aria-current="page"`、字加粗、圖示加粗；沒有紅點或數字。360 px 寬 5 等分（各 72 px）。`data-testid`：`bottom-nav`、`tab-home`、`tab-stamps`、`tab-scan`、`tab-journal`、`tab-me`。
- 右上角光點餘額（`BalanceChip`，`data-testid="balance-chip"`，「✦ N 光點」，`aria-label`「光點 N，前往商店」）連到 `/shop`；每個分頁頁首（`TabHeader`）與地圖右上都有。
- 地圖頁的浮動元件（右側工具、圖層面板、署名）全部排在導覽上面（CSS 變數 `--nav-h`、`--map-base`；任務小入口在左上頁首）；點樹／許願的抽屜與新手引導抽屜也坐在導覽上面，導覽一直看得到。集章冊的區抽屜（`position: fixed`）會蓋過導覽，關閉就回來。
- 從樹洞點進樹的頁面，返回回到樹洞（路由 state `from`）；其他來源回地圖。

### 探索（集章冊的「探索」區）

2026-10-20 起不是獨立分頁，是 `/stamps?tab=explore`（見 [§10 頁面結構](#頁面結構我的區與零狀態第三輪-a2026-10-20-使用者決定)）。由上到下：「探索地圖」區（`data-testid="fog-slot"`，放迷霧地圖 `FogMap`；打開時看你走過的地方、框外還有走過的地方時有「還有 N 處走過的地方 ›」、還沒打卡時是附「去找一棵樹」的空狀態卡、載入失敗有重試，見 [09 迷霧](09-fog.md)）、新手任務卡（`TasksCard`）、樹的圖鑑（`CodexSection`；搜尋、遇見的樹種、`data-testid="codex-section"`；遇見的樹種卡有一整列「看這棵樹 ›」）。`/explore`、`/codex` 轉址到 `/stamps?tab=explore`。

### 樹洞 `/journal`

- 上方「附近的樹」（`journal-nearby`，2026-10-19 加）：用和地圖同一個 `useAnchor`（真實 GPS 或 Demo 模擬位置），從 z16 樹木圖磚（`public/data/tree-tiles`，`nearby.ts` 內建簡易解碼）取 150 公尺內、近到遠最多 8 棵（`pickNearby`）；先列 3 棵，其餘按「看更多（還有 N 棵）」（`journal-nearby-more`）才展開，讓下面的日記與許願不被擠到很下面（2026-10-19 決定）。每列（`journal-nearby-item`）樹種、路名、「往東北・約 N 公尺」、「樹牌 #211045」，和一顆按鈕（2026-10-20 第三輪 D 決定：同路段同樹種的幾列原本一模一樣，所以加兩個分辨用的資訊：**方位**＝從人物看那棵樹的八方位羅盤方向「往北／東北／東…」（`bearingTo`＋`compassLabel`），**不**用「左前方」，因為網頁拿不到可靠的手機朝向，說錯方向比不說更糟；**樹牌編號尾碼**＝樹籍編號去掉英文前綴後的最後 6 碼，帶 `-001` 後綴的保留（`treeNumberTail`，`journal-nearby-number`）。開放資料沒有門牌號，所以不用。「約 N 公尺」不換行拆開）；按鈕（2026-10-20 決定：要先走過去）：在打卡範圍內（`ringRadius`，和地圖感應圈同一個半徑）是「掃樹牌留言」（`journal-nearby-leave`；2026-10-20 批評修正 E：這顆按鈕其實是去掃樹牌，不寫「留言」以免說得比做得多；30 分鐘內已在這棵樹打卡過才寫「留言」，`nearbyLabel`）；太遠時 Demo 是「走過去」（`journal-nearby-walk`，模擬位置移到樹旁，列表跟著重算、那棵變成「留言」），真實定位是「怎麼走」（`journal-nearby-route`，回首頁地圖，用 `state.routeTreeId` 飛到那棵樹並直接畫出步行路線）（`nearbyAction`）。只有最近的那一列是主要按鈕（實心綠），其餘是外框按鈕，免得幾顆一樣重；按鈕的 `aria-label` 帶樹種（「掃樹牌留言：茄苳」）。版面：「我的日記／我的許願」在上，附近的樹在下。沒有位置時顯示「還沒有你的位置。打開定位，或用 Demo 模式。」
- 「留言」仍要先打卡（QR + GPS）：這棵樹 30 分鐘內有有效打卡（`recentCheckin`）就進 `/tree/:id#whisper`，否則進 `/scan`，帶 `state.hintTreeId`（`leaveTarget`；和導覽中間的「掃樹牌」大按鈕同一個介面），掃描頁顯示「要打卡的是：…」。
- 分段切換（`journal-tabs`）：「我的日記」（`journal-tab-diary`）與「我的許願」（`journal-tab-wishes`）。用全站共用的 `Segmented`（`src/components/Segmented.tsx`，批評修正 E）：按鈕 ≥ 44 px 高；樹洞用 `mode="tabs"`——`role=tablist／tab／tabpanel`、`aria-selected`、選中的分頁 `aria-controls` 指向 panel、panel `aria-labelledby` 指回分頁、roving tabindex（只有選中的在 Tab 順序裡）、左右鍵（頭尾相接）與 Home／End 切換並移動焦點（純函式 `tabKeyTarget`，`src/components/tabsKeys.ts`）；集章冊與政府端的 `.segmented` 沿用同一個 class（`aria-pressed` 的一組按鈕），樣式一致。焦點框畫在按鈕裡面。
- 我的日記：我在所有樹留下的話，新到舊（`journalEntries`，只看 `state.whispers`，不含示範膠囊；雲端模式也是同一份）。每則（`journal-item`，列表 `journal-list`）顯示日期時間、「行政區・樹種」（查不到就顯示樹籍編號）、內容，和「查看樹木」（`journal-view-tree`）連到 `/tree/:id`：綠色字加底線與箭頭、可點範圍 44 px 高、文字和上面的內容對齊同一欄（不再是看起來像殘留文字的幽靈按鈕）。沒有時顯示 `journal-empty`。
- 我的許願：`MyWishes`（與 `/wishes` 共用的元件，`data-testid="my-wishes"`）。`/wishes` 仍可用，返回連到樹洞。
- 原本地圖「我的許願」按鈕上的「有新進度」小圓點已移除（不做紅點）；許願卡本身的「進度更新了」標示仍在。

### 我的 `/me`

2026-10-20 使用者決定（批評修正 P）：由上到下**四塊主內容**加一個安靜的設定區，風格是蠟筆繪本（暖色紙底、不對稱圓角、腳下一塊草地），平靜、不放缺什麼的壓力語氣。

1. **頂部（`MeHero`，`data-testid="me-hero"`）**：陪你的動物（地圖上的那一隻，`useAnimal`，`me-animal`）和小芽（含身上的造型）站在一起，標題「臺灣黑狗和小芽・初心樹精」（依選的動物與階段），下面是成長一句話、進度條（`sprout-progress`，見 §5）。**餘額不在這裡**，只在右上角晶片（`BalanceChip`）出現一次，卡片裡不重複。動物那一列有一句簡介與「換一隻」按鈕（`swap-animal`，≥ 44 px，`aria-expanded`）：點了就地展開同一個 `AnimalPicker`（TourSheet 也用它，介面沒變），點動物立刻存、頂部的動物與地圖都跟著換；再按「收起」。設定區不再有動物選項。動物那一列下面是「我的區：○○區」與「換一區」（見上「我的區」），再下面是**「現在的心情」列**（2026-10-20，`MoodRow`，`data-testid="me-mood"`，`data-value` 是心情 id；同一種虛線分隔、同樣的列與按鈕樣式）：有心情時「現在的心情：😰 焦慮・剛剛」（emoji、名稱、相對時間：剛剛／N 分鐘前／N 小時前／昨天／N 天前；名稱與時間不折行）加「換心情」鈕（`swap-mood`，≥ 44 px，`aria-expanded`）；沒選過是一行安靜的「還沒選心情。想的時候再選，沒有也沒關係。」加「選心情」。按了就地展開和打卡後同一個 `MoodPicker`（`radiogroup`、4 欄、每格 ≥ 44 px，目前的心情已選），選好按「就這個」（和目前相同時停用）存，另有「清除心情」（只在有心情時；存 `current: null`）。**換與清除心情只在這裡**，樹的頁面不能換；換心情不算一次詢問，不動詢問時間。規則與存放見 [04](04-tree-page.md)「打卡後的心情」。小字「光點花掉了…」依 §5 只對手上有光點或花過光點的人顯示。
2. **換裝**（`OutfitCard`，擁有造型或相框才出現）：選項 ≥ 44 px 高，目前穿的 `aria-pressed`，分「小芽的造型」「樹的頁面相框」兩組（造型名稱依簡報 v20：橡實帽、花冠羽毛、苔蘚斗篷）。
3. **光點紀錄**（`LedgerSection`，`ledger-section`）：預設只列最近 3 筆，「看全部（N 筆）」（`ledger-more`）展開、可再收回。每列：原因、哪棵樹或哪個願望、日期時間（`formatDayTime`）、光點。打卡、遠觀、日照、樹洞這類 key 帶樹籍編號的，查 `findTree` 顯示「樹種・路名」並連到 `/tree/:id`；許願與澆水顯示「路名的願望」連到 `/wishes`；花費與 GM 補發沒有 key，只顯示原因、不能點。解析是純函式（`src/features/account/ledgerRows.ts`，用 `parseLedgerKey`），有單元測試。扣掉的光點用琥珀色、不用紅色。
4. **成長徽章**（`badges-section`，預設收合，細節見 §4）。
5. **設定與其他**（`me-settings`，縮在底下、不做成卡片、標題用次要色）：新手引導（`reopen-tour`）、帳號（雲端模式：Google 保留、登出）、Demo 工具（開／離開 Demo 模式）、資料來源說明（**「模擬」標籤在這裡**，不在頁首；2026-10-20 批評修正：頁首那一行說明刪掉，標籤與「小芽、光點與徽章是模擬資料」一起放在資料說明）、最後才是紅字的清除（雲端：刪除）資料。**「關於曦語」**（2026-10-20，`about-link`，整列連結 ≥ 44 px，到 `/about`）排在帳號之後、Demo 工具之前。**不連到示範後台**（2026-10-20 決定：`/demo-control` 是獨立頁面，市民端不放入口）。商店、圖鑑、集章冊的按鈕已移除（餘額晶片、探索、集章冊分頁取代）。
6. **頁尾**（`me-closing`）：陪你的動物加一句「光點只能在樹旁或幫城市得到，不能用錢買。沒有排行榜，也不用每天來，（動物名）和小芽會在這裡等你。」——以溫暖的一句收尾，不以紅字收尾。

已知：`TreePage` 目前只認得 `state.from === '/journal'` 的返回目的地，從這裡進樹頁返回會回地圖（不在這次範圍）。

### 關於曦語 `/about`

2026-10-20 使用者決定，內容取自團隊簡報 v20（只放簡報上的事實，**沒有任何聯絡方式**）。入口是 `/me`「設定與其他」的「關於曦語」；子頁面（不顯示底部導覽），頂端「‹ 我的」連回 `/me`，和 `/shop`、`/wishes` 一樣用 `MobileOnly` 包起來。唯讀、安靜，沿用蠟筆繪本的卡片與字（`--font-voice`、`.card`），沒有新字型與函式庫。程式：`src/pages/AboutPage.tsx`，內容在 `src/features/about/about.ts`。

- **曦語是什麼**：「曦」是清晨第一道陽光，音近「細語」：白天走到樹下，輕聲說心事。xī yǔ・曦光細語，蘊憩身心。Whisper Trees 有雙向的含義：Trees that whisper（樹會低語：我們聆聽樹的聲音）、Trees you whisper to（對樹低語：樹洞承載我們的傾訴）。
- **品牌精神**：慢下來（不刷步數，邀請市民停下腳步，與一棵樹好好相處）、無壓陪伴（私密樹洞，無按讚、無留言，只有溫柔的微光共鳴）、共好城市（每一次打卡、回報與澆水，都在把樹種回台北）。
- **團隊**：「6 位隊員・設計 2・工程 3・計畫管理 1」與「從概念、插畫、數據到打卡機制，一隊打通。」；每位一張卡（`team-member`）：圓形徽章（一個字：愛／R／M／佳／薄／克）、名字、職稱、「本案」做的事、專長（愛皮卡〔概念發起人〕、Ray〔kdan.com 打工仔〕、Mars／瑪斯〔法人單位計畫管理師〕、佳宜〔韌體工程師〕、薄荷〔後端工程師 & 專案經理〕、克洛伊伊〔UI/UX Designer〕，細節在 `about.ts`）。
- **這個 Demo**：一行「台北市政 Debug 松・題目 #1 把樹種回來。」，與一小段指路：樹籍資料是臺北市政府的開放資料、其餘是標了「模擬」的示範資料，詳細的來源與授權說明在「我的」最下面的「設定與其他」（連到 `/me`；沒有複製那一段長說明）。

### Demo 切換台 `/demo-control`

2026-10-20 決定：Demo 模式時**每個頁面（市民端與各後台）頂端都有固定的「Demo 模式・切換 ›」細條**（`demo-badge`；2026-10-20 改成全寬 34 px 的淡琥珀細條、可點範圍 44 px，各頁內容從 `--demo-h` + 10 px 以下開始，所以不和右上的光點餘額擠在一起），點了到這裡；切換台最下面有紅色「離開 Demo 模式」（`demo-exit`，先確認，離開後回首頁）。切換台**只在 Demo 模式顯示**（`?demo=1`，或這次瀏覽已進入 Demo 模式），否則轉回 `/`。在這裡切換「市民端（手機版）」——首頁地圖、集章冊、探索、樹洞、我的——與「後台」——政府端、發包商後台、遊戲營運（GM）、開放 API——並說明「後台寫入限白名單 Google 帳號、其他人是本機示範」。獨立頁面：不在導覽裡、「我的」也不連過去；直接開 `/demo-control?demo=1`，或從桌機開市民端時「請用手機開」頁面上的「Demo 切換台」按鈕（會帶 `?demo=1`）。`/more` 轉址到 `/me`；不認得的網址轉址到 `/`。

### 字型與雲端遷移提示（2026-10-20，批評修正 M）

- **手寫感的聲音**：`--font-voice`（霞鶩文楷 TC，`index.html` 從 Google Fonts 載入 400／700）原本只用在 `h1`–`h3` 與幾個情感句。現在也用在：卡片標題（`.tile > strong`：徽章、商店、圖鑑的名字）、區塊標題（`.me-settings-title`、`.me-hero-title`、`.fog-card-title`、`.tasks-head h2`）、章與區的名字（`.stamp-list strong`、`.atlas-tier`、`.village-row-name`）、關鍵數字（`.atlas-big`、`.stat strong`）、動物與附近的樹的名字。規則在 `src/index.css` 的「地圖與全站（批評修正 M）」，加 `.voice` 工具類別給之後的元件用。**內文、說明、按鈕、表單維持 UI 字（Noto Sans TC）**。楷體在小字會變細，所以這些元素最小 14 px（`font-size: max(1em, 0.875rem)`），更小的文字（`.small`、標籤、註解）不用。
- **雲端遷移提示不是對話框**：第一次進雲端模式、這台裝置有舊的本機紀錄時，原本蓋住整個畫面的對話框會打斷回來的本機使用者看集章冊。改成浮在導覽上方（在中間大按鈕上面）的小卡（`MigrationPrompt`，`data-testid="migrate-banner"`，`role` 是 region、沒有 `aria-modal`、沒有遮罩、不搶焦點），使用者可以先看自己的頁面、切分頁，想處理再按。內容與動作不變：摘要、「也把我的 N 則樹洞存上去」勾選、「存到雲端」（`migrateToCloud`）、「先不要」（`declineMigration`：這台記下已拒絕，之後不再問）；錯誤與「存放中…」也一樣。沒有新增「稍後再問」：維持原本的語意。

### 驗收

- [x] 單元測試（2026-10-20 更新）：4 個分頁加中間掃樹牌的五格順序、`activeTab`（首頁 `/` 是普通分頁）／`showNav`（子頁面與後台沒有導覽）、`centerAction` 永遠是掃樹牌、`scanState` 只在首頁帶樹、關閉掃描頁回 `/`、`/explore`／`/codex` 轉址與 `?tab=`、`journalEntries`（跨樹合併、新到舊、排除示範）。
- [x] 瀏覽器（Playwright 360 px 行動模擬，本機後端，2026-10-19）：5 個分頁都顯示導覽、只有目前的分頁 `aria-current`、點分頁會切換；每個分頁都有餘額晶片且連到 `/shop`；沒有水平捲動；分頁 ≥ 44 px；地圖頁掃樹牌浮鈕在導覽上面、各浮動元件不重疊；點樹的抽屜與新手引導抽屜都在導覽上面；`/shop`、`/demo-control` 沒有導覽；探索頁有佔位、任務卡、圖鑑，捲到圖鑑記下 `viewedCodexAt`；樹洞頁依新到舊列出、點進樹頁、返回回到樹洞；`/codex`→`/explore`、`/more`→`/me`、不認得的網址→`/`；`/me` 有設定區與示範後台連結、沒有任務卡。**沒有在實機（含 iOS 安全區）、雲端模式驗過；`safe-area-inset-bottom` 只在 CSS 裡，桌機模擬下是 0。**
- [x] 第三輪 D（2026-10-20，Playwright 390／360 px、Demo）：附近的樹 3 列各不相同（「茄苳・信義路二段・往西南・約 1 公尺・樹牌 #211045」、「…往西・約 5 公尺・樹牌 #211044」、「…往東・約 5 公尺・樹牌 #211046」），「公尺」不被拆行；單元測試 `bearingTo`／`compassLabel`／`treeNumberTail`。
- [x] 批評修正 E（2026-10-20，Playwright 390／360 px、本機後端、Demo 模式，截圖在 scratchpad `fixE-*.png`）：樹洞分頁 44 px 高、`tabindex` 0／-1、→ 切到我的許願且焦點跟著移、再 → 繞回、End／Home 跳頭尾、選中分頁的 `aria-controls` 與 panel 的 `aria-labelledby` 對得上；附近的樹 8 列只有第一列是 `btn primary`、按鈕 44 px 高、Demo 在範圍內寫「掃樹牌留言」、真實定位（遠處）寫「怎麼走」；「查看樹木」44 px 高、箭頭跟在字後；集章冊分段 44 px、360 px 無水平捲動。**「走過去」列沒有在畫面上走過（Demo 位置旁的 8 棵都在感應圈內），只有單元測試；沒有在實機、雲端模式驗過。**
- [x] `npm test`、`npm run test:rules`、`npm run build` 通過。
- [x] `/me` 批評修正 P（2026-10-20，Playwright 390 與 360 px、本機後端、新使用者與有紀錄的使用者）：動物與小芽在頂部、沒有重複的餘額；「換一隻」就地展開選動物並立刻換、設定區沒有動物選項；進度條有 `role=progressbar` 與 `aria-valuenow／min／max／valuetext`；換裝選項與所有按鈕、連結、單選 ≥ 44 px；光點紀錄預設 3 筆、「看全部」展開 7 筆；有樹的列顯示「樹種・路名」、許願列顯示「路名的願望」、點了到 `/tree/<id>`；2025 年的紀錄顯示年份；徽章區標題下說明為什麼（新使用者「做到一件小事就會亮起」，有紀錄者列出名字）；沒有水平捲動；沒有主控台錯誤。**沒有在實機驗；`TreePage` 返回回地圖（見上）。**
- [x] 批評修正 M（2026-10-20，Playwright 390 與 360 px，Demo，本機無 Firebase）：Demo 細條全寬 34 px、各分頁與地圖的光點餘額在它下面（y 44 px），沒有重疊；掃描頁返回鈕讓開；字型：`/me`、`/shop`、`/explore`、`/journal` 量過上面列的元素都是楷體、沒有任何一個小於 14 px，360 px 沒有水平捲動。遷移提示（用 `setSession({ migration })` 在集章冊上觸發）：不是對話框、頁面後面可以切分頁（點「探索」成功、小卡留著）、在導覽上方、不蓋中間大按鈕、360 px 沒有水平捲動。單元測試（`migrationPrompt.test.tsx`）：沒有遷移就不畫、不是 dialog／modal、內容與動作不變、沒有樹洞就沒有勾選、存放中與錯誤。**遷移提示沒有接 Firebase emulator 實際搬過一次（搬資料的邏輯沒動）；楷體在實機 iOS 小字的粗細沒看過。**
- [x] 第三輪 A 導覽（2026-10-20，Playwright 390 與 360 px，Demo，本機）：導覽依序「首頁（目前）・集章冊・掃樹牌・樹洞・我的」，在集章冊時只有集章冊是目前；從 `/journal`、`/me`、`/stamps` 按掃樹牌都到 `/scan`，按返回都回 `/`；`/explore`、`/codex` 轉址到 `/stamps?tab=explore` 且「探索」被選中、迷霧區在；沒有 console 錯誤。**掃描頁在無頭瀏覽器沒有相機，只驗了關閉；沒有掃成功路徑的新驗證（程式沒動）。**

## 不做

- 真實金流、伺服器端 API（政府端 API、OAuth 與 MCP 只做文件＋前端模擬，見 §7）。帳號已做匿名＋Google 登入；GM 與發包商後台的寫入同樣限白名單帳號，其他人是本機示範。
- 光點帳本存在使用者自己的 `users/{uid}`，不防竄改（已知限制，見 README）。
- 排行榜、好友、聊天。

## 驗收

- [x] 光點規則對齊簡報 v17（2026-10-20）：打卡 +10；同一棵樹第 2、3 個互動 +2、+1、第 4 個起 0；換新樹重新 +10；日照最高 ×1.5（正午約 ×1.5、日出日落 ×1、夜間 ×1）；寂寞樹 ×2～×5（模擬、決定性，自己更近的拜訪優先）；受保護基礎 20（名冊 2026-10-20 接上：單元測試放名單驗證；Playwright 360 px Demo 掃比對到的受保護樹 `DT0162080001`，光點紀錄寫「受保護樹木 基礎 20」，樹的頁面有「受保護樹木」標籤）；樹況回報 +15；澆水 +3；第 11 棵起打卡減半。`points.test.ts` 逐條有單元測試；Playwright 360 px（本機後端、時間固定在 11:30）：Demo 掃示範樹，光點紀錄寫「打卡成功・寂寞樹 ×3（模擬）・日照 ×1.5」，樹洞寫「留樹洞・同一棵樹第 2 個互動…」，回報得 +15。
- [x] 同一棵樹同一天再掃不會重複加。
- [x] 稀有配件（2026-10-20，單元測試 `drops.test.ts` 與 Playwright 360 px Demo 本機後端）：受保護樹木第一次打卡成功掉落古木紋理頭飾、樹的頁面出現一次性卡片；同一棵再掃、另一棵受保護樹木都不再給（每人一件）；遠觀不給；不是受保護樹木不給；我的「換裝」可以穿、有「稀有・受保護樹木」說明、小芽疊上頭飾；商店不賣。
- [x] 樹上住戶（2026-10-20，模擬）：抽籤決定性（同樹同日同人同結果）、機率 0 與 1 的邊界、蟬只在 5～9 月（單元測試）；出現時樹的頁面有卡片、光點紀錄多一筆「樹上住戶：獨角仙（模擬）」+3 且連到那棵樹、圖鑑「樹上住戶」那格從剪影變成日期與樹連結，其餘維持虛線剪影；同一天重掃不再出現（Playwright 360 px，把 GM 機率調到 100 強制出現）；全部標「模擬」；沒有水平捲動。GM 的機率與額外光點可調。
- [ ] 實機打卡的稀有配件與樹上住戶（只在桌機 Playwright 以模擬位置測過）。
- [x] GM 後台（`/gm`）的光點規則編輯器露出上述每個參數（基礎點數、第 2／3 個互動、減半棵數、日照最高、寂寞樹門檻與倍率、受保護基礎、全域倍率），360 px 沒有水平捲動。
- [ ] 實機的真實日出日落與 GPS 打卡的光點（只在桌機 Playwright 以固定時間測過）。
- [ ] GM 改倍率或開活動後，市民端分頁不用重新整理就套用。
- [ ] 商店買造型後光點減少，小芽換上造型；光點不夠時按鈕不能按。
- [ ] 圖鑑（探索頁）在打卡後出現該樹種，棵數與 `species.json` 一致。
- [x] 圖鑑：收集到有照片的樹種顯示照片縮圖與署名，點開有輪播與完整署名、Esc 可關；沒收集到的仍是剪影、不顯示照片；360 px 沒有水平捲動（2026-10-20 Playwright，本機後端）。
- [ ] 發包商完工回報後，市民端「我的許願」顯示已種植。
- [ ] `/developers` 的每個端點都能從試打 console 試打成功（用示範用戶端取得 token）；錯誤 secret 得 401 `invalid_client`、過期或撤銷的 token 得 401 `invalid_token`、scope 不足得 403 `insufficient_scope`。
- [ ] 在 `/gov` 建立用戶端：secret 只顯示一次（關閉或重新整理後看不到）、localStorage 裡沒有明文；撤銷後該用戶端的 token 立刻失效。
- [ ] 用 API 的 `PATCH /cases/{id}` 改狀態後，`/gov` 與市民端「我的許願」跟著變；廠商 token 呼叫 `/cases` 得 403，`/work-orders` 只看得到自己廠商的；廠商 token 的 MCP `tools/list` 只有 2 個工具、政府 token 有 8 個。
- [ ] `/vendor`「我的 API 用戶端」看得到發給該廠商的用戶端與最近呼叫，沒有 secret。
- [x] `/me` 的心情列（2026-10-20，Playwright 360×640 與 390×844，Demo、本機無 Firebase）：有心情時顯示 emoji、名稱與「剛剛」，名稱與時間在 360 寬不折行；「換心情」展開同一個選擇器（目前的已選）、選項與按鈕 ≥ 44 px，換成平靜後列更新、詢問時間不動；「清除心情」後是安靜的邀請與「選心情」、`current` 是 `null`；`/gm` 有心情間隔欄位、預設 8、改成 2 會存；沒有 console 錯誤。**沒有實機；雲端模式沒驗。**
- [x] 「關於曦語」（2026-10-20，同一輪 Playwright）：「設定與其他」有「關於曦語」（≥ 44 px）→ `/about`：6 張隊員卡、徽章 愛 R M 佳 薄 克、沒有水平捲動，「‹ 我的」回 `/me`；單元測試 `about.test.tsx`（6 位、簡報的字、沒有 email 或網址）。**沒有實機。**
- [ ] 所有新畫面寬 360 px 沒有水平捲動，並標示「模擬」。
