# 08 延伸功能（主線之後的示意）

2026-10-19 決定：主線 Demo 能在 2 分鐘內走完後，再加上以下功能。**全部是前端可操作的示意**：同一個靜態站、資料存在 store（localStorage）、畫面標「模擬」。美術一律用佔位檔，清單見 [docs/ui-assets.md](../ui-assets.md)。

現場 2 分鐘 Demo 不走這些畫面；評審或票選民眾可以從底部導覽（集章冊、探索、樹洞、我的）進去看；後台示範是獨立頁面 `/demo-control`（見 §11）。

## 設計原則（沿用 00 的語氣）

- 慢下來、無壓陪伴：**不做排行榜、連續登入、紅點催促、限時倒數**。
- 光點只能「在現場」或「幫城市」得到，不能用錢買。
- 光點的去處要有一部分回到真實世界（認養、捐給補種），不只是換造型。

## 1. 光點經濟 `/me`（餘額在每個分頁右上角）

| 行為 | 光點 | 限制 |
|---|---|---|
| 打卡成功 | +10 | 同一棵樹每天一次 |
| 遠觀模式打卡 | +5 | 同上 |
| 白天打卡（日出到日落） | +2 日照加成 | 夜間沒有加成（04 的夜間「樹木休息中」） |
| 留樹洞 | +3 | 同一棵樹每天一次 |
| 許願 | +5 | |
| 澆水 | +2 | 每個願每天一次（本來就有的限制） |

- 數值由 GM 後台調整（倍率、活動加成）。
- 打卡成功時樹的頁面顯示「光點 +N」小動畫（04 的 P1）。
- 光點紀錄（流水帳）在 `/me` 可以看到。

## 2. 商店 `/shop`

兩類商品：

- **造型**：小芽的帽子、圍巾、樹的頁面相框。只改外觀。
- **回到城市**（模擬）：把光點捐給補種基金、認養一個澆水袋。畫面明講「示意，目前不會真的捐款」。

商品、價格、上下架由 GM 後台管理。

## 3. 圖鑑（`/explore` 下半部；`/codex` 轉址到 `/explore`）

- 列出台北數量最多的樹種（真實資料：`public/data/species.json`，由 `build_web_data.py` 產生），每種顯示全市棵數。
- 在那個樹種的樹打卡過，就「收集」到，顯示第一次遇見的日期與樹籍編號。
- 沒收集到的顯示剪影（佔位圖），不催促。
- **樹種照片（2026-10-20）**：收集到的樹種，卡片縮圖改用該樹種的第一張照片（下緣標攝影者與授權），點縮圖開一個小視窗，裡面是 `PhotoCarousel` 輪播（樹的頁面則每棵樹固定一張，見 [04](04-tree-page.md)「樹種照片」）；Esc 或「關上」收起。沒收集到的仍是剪影，不顯示照片。目前涵蓋最常見的 40 種，其餘樹種維持佔位圖。
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

- 依**累計獲得**的光點長大（花掉不會變小）：種子 0 → 發芽 30 → 小樹苗 100 → 小樹 250 → 大樹 500。
- 可以穿戴商店買的造型。
- **文案（2026-10-20 決定，批評修正 P）**：小芽是陪你的動物種出來的植物，文案只往前看、不講「還差多少」：不寫「再 N 光點長成…」。種子階段「還是一顆安靜的種子。收集到第一道光，牠就會慢慢醒來。」；其餘「一路收集了 N 光點，小芽正慢慢長向「發芽」。」；大樹「小芽已經長成大樹了，謝謝你一路陪著牠。」；小字固定「光點花掉了，小芽也不會變小。」純函式 `growthCopy(earned)`（`src/features/game/character.ts`）回傳 headline／line／note／percent／valuetext，有單元測試（含「不出現再 N 光點、還差」）。
- 進度條是 `role="progressbar"`（`aria-valuemin=0`、`aria-valuemax=100`、`aria-valuenow` = 這一階段走了幾 %、`aria-valuetext` 例如「小芽是發芽，正長向小樹苗，已走了 14%」）。

## 6. 遊戲營運後台（GM） `/gm`

- 光點規則：各行為的點數、全域倍率。
- 活動：名稱、期間、倍率（例如「植樹節雙倍光點」）。期間內市民端顯示活動橫幅。
- 商店：價格、上下架。
- 經濟概況（模擬）：本週發出／回收的光點、捐給補種基金的總數。
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
| `GET /api/v1/reports` | `reports:read` | 樹況回報（含備註）；`kind`、`district` 篩選 |
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
- 樹況回報（04 的 P1）也會變成養護工單。
- 工單依行政區對應到承包廠商（模擬，見 §7），工單上標「承包：○○」。
- 「我的 API 用戶端」：看承辦人發給這家廠商的 OAuth 用戶端（client_id、scope、狀態、最近呼叫），**沒有 secret**；用戶端用 API 接單、施工、完工的規則見 §7。以「目前廠商身分（模擬）」選單切換廠商。
- 頁首標「示範：廠商視角」；寫入限白名單帳號（同 [06](06-gov-console.md)）。

## 9. 新手引導 `/`、`/explore` 與 `/me`

2026-10-19 使用者決定，屬 P1 延伸功能（不擋主線）。分三個切片：S1 資料與徽章（已做）、S2 引導一的畫面與加入主畫面（已做，實機待測）、S3 新手任務卡（已做，實機待測）。

### 決定

- 「能量」就是現有的**光點**，不改名；「樹語」就是現有的**樹洞**。
- 引導可略過、不催促（沿用設計原則：不做紅點、連續登入、倒數）。
- **引導一「收集光點」**：使用者真的收集到光點一次（現場打卡，或 Demo 模式打卡）才算完成，得到「第一道光」。之後帶去加入手機主畫面，得到「回家的路」。
- **引導二「新手任務」**：任務清單，順序不拘；4 項都完成得到「城市的新朋友」。
- **新手禮**：完成引導一（拿到第一道光）送一頂草帽 `hat-straw`。**不送光點**，所以「光點只能在現場或幫城市得到」的原則不變。

