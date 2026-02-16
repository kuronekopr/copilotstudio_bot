# 物理構成（Production想定）

## 1. 物理構成（論理→物理対応）

[End User Browser (Anonymous)]
- Web site
- Chat widget (Web Chat/Custom)
- Image pre-processing (resize/compress/EXIF remove)
|
| HTTPS (TLS)
v
[Public Internet]
|
v
[CDN/WAF (optional)]
- Azure Front Door もしくは既存WAF
|
v
[Web Hosting]
- Azure App Service / Static Web Apps / 既存Webサーバ
- Chat widget配信 (JS/CSS)
|
| HTTPS
v
[Bot Framework Channel]
- Direct Line (token取得/利用)
|
| HTTPS
v
[Copilot Studio (Environment: Dev/Stg/Prod)]
- Topic Flow
  - Prompt-A: Image analysis (JSON)
  - Prompt-B: Cluster classification
  - RAG: Generative Answers (FAQ/Docs)
  - Prompt-C: Final answer
    |
    +---------------------------+
    |                           |
    v                           v
    [Knowledge Sources]         [Event Log Pipeline]
    - FAQ (Web/SharePoint等)    - App Insights / Log Analytics
    - Manuals (PDF等)           - Azure SQL / Dataverse（集計用）
                                - Power BI（可視化）
    |
    v
[Escalation]
- Web Form (existing)
- Prefill: summary/cluster_id/faq links
- (image: reattach policy)

## 2. 主要コンポーネント

- クライアント（ブラウザ）：チャットUI、画像前処理（長辺1600px/圧縮/EXIF削除）
- Webホスティング：チャットJS配布＋（必要なら）トークン取得API呼び出し
- Direct Line：メッセージ中継、トークン期限・レート制御
- Copilot Studio：画像解析（JSON抽出）、クラスタ分類、RAG、固定フォーマット回答
- ナレッジソース：FAQ/マニュアル/エラーコード辞書（クラスタIDタグ付け推奨）
- ログ基盤（Event Source）：監視（Log Analytics）＋集計（Azure SQL/Dataverse）＋可視化（Power BI）
- エスカレーション：Webフォーム（要約・cluster_id・参照FAQ引き継ぎ）

## 3. 画像の保存ポリシー（物理観点）

- 原本画像：保存しない
- 保存する場合：PIIマスク後画像のみ（Blob Private想定）
- 画像関連の永続化は「監査・再現性・最小化」の観点で厳格に制御
