# Firebase 設定紀錄

專案 **`whisper-trees-demo`**（免費 Spark 方案，不綁卡）。2026-10-19 先建過 `whisper-trees`，後來改用使用者在 console 建的 `whisper-trees-demo`；`whisper-trees` 不再使用，待使用者決定是否刪除。設計與安全審查見 Plan（rev 4）與 `firestore.rules` 開頭註解。

## 已完成（2026-10-19）

| 項目 | 狀態 | 做法 |
|---|---|---|
| Firebase 專案 `whisper-trees-demo` | 完成 | 使用者在 Firebase console 建立 |
| Firestore | 完成 | `gcloud firestore databases create --location=asia-east1`（Native） |
| Web app `whisper-trees-web` | 完成 | Management API（appId `1:724757846221:web:83db19ea8c8326e434b184`）；設定寫入本機 `.env.local`（不進版控） |
| Security Rules | 已部署 | Rules API 建 ruleset 並發佈到 `cloud.firestore` |
| Auth：匿名、Google、授權網域 | 完成 | 使用者在 console 開啟；授權網域含 `whisper-trees-demo.southern-light.dev`（2026-10-20 換正式網域時加）；匿名登入已在正式專案以 REST 實測（測試帳號已刪） |
| 註冊配額（每 IP 每小時） | 完成 | 500，2026-10-24 07:00（台北）起 3 天，之後回到預設 100 |
| 白名單 `admins/{uid}` | 完成 | 2026-10-19 使用者在 console 加入 1 筆（政府端示範帳號）；Google 綁定已在本機 localhost 對正式專案實測 |
| API key 的 HTTP referrer 限制 | 完成 | 2026-10-19 用 `gcloud services api-keys update` 設定；原本的 API 限制（27 個服務）保留；實測其他網域被擋、允許的網域可用 |

### 已部署的規則

| 日期 | ruleset | `firestore.rules` sha256 |
|---|---|---|
| 2026-10-19 | `27a31e8d-2167-4963-ad53-caf3a929a0ce` | `104022f0ec16525873ae54bf7be86a16a1617dfe6ff81004d90382bdf3740f8f` |
| 2026-10-20 | `af18248f-5492-4581-bf62-dc10d08f6234` | `6761ac5dc6b1e6c8c0990be40366127f1a8b4be76be3ff4dd6b79aab20a3ccd5` |

改規則後：先跑 `npm run test:rules`（本機 emulator，需要 `brew install openjdk`），通過才部署，並在上表加一列。

部署指令（需要 gcloud 已登入有權限的帳號；兩個請求都要帶 `X-Goog-User-Project`，少了會建立失敗）：

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

正式網址 `https://whisper-trees-demo.southern-light.dev`（2026-10-20 在 Cloudflare Pages `whisper-trees` 綁定，DNS 由 Cloudflare 自動加 CNAME）。2026-10-20 已用 `gcloud`／Identity Toolkit admin API 把新網域加進 Firebase 授權網域與瀏覽器 API key 的 referrer（只加不刪，API 限制 27 個服務保留），並在新網域實測匿名登入（`accounts:signUp` 200）與 Firestore Listen 200、沒有「離線示範模式」。換網域要同時加 Firebase 授權網域與 API key 的 HTTP referrer，否則新網域上匿名登入、Google 登入、Firestore 都會失敗。

## Auth 設定（console）

1. https://console.firebase.google.com/project/whisper-trees-demo/authentication →「開始使用」。
2. 登入方式：啟用「匿名」與「Google」（支援信箱選專案擁有者）。
3. 設定 › 授權網域：新增 `whisper-trees-demo.southern-light.dev`（`localhost` 預設已有）。
4. 不要升級到 Identity Platform（免費方案會有每日 3,000 名活躍使用者上限）。
5. 10/24 前：把「每個 IP 每小時可建立的帳號數」暫時調高，避免會場 Wi-Fi 共用 IP 時匿名登入失敗。

## 後台白名單

