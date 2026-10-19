# Firebase 設定紀錄

專案 **`whisper-trees-demo`**（免費 Spark 方案，不綁卡）。2026-10-19 先建過 `whisper-trees`，後來改用使用者在 console 建的 `whisper-trees-demo`；`whisper-trees` 不再使用，待使用者決定是否刪除。設計與安全審查見 Plan（rev 4）與 `firestore.rules` 開頭註解。

## 已完成（2026-10-19）

| 項目 | 狀態 | 做法 |
|---|---|---|
| Firebase 專案 `whisper-trees-demo` | 完成 | 使用者在 Firebase console 建立 |
| Firestore | 完成 | `gcloud firestore databases create --location=asia-east1`（Native） |
| Web app `whisper-trees-web` | 完成 | Management API（appId `1:724757846221:web:83db19ea8c8326e434b184`）；設定寫入本機 `.env.local`（不進版控） |
| Security Rules | 已部署 | Rules API 建 ruleset 並發佈到 `cloud.firestore` |
| Auth：匿名、Google、授權網域 | 完成 | 使用者在 console 開啟；授權網域含 `whisper-trees.pages.dev`；匿名登入已在正式專案以 REST 實測（測試帳號已刪） |
| 註冊配額（每 IP 每小時） | 完成 | 500，2026-10-24 07:00（台北）起 3 天，之後回到預設 100 |
| 白名單 `admins/{uid}` | 待 S3 | 見下方 |
| API key 的 HTTP referrer 限制 | 待 S6 | 見下方 |

### 已部署的規則

| 日期 | ruleset | `firestore.rules` sha256 |
|---|---|---|
| 2026-10-19 | `27a31e8d-2167-4963-ad53-caf3a929a0ce` | `104022f0ec16525873ae54bf7be86a16a1617dfe6ff81004d90382bdf3740f8f` |

改規則後：先跑 `npm run test:rules`（本機 emulator，需要 `brew install openjdk`），通過才部署，並在上表加一列。

部署指令（需要 gcloud 已登入有權限的帳號）：

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

## Auth 設定（console）

1. https://console.firebase.google.com/project/whisper-trees-demo/authentication →「開始使用」。
2. 登入方式：啟用「匿名」與「Google」（支援信箱選專案擁有者）。
3. 設定 › 授權網域：新增 `whisper-trees.pages.dev`（`localhost` 預設已有）。
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
`https://whisper-trees.pages.dev/*`、`http://localhost:5173/*`、`http://127.0.0.1:5173/*`、`http://localhost:4173/*`。

## 本機開發

- `.env.local`：`VITE_FIREBASE_*` 六個值（web config 是公開設定，不是密鑰）。沒有這個檔時網站自動用 localStorage 後端。
- `VITE_FIREBASE_EMULATOR=1`：改連本機 emulator，不碰正式專案。
- `npm run test:rules`：在本機 emulator 跑 158 條規則測試；不碰正式專案。