### 任務（順序不拘）

| 任務 | 完成條件 | 連結 |
|---|---|---|
| 去商店換上新手禮，或買一件 | 小芽穿上了造型或相框（`inventory.equipped.outfit` 或 `.frame`），或買過任何「回到城市」商品 | `/shop` |
| 看看圖鑑與成就 | 看過圖鑑和 `/me` 的徽章區（`viewedCodexAt` 與 `viewedBadgesAt` 都有） | `/explore`、`/me` |
| 在樹洞留一句話 | 自己留過至少一則樹洞（示範的膠囊不算） | 樹的頁面 |
| 在空樹穴許願 | `myWishIds` 不是空的 | 地圖上的空樹穴 |

全新使用者不靠 GM 補發就能做完：換上新手禮不花光點，許願、樹洞、看圖鑑也都免費。

### 資料與新手禮的規則

- 旗標存在 `ext.onboarding`（雲端是 `users/{uid}.onboarding` 的 map 欄位；規則不用改，`users/{uid}` 本來就是本人可讀寫）：`animal`（陪你的動物，`'blue-magpie' | 'night-heron' | 'squirrel' | 'pangolin'`，沒有或不認得就當 `blue-magpie`；2026-10-19 加，同樣逐欄合併、不需改 `cloud.ts` 與 `firestore.rules`）、`tourStep`、`tourDismissedAt`、`homeScreenAt`、`viewedCodexAt`、`viewedBadgesAt`、`giftAt`、`tasksCollapsed`（收合任務卡）、`newcomerCelebratedAt`（A3 慶祝過）、`firstLightCelebratedAt`（A1 慶祝過）。
- 只能用 `patchOnboarding(partial)` 寫：以目前的值為底合併，雲端以 map 逐欄合併，所以不會蓋掉另一台裝置或舊快取寫的欄位。
- 新手禮**只記 `onboarding.giftAt`**。擁有權由 `inventory()` 推算（`giftAt` 有值就把 `hat-straw` 算進 `owned`，不重複）；`buy('hat-straw')` 回傳「已擁有」。換上草帽走原本的 `equip`，由使用者操作。**不會自動寫入 `ext.inventory` 或 `ext.ledger`**，光點與餘額都不動。
- 自動寫入（偵測從桌面圖示打開、送新手禮）要等**目前這個 uid 的使用者文件載入完成**（`userReady()`／`useUserReady()`）；換 uid（例如用 Google 登入切換）會重設，本機模式與退回本機時一律 ready。`grantStarterGift()` 在 ready 之前什麼都不做。

### 引導一「收集光點」的畫面（S2）

地圖頁下方的小抽屜（`role="dialog"`、`aria-modal="false"`、`data-testid="tour-sheet"`、`data-step`），不擋地圖操作；開著時暫時收起地圖工具，點地圖上的樹或許願時抽屜讓位。步驟邏輯是純函式（`src/features/onboarding/tour.ts`），`tourStep` 存在 `onboarding`。**動物步驟編號是 0，其餘維持 1–4、5 = 走完**（不搬資料）：已存的 `tourStep` 1–5 意思不變；沒存過步驟的新使用者從 0 開始（開著時補存 0）；已經在第 1 步以後的人不會被拉回選動物（得到預設藍鵲，可在 `/me` 換）；「新手引導」重看、或走完後重看，從 0 開始。進度點 5 個（`aria-label`「第 n 步，共 5 步」）：

| 步驟 | 內容 |
|---|---|
| 0 | **選一隻陪你的動物**（2026-10-19 加）：4 選 1（臺灣藍鵲〔預設〕、黑冠麻鷺、赤腹松鼠、穿山甲），佔位美術，點了立刻存、地圖上的人物立刻換（`AnimalPicker`，`data-testid="animal-picker"`、`animal-option-<id>`）。「就牠了」把目前的選擇存成 `onboarding.animal` 並到第 1 步；沒點過就是預設藍鵲。之後可在 `/me` 頂部的「換一隻」換 |
| 1 | 光點是什麼、怎麼得到：表格數值讀 GM 設定的 `gameConfig().points`（打卡、遠觀、樹洞、許願、澆水）。「下一步」 |
| 2 | 去掃樹牌 → `/scan`。「附近沒有樹牌？」說明 Demo 模式（`?demo=1`，已在 Demo 模式就改說明模擬定位） |
| 3 | 第一次拿到光點：慶祝徽章「第一道光」＋新手禮草帽（連到 `/me` 換上、`/shop`）。拿到第一道光就直接跳到這一步 |
| 4 | 加到主畫面：沒綁 Google 的先建議「用 Google 保留紀錄」（說明 iOS 主畫面 App 的儲存空間和 Safari 分開），再給說明。2026-10-20 改成三個可切換的分頁（`tour-install-tabs`）：「iPhone（Safari）」「iPhone（Chrome）」「Android」，預設打開偵測到的那一個（`defaultInstallGuide`；電腦與內建瀏覽器先開 iPhone Safari）。iPhone Safari：點下方「分享」（沒看到就先點「⋯」再點「分享」，iOS 26）→ 分享選單往上滑、往下找「加入主畫面」→ 右上角「新增」；iPhone Chrome：網址列右邊「分享」→「加入主畫面」→「新增」；Android Chrome 有 `beforeinstallprompt` 就給「安裝到主畫面」按鈕（`main.tsx` 一開始就接住事件），否則「⋮」→「加到主畫面／安裝應用程式」，另附三星瀏覽器一行。電腦上多一個網站的 QR Code（`tour-install-qr`），用手機掃了再照做。App 內建瀏覽器（LINE、Threads…）先提示改用 Safari／Chrome 開啟（見 [00](00-overview.md)「App 內建瀏覽器」）。「我加好了」走完 |

