# DFD（データフロー図）

## 1. レベル0（コンテキスト）

(1) User
  |  Text / Image
  v
(2) Web Chat UI（Browser）
  |  Preprocessed Image + Text
  v
(3) Direct Line
  |  Messages
  v
(4) Copilot Studio
  |  JSON解析 / RAG / 回答
  v
(5) User（表示）

並行フロー：
(4) Copilot Studio -> (6) Event Log Pipeline（監視・集計）
(4) Copilot Studio -> (7) Knowledge Sources（FAQ/Docs）

## 2. レベル1（詳細）

[Browser]
 - UI
 - 画像前処理（resize/compress/EXIF remove）
 - （推奨）PIIマスクUI（確定後のみ送信）
   -> HTTPS ->
[Web Hosting]
 - JS配布
 - token取得（必要なら）
   -> HTTPS ->
[Direct Line]
 - token
 - message relay
   -> HTTPS ->
[Copilot Studio]
 - Prompt-A: image -> JSON
 - Prompt-B: cluster classification
 - RAG: Generative Answers
 - Prompt-C: final answer
   -> service calls ->
[Knowledge Sources]
 - FAQ / Docs / Error code dictionary
   -> telemetry ->
[Event Log Pipeline]
 - Log Analytics / App Insights
 - Azure SQL or Dataverse（KPI集計）
 - Power BI

[Escalation]
 - Web Form（要約・cluster_id・参照FAQ引き継ぎ）
