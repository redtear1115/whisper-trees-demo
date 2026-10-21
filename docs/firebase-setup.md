# Firebase 設定

專案 ID `whisper-trees-demo`（免費 Spark 方案，不綁卡）。安全規則的唯一來源是 `firestore.rules`（開頭有設計註解）。

## 需要的設定

| 項目 | 做法 |
|---|---|
| Firebase 專案與 Web app | 在 Firebase console 建立；Web config 的 6 個值寫入本機 `.env.local`（不進版控） |
| Firestore | Native 模式，位置 `asia-east1` |
| Security Rules | 部署 `firestore.rules`，步驟見下 |
| Auth | 啟用「匿名」與「Google」，並設定授權網域 |
| 白名單 `admins/{uid}` | 只能在 console 建立，見下 |
| API key 的 HTTP referrer 限制 | 見下 |
| 註冊配額 | 活動期間調高「每個 IP 每小時可建立的帳號數」，避免會場 Wi-Fi 共用 IP 時匿名登入失敗 |

## 部署安全規則

改規則後，先跑 `npm run test:rules`（本機 emulator，需要 `brew install openjdk`），通過才部署。規則要先於新版網站部署。

部署需要 gcloud 已登入有權限的帳號；兩個請求都要帶 `X-Goog-User-Project`，少了會建立失敗：

```sh
TOKEN=$(gcloud auth print-access-token)
python3 -c "import json;print(json.dumps({'source':{'files':[{'name':'firestore.rules','content':open('firestore.rules').read()}]}}))" > /tmp/ruleset.json
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "X-Goog-User-Project: whisper-trees-demo" -H "Content-Type: application/json" \
  https://firebaserules.googleapis.com/v1/projects/whisper-trees-demo/rulesets --data @/tmp/ruleset.json
# 用回傳的 name 更新 release
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "X-Goog-User-Project: whisper-trees-demo" -H "Content-Type: application/json" \
  https://firebaserules.googleapis.com/v1/projects/whisper-trees-demo/releases/cloud.firestore \
  -d '{"release":{"name":"projects/whisper-trees-demo/releases/cloud.firestore","rulesetName":"<ruleset name>"}}'
```

## 網域

正式網址 `https://whisper-trees-demo.southern-light.dev`（Cloudflare Pages 專案 `whisper-trees`，DNS 為 Cloudflare 的 CNAME）。換網域要同時加 Firebase 授權網域與 API key 的 HTTP referrer，否則新網域上匿名登入、Google 登入、Firestore 都會失敗。

## Auth 設定（console）

1. Firebase console › Authentication →「開始使用」。
2. 登入方式：啟用「匿名」與「Google」。
3. 設定 › 授權網域：新增 `whisper-trees-demo.southern-light.dev`（`localhost` 預設已有）。
4. 不要升級到 Identity Platform（免費方案會有每日 3,000 名活躍使用者上限）。

## 後台白名單

1. 用要給權限的 Google 帳號在網站上「用 Google 保留紀錄」登入一次。
2. console › Authentication › Users 找到那一列的使用者 UID。
3. console › Firestore › 新增集合 `admins`，文件 ID 填那個 UID，欄位隨意（例如 `note: "政府端示範"`）。
4. 不要把 email 寫進文件或 repo。

`admins` 只能在 console 建立，網站上任何人（包括管理者）都不能寫入。

## API key 限制

GCP console › API 和服務 › 憑證 › 瀏覽器金鑰：應用程式限制選 HTTP referrer，允許
`https://whisper-trees-demo.southern-light.dev/*`、`https://whisper-trees-demo.firebaseapp.com/*`、`http://localhost:5173/*`、`http://127.0.0.1:5173/*`、`http://localhost:4173/*`。API 限制維持原有的服務清單，只加不刪。

`whisper-trees-demo.firebaseapp.com` 一定要留：Google 登入的彈窗頁在這個網域，也用同一把 key，拿掉 Google 登入就會壞。

## 連不上雲端時（連線狀態）

網站不會退回本機模式，一直留在雲端模式。連不上時的寫入由 Firestore 的本機快取排著、連回來就同步；頂端顯示一行連線狀態（`ConnectionBanner`，`connection-banner`，`data-state`），連回來就自己消失。規則在 `src/store/unavailable.ts`（單元測試），雲端測試是 `tests/cloud/unavailable.cloud.test.ts`（emulator：斷網 → 「正在重新連線」、仍是雲端模式 → 恢復網路 → 消失）。

| 狀態 | 什麼時候 | 頂端文字 |
|---|---|---|
| `reconnecting` | 匿名登入失敗（每次失敗都顯示，1.5 秒起、×2、最多 30 秒一直重試，不放棄；API key 或網域被擋也一樣），或連不上 Firestore（見下） | 連線中斷，正在重新連線… |
| `offline` | 問伺服器問不到、而且手機說沒有網路（`navigator.onLine`；它有時不準，所以一律先問伺服器，問得到就不顯示）；網路回來（`online` 事件）馬上再問 | 沒有網路。連回來會自動同步，剛剛做的事不會不見。 |
| `quota` | 額度用完（`resource-exhausted`）；每 60 秒再問，問得到就重新開監聽 | 雲端暫時忙不過來，正在重試… |

**連不上 Firestore 的判斷**：開始等伺服器的回應起給 30 秒寬限，伺服器的快照一到就取消。頁面在背景不算：螢幕關掉、切到別的 App 時計時器被凍住，回到前景那一刻會立刻到期；到期時頁面在背景就先不算，回到前景重新給 30 秒（已經在顯示狀態的話 1 秒後就再問）。到期時實際問一次伺服器（讀 `config/gm`，手機說沒有網路也問）：問得到就恢復；問不到就顯示狀態，8 秒起、×1.5、最多 30 秒退避再問，一直問。

**本機開發注意**：在 `localhost` 用正式設定、匿名登入被 API key 擋下時，會停在「正在重新連線」。本機請用 emulator（`VITE_FIREBASE_EMULATOR=1`）或不設 `VITE_FIREBASE_*`（純本機模式）。在本機模式留下的紀錄，連上雲端後會問要不要存到雲端（`migrate.ts`）。

**已知限制**：第一次開啟、匿名登入一直失敗時（還沒有 uid），這段時間做的事只在記憶體裡排著，登入成功就送出；在那之前重新整理或關掉分頁會不見。只影響沒有存過帳號的第一次造訪。

## 本機開發

- `.env.local`：`VITE_FIREBASE_*` 六個值（Web config 是公開設定，不是密鑰）。沒有這個檔時網站自動用 localStorage 後端。
- `VITE_FIREBASE_EMULATOR=1`：改連本機 emulator，不碰正式專案。
- `npm run test:rules`：在本機 emulator 跑規則測試，加上 `tests/cloud/` 的雲端 store 測試（新手引導旗標的寫入與跨裝置合併）；不碰正式專案。