- **什麼時候開**：使用者文件已載入（`useUserReady()`，不然看不到有沒有按過「之後再說」）、沒按過「之後再說」、`tourStep` 未走完。還沒拿到第一道光的新使用者一開地圖就看到；**已拿到第一道光的人，只有「開始過」引導（`tourStep` 有存）才會接著看到第 3、4 步**，早就有光點、沒看過引導的人不會被打擾（要看可以從「我的」進）。開著時若 `tourStep` 還沒存，補存 1，讓「開始過」成立。**Demo 模式（`?demo=1`）不自動打開**（2026-10-19 決定：現場展示不多按），從「我的 → 設定與其他 →新手引導」打開過才顯示。
- **之後再說**：記 `tourDismissedAt`，之後不再自動出現。
- **第一道光的慶祝只一次**（2026-10-19 決定）：引導停在第 3 步時由引導畫；否則（按過「之後再說」、Demo 模式、早就有光點的舊使用者）由 `OnboardingEffects` 跳一次慶祝視窗，含新手禮與「到小芽換上」連結。兩種都記 `firstLightCelebratedAt`，不會重複（`firstLightCelebration`）。
- **「我的」的「新手引導」**（`/me` 的「設定與其他」）：把 `tourDismissedAt` 改成 `0`（雲端是逐欄合併，欄位寫 `undefined` 清不掉，所以用 0 表示沒收起），`tourStep` 維持原本停的步驟；已走完或沒開始過就從第 1 步。
- **新手禮**：`OnboardingEffects`（App 層級，不論在哪一頁）在 `userReady` 且有第一道光時呼叫 `grantStarterGift()`，所以在樹的頁面打卡完就送了，不必回地圖。
- **回家的路**：同一個 `OnboardingEffects` 偵測從桌面圖示打開（`matchMedia('(display-mode: standalone)')` 或 `navigator.standalone`），使用者文件載入後若沒有 `homeScreenAt` 就記下並跳出慶祝；換 uid（例如 standalone 內用 Google 登入）會重新檢查，所以 Google 帳號也會記到。`patchOnboarding` 合併寫，不洗掉其他旗標。
- **慶祝元件**（`Celebration`／`CelebrationDialog`）：徽章圖（`<Art id="badge-…">`）、名稱、一句話，輕輕發光（尊重減少動態），可按「好」或 Esc 收起；不加紅點、不計時。
- **PWA**：`public/manifest.webmanifest`（名稱「曦語 Whisper Trees」、短名「曦語」、`display: standalone`、主題色 `#3f7d4e`）、`index.html` 的 manifest／`apple-touch-icon`／`apple-mobile-web-app-capable`／`mobile-web-app-capable`／`apple-mobile-web-app-title`；`public/_headers` 讓 manifest 以 `application/manifest+json` 提供。圖示是 PNG 佔位檔（192、512、180），由 `node scripts/make_placeholders.mjs` 依 `src/assets.ts` 的 `PWA_ICONS` 產生，清單在 [docs/ui-assets.md](../ui-assets.md)。沒有 service worker，不做離線。

### 新手任務卡（S3）

- **/explore 任務卡**（`TasksCard`；2026-10-19 起從 `/me` 搬到 `/explore`，`/me` 不再放，避免重複）（，清單 `tasks-list`、每項 `task-<id>` 帶 `data-done`、`tasks-count`、`tasks-toggle`）：拿到第一道光後出現，4 項依 `tasks()` 推算打勾，順序不拘、可收合（`tasksCollapsed` 存在 `onboarding`）。「在樹洞留一句話」說明「到地圖點一棵樹，進樹的頁面」，「在空樹穴許願」說明「到地圖點一個空樹穴」，連結都回地圖。4 項做完卡片換成一行小字（`tasks-card-done`），不再有按鈕。
- **看過旗標**（`useViewedFlag`）：`/explore` 的圖鑑區（`data-testid="codex-section"`）真的出現在畫面上時記 `viewedCodexAt`（IntersectionObserver）；`/me` 的徽章區（`data-testid="badges-section"`）真的出現在畫面上時記 `viewedBadgesAt`（IntersectionObserver，不支援就在載入時記）。只在使用者文件載入完成、旗標還沒有時寫一次。
- **地圖小入口**（`data-testid="tasks-chip"`，「新手任務 n/4」，連到 `/explore`）：拿到第一道光、引導已收起或走完、任務還沒全做完才出現；平靜的小膠囊，沒有紅點或數量徽章。位置在左下（整組浮動元件都排在底部導覽上面），不和右側地圖工具重疊。判斷是純函式 `showTasksChip`。
- **A3**：`OnboardingEffects` 在使用者文件載入後、4 項都完成、沒有 `newcomerCelebratedAt` 時記下時間並跳出「城市的新朋友」慶祝，只一次（`shouldCelebrateNewcomer`）。早就完成過的舊使用者會在下次開啟時看到一次。
- 雲端不用改：`onboarding` 本來就是 `users/{uid}` 的一個 map 欄位，新旗標照逐欄合併。

### 驗收

S1 資料與徽章

- [x] 流水帳只有 GM 補發（`adjust()`）時，「第一道光」不亮；`award()` 之後才亮。
- [x] 新手禮重複呼叫不會重複送，餘額不變，不寫 `ext.inventory`；`inventory()` 的 `hat-straw` 只出現一次；送出後 `buy(hat-straw)` 回傳已擁有。
- [x] `patchOnboarding` 不會洗掉原有欄位；4 項任務的判斷各有測試；新使用者依序做完（不靠 GM 補發）會拿到「城市的新朋友」；徽章共 12 枚。
- [x] 雲端（模擬器）：伺服器上已有 `inventory.owned = ['frame-spring']` 時，沒收到該資料的舊用戶端送新手禮，伺服器的 `owned` 不變，`inventory()` 兩件都有。
- [x] 雲端（模擬器）：旗標寫入後重啟雲端 store，`getExt('onboarding')` 一樣；伺服器已有 `tourDismissedAt` 時，再寫 `homeScreenAt` 兩個欄位都在。
- [x] `npm test`、`npm run test:rules`（含 `tests/cloud/`）、`npm run build` 通過。

