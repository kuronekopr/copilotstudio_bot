# デプロイ／環境分離

## 1. Copilot Studio 環境分離

- Dev / Staging / Production を分けて運用する。

## 2. 推奨：環境ごとの分離単位

- Web Hosting（App Service / Static Web Apps）：環境別
- Token取得API（必要なら）：環境別
- ログ（Log Analytics Workspace / SQL/Dataverse）：環境別（少なくともProdは別）
- Blob（マスク済画像）：環境別コンテナ or アカウント分離

## 3. リリース戦略

- Stagingで「ゴールドセット（会話＋画像）回帰テスト」→ 本番反映
- Prompt/FAQ更新はCI/CD経由（品質劣化検知を必須）
