# 資料庫：已接上與待接

給接手資料庫串接的開發者。安全規則以 `firestore.rules` 為準，部署與 console 設定見 [firebase-setup.md](firebase-setup.md)。

## 架構

- **所有資料存取都經過 `src/store/`**，元件不直接碰 Firestore 或 localStorage。
- 後端有三種，由 `.env.local` 決定（`src/lib/firebase.ts`）：
  - 設了 `VITE_FIREBASE_*`：正式 Firestore（`src/store/cloud.ts`）。
  - 再加 `VITE_FIREBASE_EMULATOR=1`：本機 Emulator，不碰正式專案。
  - 都沒設：localStorage（`src/store/index.ts`）。
- 登入：一律匿名自動登入；可以在「我的 → 設定與其他」連結 Google。Firestore 只存 uid，不存 email 或姓名。
- **後台寫入**（政府端、發包商、GM）限 `admins/{uid}` 白名單；白名單只能在 console 建立。不是白名單的人在後台的操作只寫進本機覆寫層（`src/store/overlay.ts`，「示範：只在這台裝置」），疊在雲端資料上顯示，不會寫進雲端。

## 已接上 Firestore

| 功能 | 位置 | 誰能讀 | 誰能寫 |
|---|---|---|---|
| 打卡、自己的許願清單、澆水紀錄、自己的回報清單 | `users/{uid}`：`checkins`、`myWishIds`、`watered`、`myReportIds` | 本人 | 本人 |
| 光點流水帳、物品與造型、新手引導、心情、我的日記 | `users/{uid}`：`ledger`、`inventory`、`onboarding`、`mood`、`diary` | 本人 | 本人 |
| 樹洞留言 | `users/{uid}/whispers/{id}` | 本人 | 本人新增、刪除；不能修改 |
| 許願 | `wishes/{id}` | 登入者 | 本人新增；進度（`history`）限白名單 |
| 澆水 | `wishes/{id}/waterings/{uid_日期}`、`wishStats/{id}.water` | 登入者 | 每人每天每個許願一次 |
| 示範許願的進度 | `wishOverrides/{id}` | 登入者 | 白名單 |
| 樹況回報 | `reports/{id}` | 登入者 | 本人新增 |
| 回報的私人備註 | `reports/{id}/private/note` | 白名單 | 本人新增 |
| 移樹公告的意見 | `notices/{id}/opinions/{uid}` | 本人與白名單 | 本人 |
| 發包商工單 | `vendorOrders/{id}` | 登入者 | 白名單 |
| GM 參數 | `config/gm` | 登入者 | 白名單 |
| 後台白名單 | `admins/{uid}` | 本人 | 只能在 console 建立 |

詳細欄位、長度上限與驗證寫在 `firestore.rules` 和 `src/store/cloud.ts`；規則測試在 `tests/rules/`，雲端 store 測試在 `tests/cloud/`。

## 還是模擬或只存在本機（需要幫忙的地方）

依建議的優先順序排列。

| # | 功能 | 現在 | 接起來要做什麼 | 難度 |
|---|---|---|---|---|
| 1 | **樹況回報的處理狀態**（政府端標記處理中、已派工、已完成） | 只存在本機覆寫層（`src/features/api/clientStore.ts` 的 `reportReviews`），換一台裝置就看不到；市民也看不到自己的回報處理到哪 | 新增 `reports/{id}` 的處理狀態欄位或子集合，寫入限白名單，市民讀得到自己的；補規則測試 | 中 |
| 2 | **寂寞樹的「上次有人拜訪」** | 由樹籍編號當種子固定產生（`src/features/game/visits.ts`），約 22% 的樹被當成 30～120 天沒人去 | 每棵樹一份公開文件（例如 `treeVisits/{treeId}.lastAt`），打卡時更新；規則限制只能寫成伺服器時間、不能往回改 | 中 |
| 3 | **樹的頁面「本週微光陪伴人數」** | 以固定種子產生，每週變一次（`src/lib/seed.ts`、`src/pages/TreePage.tsx`） | 每棵樹每週一個計數，打卡時加 1；規則限制每人每週只能加一次（可仿照澆水的 `waterings` 做法） | 中 |
| 4 | **移樹前公告** | 公告本身是 `src/mock/notices.json`；意見已經存進 Firestore | 公告改存 `notices/{id}`，寫入限白名單 | 低 |
| 5 | **GM 後台的全市統計**（全市本週發出／回收的光點、玩家列表、客訴） | `src/mock/players.json` | 需要讀所有人的資料做彙總，見下方「彙總的做法」 | 高 |
| 6 | **開放 API／MCP 的用戶端與呼叫紀錄** | 瀏覽器裡的模擬閘道，資料只存在本機覆寫層 | 需要真正的伺服器；Demo 階段不做 | — |
| 7 | 「以台北通登入」 | 只有畫面 | 不做 | — |

改完任何一項，要同步更新 README 的「模擬資料」表。

### 彙總的做法

第 2、3、5 項都要統計所有人的資料，但規則不讓使用者讀別人的文件。有兩種做法：

- **公開計數文件**：每棵樹或每週一份文件，用 `increment(1)` 加數，規則限制每次只能加 1、每人只能加一次（澆水就是這樣做）。不用另外花錢，但規則要寫得嚴，測試要多。
- **Cloud Functions**：由伺服器端彙總。要把專案升級到 Blaze 方案、可能產生費用，需要專案擁有者決定。

第 2、3 項建議用公開計數文件；第 5 項要用 Cloud Functions 才做得乾淨。

## 開發流程

1. 從 `main` 開分支，完成後發 PR，不要直接改 `main`。
2. 開發時連 Emulator（`.env.local` 加 `VITE_FIREBASE_EMULATOR=1`），不要拿正式資料庫當測試場；正式資料評審看得到。
   - 啟動：`firebase emulators:start --only firestore,auth --project demo-whisper-trees`（Firestore 8080、Auth 9099，需要 `brew install openjdk`）。
3. 新的集合或欄位：先改 `firestore.rules`，補 `tests/rules/` 的測試，跑 `npm run test:rules` 全過。
4. 前端只改 `src/store/`（雲端實作在 `cloud.ts`，本機實作在 `index.ts`，兩邊都要有），元件透過 store 的函式與 hook 取資料。
5. 送出前跑 `npm test`、`npm run lint`、`npm run build`。
6. **部署順序**：規則先部署，新版網站再上線；兩者都由專案擁有者執行。
7. 不存個資：只存 uid；任何讓使用者打字的欄位都要提醒「勿填個資」，並在規則限制長度。