S2 引導一與加入主畫面（已做；桌機 360 px 與單元測試驗過，實機項目待測）

- [x] 新使用者在地圖看到引導；「之後再說」重新整理後仍收起；「新手引導」（2026-10-19 前在選單，現在在 `/me`）從存下的步驟接著看；已有第一道光（沒開始過引導）的人看不到。
- [x] 第一次拿到光點（`award()`，與 Demo 打卡同一條路徑）出現「第一道光」慶祝，新手禮記入 `giftAt`，草帽出現在小芽的背包。**Demo 模式實際走掃描頁需要相機，只用呼叫 `award()` 驗過。**
- [x] 模擬 standalone 啟動只記一次「回家的路」，不洗掉其他旗標；`manifest.webmanifest` 內容類型正確（dev server 驗過；Cloudflare 靠 `_headers`，部署後要再確認）。
- [x] 360 px 沒有水平捲動、輸入框字級至少 16 px（引導裡沒有輸入框）、全部繁體中文。
- [ ] 實機 iPhone（需使用者同意部署後）：加入主畫面、「回家的路」亮起、standalone 內 Google 登入視窗可用；只在桌機測過的項目要註明。
- [x] Demo 模式不自動跳引導、「掃樹牌」按鈕在；拿到第一道光跳一次慶祝視窗，重新整理不再跳；從「新手引導」打開引導後拿到第一道光，由引導第 3 步慶祝、不另跳視窗（2026-10-19 Playwright 360 px，本機後端）。
- [x] 雲端（Firestore 模擬器）下的瀏覽器流程：2026-10-19 用 Playwright（360 px）在模擬器模式走過新使用者、之後再說＋重新整理、從「新手引導」接著看、第一道光慶祝與新手禮；重新整理後旗標仍在，模擬器的 `users/{uid}.onboarding` 是 map 欄位。standalone 在雲端模式只有整合測試涵蓋。

S3 新手任務（已做；本機後端 360 px Playwright 驗過）

- [x] 任務卡（當時在 `/me`，現在在 `/explore`）：4 項各自在真實操作後打勾（換上草帽用 /me 的按鈕；樹洞與許願用 store 函式觸發），重新整理後仍在；看圖鑑區與 `/me` 徽章區會記下看過；地圖「新手任務 n/4」不和其他按鈕重疊，完成後消失。**收合按鈕沒有在瀏覽器裡驗。**
- [x] 完成 4 項只慶祝「城市的新朋友」一次（重新整理後不再出現）。

陪你的動物（2026-10-19，在 §9 引導第 0 步與 `/me` 選；地圖上的人物與點樹行動圈見 [02](02-map.md)）

- [x] 單元測試：`tourView` 新使用者從第 0 步開始（`needsInit`）、已存的 1–5 意思不變、已過第 0 步的人不被拉回、拿到第一道光從第 0 步直接跳第 3 步、`reopenPatch` 從第 0 步重來；`animalOf` 對沒有／不認得的值回傳藍鵲；每隻動物都有佔位素材。
- [x] 瀏覽器（Playwright 360 px，本機後端）：新使用者的引導停在第 0 步（`data-step="0"`、進度「第 1 步，共 5 步」）、預設藍鵲；選穿山甲地圖上的人物立刻換、重新整理仍在；「就牠了」到第 1 步、「上一步」回第 0 步；「之後再說」後到 `/me` 換松鼠，地圖也換；沒有水平捲動。
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
- **點了要看得到（P1）**：地圖高度上限 `55svh`（SVG `meet` 置中，字級不變）；點區或點里之後：(1) 焦點移到卡片標題（`h2 tabindex=-1`，讀屏與鍵盤跟著走，`preventScroll`），(2) 一個 `role="status" aria-live="polite"` 說「已選取大安區，詳細在下方的卡片。」，(3) 卡片平順捲進畫面（`scrollIntoView({block:'nearest'})`，`prefers-reduced-motion` 時不平滑；`scroll-margin-bottom` 讓出導覽列與浮動切換鈕）。**捲動延後到「點兩下」時間窗（350 ms）之後**，否則第一下點完頁面就捲走，第二下會點到別的地方；點兩下進里地圖與 Enter 進入照舊。**取捨**：不做底部抽屜（bottom sheet）——抽屜會蓋住地圖（無法連點、換區要先關閉）、需要焦點陷阱，而卡片留在文件流裡可以邊看地圖邊滑；缺點是卡片可能在螢幕下方，所以才要捲進來。全市層只有一段、不能點的麵包屑不顯示（省一列），進到里或路線才出現。
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

