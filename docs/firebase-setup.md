# Firebase 設定紀錄

專案 `whisper-trees`（免費 Spark 方案，不綁卡）。設計與安全審查見 Plan（rev 4）與 `firestore.rules` 開頭註解。

## 已完成（2026-10-19）

| 項目 | 狀態 | 做法 |
|---|---|---|
| GCP／Firebase 專案 `whisper-trees` | 完成 | `gcloud projects create`＋Firebase Management API `addFirebase`（Firebase console 在自動化瀏覽器無法載入） |
| Firestore | 完成 | `gcloud firestore databases create --location=asia-east1`（Native） |
| Web app `whisper-trees-web` | 完成 | Management API；設定寫入本機 `.env.local`（不進版控） |
| Security Rules | 已部署 | Rules API 建 ruleset 並發佈到 `cloud.firestore` |
| Auth：匿名、Google、授權網域 | 待使用者在 console 操作 | 見下方 |
| 白名單 `admins/{uid}` | 待 S3 | 見下方 |
| API key 的 HTTP referrer 限制 | 待 S6 | 見下方 |

### 已部署的規則

| 日期 | ruleset | `firestore.rules` sha256 |
|---|---|---|
| 2026-10-19 | `5c48e0ce-7b3a-43ed-9ba6-dbea39af745b` | `104022f0ec16525873ae54bf7be86a16a1617dfe6ff81004d90382bdf3740f8f` |

改規則後：先跑 `npm run test:rules`（本機 emulator，需要 `brew install openjdk`），通過才部署，並在上表加一列。

部署指令（需要 gcloud 已登入有權限的帳號）：

```sh
TOKEN=$(gcloud auth print-access-token)
python3 -c "import json;print(json.dumps({'source':{'files':[{'name':'firestore.rules','content':open('firestore.rules').read()}]}}))" > /tmp/ruleset.json
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "X-Goog-User-Project: whisper-trees" -H "Content-Type: application/json" \
  https://firebaserules.googleapis.com/v1/projects/whisper-trees/rulesets --data @/tmp/ruleset.json
# 用回傳的 name 更新 release
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "X-Goog-User-Project: whisper-trees" -H "Content-Type: application/json" \
  https://firebaserules.googleapis.com/v1/projects/whisper-trees/releases/cloud.firestore \
  -d '{"release":{"name":"projects/whisper-trees/releases/cloud.firestore","rulesetName":"<ruleset name>"}}'
```

## Auth 設定（console）

1. https://console.firebase.google.com/project/whisper-trees/authentication →「開始使用」。
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
- `npm run test:rules`：在本機 emulator 跑 158 條規則測試；不碰正式專案。
