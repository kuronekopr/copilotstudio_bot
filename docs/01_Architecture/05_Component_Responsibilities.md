# コンポーネント責任分界（RACI簡易）

| 項目 | Browser(UI) | Web Hosting | Direct Line | Copilot Studio | Log Pipeline | Notes |
|---|---|---|---|---|---|---|
| チャットUI表示 | R | A |  |  |  | 右下ポップアップ |
| 画像前処理（resize/compress/EXIF） | R |  |  |  |  | 添付要件準拠 |
| OCR / PII検出・マスク | R |  |  |  |  | Client Side |
| トークン取得/管理 |  | R/A | R |  |  | トークン期限・頻度制限 |
| 画像→JSON抽出 |  |  |  | R/A |  | Prompt-A |
| クラスタ分類 |  |  |  | R/A |  | Prompt-B |
| RAG検索 |  |  |  | R/A |  | FAQ/Docs |
| 統合回答生成 |  |  |  | R/A |  | Prompt-C |
| 監視ログ出力 |  |  |  | R | A | App Insights/Log Analytics |
| KPI集計 |  |  |  |  | R/A | SQL/Dataverse→Power BI |
| エスカレーション | R | A |  | R |  | フォームに要約/cluster_id引継ぎ |