1. **全市**（`city-map`）：`taipei-outline.json` 的 12 區形狀，畫布裁到台北市外框＋70 單位，新北與基隆是較淡的外圍色塊。每區是一個按鈕（SVG `path`，`role="button"`、`aria-pressed`、`aria-label`「大安區：鐵章，3 棵」、Enter／空白鍵可操作、保留 `district-<前綴>`、`data-tier`、`data-count`）。填色像印泥一樣由淺到深：未開始 `#fcf8ec`（空白紙格，虛線邊）、鐵 `#cfe2bf`、銅 `#9dc98c`、銀 `#5fa275`、金 `#e8b645`（`colors.ts`；區名字色與填色對比 ≥ 4.5:1，測試驗證），圖例在地圖下方。區名畫在形狀中央（最大一塊的重心）。點一區：該區亮起（深墨色粗外框），下方出現狀態卡（`district-detail`：區名、章等級、不同的樹棵數、已得的章與日期、進度、光點總數、光點紀錄，沿用舊底部抽屜的內容與 testid）與「進入里地圖」（`enter-villages`）。**點兩下**（同一區 350 ms 內再點一次，`isDoubleTap`；不靠 `dblclick`，iPhone 才可靠；`touch-action: manipulation` 避免放大頁面）或對已選的區再按 Enter，直接進里地圖（2026-10-20 加）。舊的區卡格子與底部抽屜移除；因為每區就是按鈕，不另外放重複的清單。
2. **里**（`village-map`）：`loadVillages(前綴)` 的里，以該區範圍等距圓柱投影（經度乘 cos 緯度，保持長寬比；畫布寬 360、高 240～440）。每個里依「點亮的樹 ÷ 里內的樹」上色（里的比例都很小，所以用對數色階：0 棵 = 空白紙格；只要有 1 棵就從色階 0.25 起跳，一眼看得出變化；3 成以上滿格；`rampT`／`rampColor`；顏色分五格像印泥加深，不連續內插，因為連續內插會經過任何字色都不到 4.5:1 的中間亮度）。「點亮」= 這一區打卡過的不同的樹（成功或遠觀，與集章同一算法），座標來自 `public/data/trees/<前綴>.json`（`villageTrees.ts` 另外載入同一個檔案，`src/lib/trees.ts` 的快取沒有匯出），再用 `countLitByVillage` 歸到里。里名放得下才顯示（外框寬容得下整個名字），放不下的點了在卡片上看；太小點不到的里改用地圖下方的「里列表」（見下）。點一個里：卡片「XX里：已點亮 3／412 棵」（`village-progress`）與「規劃路線」（`plan-route`；沒有樹或全部點亮時停用）。畫面下方一行出處（見下「出處」）。
3. **路線**（`route-view`）：從使用者的位置（`useAnchor`：真實 GPS，Demo 模式用模擬位置）出發，走訪這一里**最近的、還沒點亮的**樹，最多 8 棵。候選樹 = 該區樹檔裡落在這個里（`inVillage`）且未點亮者，依直線距離取最近 60 棵交給 `src/lib/route.ts` 的 `planTreeTour`（路網 `loadRoadGraph(前綴)`）。MapLibre 地圖（沿用 `MAP_STYLE`、`MAP_LOCALE`）畫起點（你的位置）、依序編號的樹、終點與沿路的線；摘要「約 1.2 公里・步行 16 分鐘・8 棵」（`route-summary`）、停靠樹清單（連到樹的頁面）、「建議路線，只含具名道路」。沒有位置（沒給定位權限）顯示「需要你的位置才能規劃路線（或用 Demo 模式）」；位置移動或點亮新樹時路線會重算。
   **開始（2026-10-20）**：摘要下方有主要按鈕「開始」（`route-start`）：把這條路線（里名、區名、起點、停靠樹與座標、整條路線、公尺、分鐘、`startedAt`）存成「進行中的路線」並回首頁 `/`，大地圖畫出這條路線、編號的停靠樹與頂端列（已點亮 N／M 棵、看全程、結束），走過（開始後打卡）的站打 ✓；細節與驗收見 [02-map「里路線」](02-map.md)。進行中的路線只存在這個分頁（sessionStorage），按「結束」清掉；再按一次「開始」會換成新的路線。

限制：路線是建議，只含具名道路（由 `route.ts` 決定）；候選樹只看直線最近的 60 棵；沒有真實手機上的 GPS 驗證。

### 畫面（舊版，已被上面的「地圖（C）」取代；保留給「依取得時間」與抽屜內容的參考）

- 兩種檢視（切換鈕 `view-map`／`view-time`）：
  1. **示意地圖**（`stamp-map`）：12 張區卡用 CSS grid 大致排成台北的方位（北投、士林、內湖在上，大同、中山、松山、南港中間，萬華、中正、大安、信義在下，文山在最下），不是精確地圖；4 欄、寬 360 px 不水平捲動。每張卡（`district-<前綴>`，`data-tier`、`data-count`）顯示區名、目前最高的章（沒有就「未開始」）、不同的樹棵數。
  2. **依取得時間**（`stamp-list`，每枚 `stamp-item`）：所有已得到的章，新的在前，顯示區名、章、日期；沒有章時顯示說明（`stamp-list-empty`）。
- 點區卡開底部抽屜（`district-detail`，`role="dialog"`，可按「關閉」或 Esc）：已得到的各級章與日期、進度（`district-progress`，例如「7／10，再 3 棵拿銅章」；金章後「已集滿金章」）、該區累計光點（`district-light-total`）、可展開的光點明細（`district-ledger-toggle`、`district-ledger`；每筆日期、樹籍編號或許願路名、行為名稱、+N）。

### 驗收