1. 用要給權限的 Google 帳號在網站上「用 Google 保留紀錄」登入一次。
2. console › Authentication › Users 找到那一列的使用者 UID。
3. console › Firestore › 新增集合 `admins`，文件 ID 填那個 UID，欄位隨意（例如 `note: "政府端示範"`）。
4. 不要把 email 寫進文件或 repo。

`admins` 只能在 console 建立，網站上任何人（包括管理者）都不能寫入。

## API key 限制（S6）

GCP console › API 和服務 › 憑證 › 瀏覽器金鑰：應用程式限制選 HTTP referrer，允許
`https://whisper-trees-demo.southern-light.dev/*`、`https://whisper-trees-demo.firebaseapp.com/*`、`http://localhost:5173/*`、`http://127.0.0.1:5173/*`、`http://localhost:4173/*`。

`whisper-trees-demo.firebaseapp.com` 一定要留：Google 登入的彈窗頁在這個網域，也用同一把 key，拿掉 Google 登入就會壞。

## 連不上雲端時（連線狀態，不再有離線示範模式）

2026-10-21 使用者決定：**不再退回本機模式**（以前叫「離線示範模式」，退回後這次開啟不會自己連回來，待機一陣子就會誤觸發）。現在一直留在雲端模式，這段時間的寫入由 Firestore 的本機快取排著、連回來就同步；頂端顯示一行連線狀態（`ConnectionBanner`，`connection-banner`，`data-state`），連回來就自己消失。規則在 `src/store/unavailable.ts`（單元測試），雲端測試 `tests/cloud/unavailable.cloud.test.ts`（emulator：斷網 → 「正在重新連線」、仍是雲端模式 → 恢復網路 → 消失）。

| 狀態 | 什麼時候 | 頂端文字 |
|---|---|---|
| `reconnecting` | 匿名登入失敗（每次失敗都顯示，1.5 秒起、×2、最多 30 秒一直重試，不放棄；API key 或網域被擋也一樣），或連不上 Firestore（見下） | 連線中斷，正在重新連線… |
| `offline` | 問伺服器問不到、而且手機說沒有網路（`navigator.onLine`；它有時不準，所以一律先問伺服器，問得到就不顯示）；網路回來（`online` 事件）馬上再問 | 沒有網路。連回來會自動同步，剛剛做的事不會不見。 |
| `quota` | 額度用完（`resource-exhausted`）；每 60 秒再問，問得到就重新開監聽 | 雲端暫時忙不過來，正在重試… |

**連不上 Firestore 的判斷**：開始等伺服器的回應起給 30 秒寬限，伺服器的快照一到就取消。**頁面在背景不算**：螢幕關掉、切到別的 App 時計時器被凍住，回到前景那一刻會立刻到期；到期時頁面在背景就先不算，回到前景重新給 30 秒（已經在顯示狀態的話 1 秒後就再問）。到期時實際問一次伺服器（讀 `config/gm`，手機說沒有網路也問）：問得到就恢復；問不到就顯示狀態，8 秒起、×1.5、最多 30 秒退避再問，一直問。

**本機開發注意**：以前在 `localhost` 用正式設定、匿名登入被 API key 擋下時會退回本機模式，可以照常試玩；現在會停在「正在重新連線」。本機請用 emulator（`VITE_FIREBASE_EMULATOR=1`）或不設 `VITE_FIREBASE_*`（純本機模式）。之前在本機模式留下的紀錄，連上雲端後仍會問要不要存到雲端（`migrate.ts`，沒變）。

**已知限制**：第一次開啟、匿名登入一直失敗時（還沒有 uid），這段時間做的事只在記憶體裡排著，登入成功就送出；在那之前重新整理或關掉分頁會不見（以前會存到本機）。只影響沒有存過帳號的第一次造訪。

## 本機開發

- `.env.local`：`VITE_FIREBASE_*` 六個值（web config 是公開設定，不是密鑰）。沒有這個檔時網站自動用 localStorage 後端。
- `VITE_FIREBASE_EMULATOR=1`：改連本機 emulator，不碰正式專案。
- `npm run test:rules`：在本機 emulator 跑 162 條規則測試，加上 `tests/cloud/` 的 5 條雲端 store 測試（新手引導旗標的寫入與跨裝置合併）；不碰正式專案。