- [x] 單元測試：前綴對照（含讀 `public/data/trees` 驗證）、不同的樹只算一次、鐵／銅／銀／金門檻、`earnedAt`（重複打卡與亂序不影響）、key 解析、光點歸區（含許願與澆水走許願的行政區、排除無 key／花費／GM 補發／查不到的）。
- [x] 瀏覽器（Playwright 360 px，本機後端，2026-10-19）：種入打卡與流水帳後，示意地圖與依時間兩種檢視沒有水平捲動；區卡章與棵數正確；抽屜的進度、光點、明細（含許願與澆水歸到許願所在的區）與 Esc／關閉可用；沒有章時顯示說明；入口當時是 `/me` 與選單，現在是底部導覽。**沒有走真實掃碼打卡，也沒有在雲端模式或實機驗過。**
- [x] 背景（2026-10-19）：`uv run scripts/build_admin_outline.py --check` 確認 12 區名稱與 `districts.ts` 一致、檔案 < 60 KB；單元測試（`outline.test.ts`）檢查解析、12 區、大小；瀏覽器（Playwright 360 px，本機）：背景有畫、沒有水平捲動、擋掉資料檔（404）時沒有背景與出處、其餘照常。**沒有在實機與雲端模式驗過。**
- [x] 里（資料，2026-10-19）：`uv run scripts/build_villages.py --check` 確認 456 個里、12 個檔案、每檔 < 150 KB、幾何有效；各區 `total` 加總 = 162,355（全部 162,406 棵，51 棵不在任何里）；單元測試（`villages.test.ts`）檢查 `villageOf`（含洞、MultiPolygon、區外）、`countLitByVillage`（同一棵只算一次）、讀真實 `DA.json` 驗證形狀與樹的座標落在對的里。**還沒有畫面。**
- [x] 地圖（C，2026-10-19）：單元測試（`stamps-map.test.ts`）檢查路徑解析與重心、12 區標籤位置、五級配色與對比、色階（0 棵暗、1 棵有變化、單調、字色對比 ≥ 4.5:1）、投影（長寬比、北在上、退化範圍）、里名放得下與否、讀真實 `DA.json` 投影、打卡樹歸里與候選樹過濾、摘要文字；瀏覽器（Playwright 360 px，Demo 模式、種入大安打卡，本機）：全市配色、點大安出現狀態卡、進入里地圖、點亮的里變亮、卡片「已點亮 3／137 棵」、規劃路線畫出 8 個停靠點與摘要、無水平捲動、Enter 鍵可選區。**路線目前用的是暫時的直線版 `route.ts`（等路網版合併）；沒有驗證沒有位置時的提示、沒有在實機與雲端模式驗過。**
- [x] `npm test`、`npm run test:rules`、`npm run build` 通過。
- [x] 批評修正 S（2026-10-20，Playwright 390×844 與 360×740，行動裝置模擬、觸控，本機 Demo 模式、種入大安 14 棵與大同 1 棵）：點大安後狀態卡標題整個在導覽列上方、不用手動捲動；焦點在卡片標題；aria-live 有報；`prefers-reduced-motion` 下用鍵盤 Enter 選區也移焦點；連點兩下進里地圖；里地圖 0 個 Tab 停靠點；「用列表選里」列出 53 個里、每列 52 px 高、點第一列出卡片且在畫面內；切換鈕在畫面下方、每個鈕 44 px；大同、萬華各有 44 px 點擊圈；三種畫面都沒有水平捲動。單元測試（`stamps-map.test.ts`）：新配色對比與可分辨、色階逐格、點擊圈（含真實 12 區）、里列表排序（含真實 `DA.json`）、出處文字。**沒有在實機（iPhone 觸控、VoiceOver）驗過；SVG 濾鏡的紙感只在 Chromium 看過，Safari 與低階手機沒驗。**

## 11. 導覽、探索、樹洞、示範後台（S4）

2026-10-19 使用者決定。取代原本地圖右上角的「我的許願」「選單」與 `/more` 選單頁。

### 底部導覽

- 5 個分頁，順序固定：集章冊 `/stamps`、探索 `/explore`、首頁 `/`（地圖）、樹洞 `/journal`、我的 `/me`。分頁清單與「目前在哪一頁」是純函式（`src/features/nav/tabs.ts`：`TABS`、`activeTab`、`showNav`），有單元測試。
- 只顯示在這 5 個**分頁根頁面**（`TabLayout`）；`/tree/:id`、`/shop`、`/scan`、`/wishes` 是子頁面，沒有導覽、用返回連結；`/gov`、`/vendor`、`/gm`、`/developers`、`/demo-control` 也沒有。桌機閘門（`MobileOnly`）不變。
- 每個分頁 ≥ 44 px 高（56 px + 底部安全區 `safe-area-inset-bottom`），目前的分頁 `aria-current="page"`、字加粗、圖示加粗；沒有紅點或數字。360 px 寬 5 等分（各 72 px）。`data-testid`：`bottom-nav`、`tab-stamps`、`tab-explore`、`tab-home`、`tab-journal`、`tab-me`。
- 右上角光點餘額（`BalanceChip`，`data-testid="balance-chip"`，「✦ N 光點」，`aria-label`「光點 N，前往商店」）連到 `/shop`；每個分頁頁首（`TabHeader`）與地圖右上都有。
- 地圖頁的浮動元件（任務小入口、右側工具、圖層面板、署名）全部排在導覽上面（CSS 變數 `--nav-h`、`--map-base`）；點樹／許願的抽屜與新手引導抽屜也坐在導覽上面，導覽一直看得到。集章冊的區抽屜（`position: fixed`）會蓋過導覽，關閉就回來。
- 從樹洞點進樹的頁面，返回回到樹洞（路由 state `from`）；其他來源回地圖。

### 探索 `/explore`

由上到下：「探索地圖」區（`data-testid="fog-slot"`，放迷霧地圖 `FogMap`；打開時看你走過的地方、還沒打卡時是附「去找一棵樹」的空狀態卡、載入失敗有重試，見 [09 迷霧](09-fog.md)）、新手任務卡（`TasksCard`）、樹的圖鑑（`CodexSection`，從原 `CodexPage` 抽出；搜尋、遇見的樹種、`data-testid="codex-section"`）。`/codex` 轉址到 `/explore`。

### 樹洞 `/journal`

- 上方「附近的樹」（`journal-nearby`，2026-10-19 加）：用和地圖同一個 `useAnchor`（真實 GPS 或 Demo 模擬位置），從 z16 樹木圖磚（`public/data/tree-tiles`，`nearby.ts` 內建簡易解碼）取 150 公尺內、近到遠最多 8 棵（`pickNearby`）；先列 3 棵，其餘按「看更多（還有 N 棵）」（`journal-nearby-more`）才展開，讓下面的日記與許願不被擠到很下面（2026-10-19 決定）。每列（`journal-nearby-item`）樹種、路名、「約 N 公尺」，和一顆按鈕（2026-10-20 決定：要先走過去）：在打卡範圍內（`ringRadius`，和地圖感應圈同一個半徑）是「掃樹牌留言」（`journal-nearby-leave`；2026-10-20 批評修正 E：這顆按鈕其實是去掃樹牌，不寫「留言」以免說得比做得多；30 分鐘內已在這棵樹打卡過才寫「留言」，`nearbyLabel`）；太遠時 Demo 是「走過去」（`journal-nearby-walk`，模擬位置移到樹旁，列表跟著重算、那棵變成「留言」），真實定位是「怎麼走」（`journal-nearby-route`，回首頁地圖，用 `state.routeTreeId` 飛到那棵樹並直接畫出步行路線）（`nearbyAction`）。只有最近的那一列是主要按鈕（實心綠），其餘是外框按鈕，免得幾顆一樣重；按鈕的 `aria-label` 帶樹種（「掃樹牌留言：茄苳」）。版面：「我的日記／我的許願」在上，附近的樹在下。沒有位置時顯示「還沒有你的位置。打開定位，或用 Demo 模式。」
- 「留言」仍要先打卡（QR + GPS）：這棵樹 30 分鐘內有有效打卡（`recentCheckin`）就進 `/tree/:id#whisper`，否則進 `/scan`，帶 `state.hintTreeId`（`leaveTarget`；和導覽中間的「掃樹牌」大按鈕同一個介面），掃描頁顯示「要打卡的是：…」。
- 分段切換（`journal-tabs`）：「我的日記」（`journal-tab-diary`）與「我的許願」（`journal-tab-wishes`）。用全站共用的 `Segmented`（`src/components/Segmented.tsx`，批評修正 E）：按鈕 ≥ 44 px 高；樹洞用 `mode="tabs"`——`role=tablist／tab／tabpanel`、`aria-selected`、選中的分頁 `aria-controls` 指向 panel、panel `aria-labelledby` 指回分頁、roving tabindex（只有選中的在 Tab 順序裡）、左右鍵（頭尾相接）與 Home／End 切換並移動焦點（純函式 `tabKeyTarget`，`src/components/tabsKeys.ts`）；集章冊與政府端的 `.segmented` 沿用同一個 class（`aria-pressed` 的一組按鈕），樣式一致。焦點框畫在按鈕裡面。
- 我的日記：我在所有樹留下的話，新到舊（`journalEntries`，只看 `state.whispers`，不含示範膠囊；雲端模式也是同一份）。每則（`journal-item`，列表 `journal-list`）顯示日期時間、「行政區・樹種」（查不到就顯示樹籍編號）、內容，和「查看樹木」（`journal-view-tree`）連到 `/tree/:id`：綠色字加底線與箭頭、可點範圍 44 px 高、文字和上面的內容對齊同一欄（不再是看起來像殘留文字的幽靈按鈕）。沒有時顯示 `journal-empty`。
- 我的許願：`MyWishes`（與 `/wishes` 共用的元件，`data-testid="my-wishes"`）。`/wishes` 仍可用，返回連到樹洞。
- 原本地圖「我的許願」按鈕上的「有新進度」小圓點已移除（不做紅點）；許願卡本身的「進度更新了」標示仍在。

### 我的 `/me`

2026-10-20 使用者決定（批評修正 P）：由上到下**四塊主內容**加一個安靜的設定區，風格是蠟筆繪本（暖色紙底、不對稱圓角、腳下一塊草地），平靜、不放缺什麼的壓力語氣。

1. **頂部（`MeHero`，`data-testid="me-hero"`）**：陪你的動物（地圖上的那一隻，`useAnimal`，`me-animal`）和小芽（含身上的造型）站在一起，標題「臺灣藍鵲和小芽・發芽」，下面是成長一句話、進度條（`sprout-progress`，見 §5）。**餘額不在這裡**，只在右上角晶片（`BalanceChip`）出現一次，卡片裡不重複。動物那一列有一句簡介與「換一隻」按鈕（`swap-animal`，≥ 44 px，`aria-expanded`）：點了就地展開同一個 `AnimalPicker`（TourSheet 也用它，介面沒變），點動物立刻存、頂部的動物與地圖都跟著換；再按「收起」。設定區不再有動物選項。
2. **換裝**（`OutfitCard`，擁有造型或相框才出現）：選項 ≥ 44 px 高，目前穿的 `aria-pressed`，分「小芽的造型」「樹的頁面相框」兩組。
3. **光點紀錄**（`LedgerSection`，`ledger-section`）：預設只列最近 3 筆，「看全部（N 筆）」（`ledger-more`）展開、可再收回。每列：原因、哪棵樹或哪個願望、日期時間（`formatDayTime`）、光點。打卡、遠觀、日照、樹洞這類 key 帶樹籍編號的，查 `findTree` 顯示「樹種・路名」並連到 `/tree/:id`；許願與澆水顯示「路名的願望」連到 `/wishes`；花費與 GM 補發沒有 key，只顯示原因、不能點。解析是純函式（`src/features/account/ledgerRows.ts`，用 `parseLedgerKey`），有單元測試。扣掉的光點用琥珀色、不用紅色。
4. **成長徽章**（`badges-section`，預設收合，細節見 §4）。
5. **設定與其他**（`me-settings`，縮在底下、不做成卡片、標題用次要色）：新手引導（`reopen-tour`）、帳號（雲端模式：Google 保留、登出）、Demo 工具（開／離開 Demo 模式）、資料來源說明、最後才是紅字的清除（雲端：刪除）資料。**不連到示範後台**（2026-10-20 決定：`/demo-control` 是獨立頁面，市民端不放入口）。商店、圖鑑、集章冊的按鈕已移除（餘額晶片、探索、集章冊分頁取代）。
6. **頁尾**（`me-closing`）：陪你的動物加一句「光點只能在樹旁或幫城市得到，不能用錢買。沒有排行榜，也不用每天來，（動物名）和小芽會在這裡等你。」——以溫暖的一句收尾，不以紅字收尾。

已知：`TreePage` 目前只認得 `state.from === '/journal'` 的返回目的地，從這裡進樹頁返回會回地圖（不在這次範圍）。

### Demo 切換台 `/demo-control`

2026-10-20 決定：Demo 模式時**每個頁面（市民端與各後台）頂端都有固定的「Demo 模式・切換 ›」細條**（`demo-badge`，可點範圍約 44 px，各頁已讓出位置），點了到這裡；切換台最下面有紅色「離開 Demo 模式」（`demo-exit`，先確認，離開後回首頁）。切換台**只在 Demo 模式顯示**（`?demo=1`，或這次瀏覽已進入 Demo 模式），否則轉回 `/`。在這裡切換「市民端（手機版）」——首頁地圖、集章冊、探索、樹洞、我的——與「後台」——政府端、發包商後台、遊戲營運（GM）、開放 API——並說明「後台寫入限白名單 Google 帳號、其他人是本機示範」。獨立頁面：不在導覽裡、「我的」也不連過去；直接開 `/demo-control?demo=1`，或從桌機開市民端時「請用手機開」頁面上的「Demo 切換台」按鈕（會帶 `?demo=1`）。`/more` 轉址到 `/me`；不認得的網址轉址到 `/`。

### 驗收

- [x] 單元測試：分頁順序與標籤、`activeTab`／`showNav`（子頁面與後台沒有導覽）、`journalEntries`（跨樹合併、新到舊、排除示範）。
- [x] 瀏覽器（Playwright 360 px 行動模擬，本機後端，2026-10-19）：5 個分頁都顯示導覽、只有目前的分頁 `aria-current`、點分頁會切換；每個分頁都有餘額晶片且連到 `/shop`；沒有水平捲動；分頁 ≥ 44 px；地圖頁掃樹牌浮鈕在導覽上面、各浮動元件不重疊；點樹的抽屜與新手引導抽屜都在導覽上面；`/shop`、`/demo-control` 沒有導覽；探索頁有佔位、任務卡、圖鑑，捲到圖鑑記下 `viewedCodexAt`；樹洞頁依新到舊列出、點進樹頁、返回回到樹洞；`/codex`→`/explore`、`/more`→`/me`、不認得的網址→`/`；`/me` 有設定區與示範後台連結、沒有任務卡。**沒有在實機（含 iOS 安全區）、雲端模式驗過；`safe-area-inset-bottom` 只在 CSS 裡，桌機模擬下是 0。**
- [x] 批評修正 E（2026-10-20，Playwright 390／360 px、本機後端、Demo 模式，截圖在 scratchpad `fixE-*.png`）：樹洞分頁 44 px 高、`tabindex` 0／-1、→ 切到我的許願且焦點跟著移、再 → 繞回、End／Home 跳頭尾、選中分頁的 `aria-controls` 與 panel 的 `aria-labelledby` 對得上；附近的樹 8 列只有第一列是 `btn primary`、按鈕 44 px 高、Demo 在範圍內寫「掃樹牌留言」、真實定位（遠處）寫「怎麼走」；「查看樹木」44 px 高、箭頭跟在字後；集章冊分段 44 px、360 px 無水平捲動。**「走過去」列沒有在畫面上走過（Demo 位置旁的 8 棵都在感應圈內），只有單元測試；沒有在實機、雲端模式驗過。**
- [x] `npm test`、`npm run test:rules`、`npm run build` 通過。
- [x] `/me` 批評修正 P（2026-10-20，Playwright 390 與 360 px、本機後端、新使用者與有紀錄的使用者）：動物與小芽在頂部、沒有重複的餘額；「換一隻」就地展開選動物並立刻換、設定區沒有動物選項；進度條有 `role=progressbar` 與 `aria-valuenow／min／max／valuetext`；換裝選項與所有按鈕、連結、單選 ≥ 44 px；光點紀錄預設 3 筆、「看全部」展開 7 筆；有樹的列顯示「樹種・路名」、許願列顯示「路名的願望」、點了到 `/tree/<id>`；2025 年的紀錄顯示年份；徽章區標題下說明為什麼（新使用者「做到一件小事就會亮起」，有紀錄者列出名字）；沒有水平捲動；沒有主控台錯誤。**沒有在實機驗；`TreePage` 返回回地圖（見上）。**

## 不做

- 真實金流、伺服器端 API（政府端 API、OAuth 與 MCP 只做文件＋前端模擬，見 §7）。帳號已做匿名＋Google 登入；GM 與發包商後台的寫入同樣限白名單帳號，其他人是本機示範。
- 光點帳本存在使用者自己的 `users/{uid}`，不防竄改（已知限制，見 README）。
- 排行榜、好友、聊天。

## 驗收

- [ ] 打卡成功後光點 +10（白天再 +2），同一棵樹同一天再掃不會重複加。
- [ ] GM 改倍率或開活動後，市民端分頁不用重新整理就套用。
- [ ] 商店買造型後光點減少，小芽換上造型；光點不夠時按鈕不能按。
- [ ] 圖鑑（探索頁）在打卡後出現該樹種，棵數與 `species.json` 一致。
- [x] 圖鑑：收集到有照片的樹種顯示照片縮圖與署名，點開有輪播與完整署名、Esc 可關；沒收集到的仍是剪影、不顯示照片；360 px 沒有水平捲動（2026-10-20 Playwright，本機後端）。
- [ ] 發包商完工回報後，市民端「我的許願」顯示已種植。
- [ ] `/developers` 的每個端點都能從試打 console 試打成功（用示範用戶端取得 token）；錯誤 secret 得 401 `invalid_client`、過期或撤銷的 token 得 401 `invalid_token`、scope 不足得 403 `insufficient_scope`。
- [ ] 在 `/gov` 建立用戶端：secret 只顯示一次（關閉或重新整理後看不到）、localStorage 裡沒有明文；撤銷後該用戶端的 token 立刻失效。
- [ ] 用 API 的 `PATCH /cases/{id}` 改狀態後，`/gov` 與市民端「我的許願」跟著變；廠商 token 呼叫 `/cases` 得 403，`/work-orders` 只看得到自己廠商的；廠商 token 的 MCP `tools/list` 只有 2 個工具、政府 token 有 8 個。
- [ ] `/vendor`「我的 API 用戶端」看得到發給該廠商的用戶端與最近呼叫，沒有 secret。
- [ ] 所有新畫面寬 360 px 沒有水平捲動，並標示「模擬」。
