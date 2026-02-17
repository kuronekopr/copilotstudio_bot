# AIチャットボット導入 企画提案書（最終版）

* * *

## 1\. エグゼクティブサマリ

### ■ 目的

自社Webサービスにおける問い合わせのうち、

**画像付き問い合わせ（約80%）をAIで一次解決** し、自己解決率向上とサポートコスト削減を実現する。

### ■ 提案内容

- 右下「AIに質問」ポップアップ型チャット導入

- 画像最大5枚対応（貼り付け・D&D対応）

- 画像解析＋RAG型ナレッジ検索

- 入力をEvent Source化し、改善可能なログ基盤を構築


### ■ 想定効果

- 自己解決率：60%以上

- 年間コスト削減効果：最大720万円想定

- 3年TCO：約450〜800万円


👉 投資回収可能性は高い

* * *

# 2\. 背景と課題

## 現状課題

- 問い合わせの多くが「画面エラーのスクリーンショット付き」

- FAQがあっても適切に検索されない

- オペレーターが画像確認に時間を要する

- ログが構造化されていないため改善サイクルが回らない


* * *

# 3\. 提案アーキテクチャ概要

## 構成概要

ユーザー

→ WebチャットUI

→ Direct Line

→ Copilot Studio

→ RAG検索

→ 統合回答

→ Eventログ保存

### 特徴

- 画像→JSON構造化→クラスタ分類→RAG検索→統合回答

- モデル暴走を防ぐ中間JSON層設計

- 画像保存なし（メタ情報のみ）

- 将来BI連携可能なログ構造


* * *

# 4\. UIにこだわった実装戦略（差別化ポイント）

本企画の成否は **UI体験の完成度** に依存する。

* * *

## 4.1 UI設計コンセプト

### 🎯 「サポート感」ではなく「即時解決体験」

- 起動即入力可能

- 画像貼り付け1秒以内

- 送信前プレビュー

- 進行状況の可視化


* * *

## 4.2 UI実装要素（重点設計）

### ① 画像入力体験最適化

- Ctrl+V貼り付け対応

- ドラッグ＆ドロップ対応

- 最大5枚まで視覚的表示

- リサイズ自動処理（1600px）

- 送信前削除可能


👉 **心理的ストレスを削減**

* * *

### ② ローディング体験

- 「画像解析中…」

- 「FAQ検索中…」

- ステップ可視化


LLMブラックボックス感を排除

* * *

### ③ 構造化回答表示

```

Copy code

【状況整理】
【確認された事実】
【想定原因】
【解決手順】
```

- 箇条書き

- 過剰文章禁止

- 原因最大3件


👉 読みやすさ最優先

* * *

### ④ 未解決時の自然誘導

- 「さらに詳しくサポートが必要な場合はこちら」

- 要約自動入力済フォーム


👉 UXの断絶を防止

* * *

# 5\. 機能概要（要約）

## ユーザー機能

- 画像最大5枚

- テキスト入力

- 画像のみ送信可

- FAQリンク表示

- フォーム自動引き継ぎ


## AI機能

- 画像解析（JSON出力）

- クラスタ分類

- RAG検索

- 統合回答生成


## ログ機能（必須）

- 1問い合わせ＝1イベント

- cluster\_id保存

- RAGヒット記録

- escalatedフラグ記録

- 処理時間保存


* * *

# 6\. コスト試算（概算）

## 初期費用

150〜200万円

## 月額

5〜18万円

## 3年TCO

450〜800万円

* * *

# 7\. ROI試算

前提：

- 月500件

- 60%自己解決

- 1件2,000円コスト


年間削減効果：

300件 × 2,000円 × 12ヶ月

＝720万円

👉 投資回収可能

* * *

# 8\. リスクと対策

| リスク | 対策 |
| --- | --- |
| 画像解析精度 | JSON中間層設計 |
| RAG未ヒット | 月次FAQ改善 |
| UNKNOWN増加 | クラスタ再設計 |
| 応答遅延 | 解像度制御 |
| モデル変動 | 回帰テスト＋CI/CD |

* * *

# 9\. 開発・運用体制

## 開発

- TDD前提

- CI/CD構築

- Prompt回帰テスト実施


## 運用

- 月次ログ分析

- KPIモニタリング

- FAQ改善ループ


* * *

# 10\. 経営判断ポイント

| 観点 | 評価 |
| --- | --- |
| 技術妥当性 | 高 |
| ROI | 高 |
| 拡張性 | 中〜高 |
| 初期投資 | 中 |
| 過剰投資リスク | 低（B案） |

* * *

# 11\. 結論

- Copilot Studio採用は妥当

- B案（Direct Line＋カスタムUI）が最適

- UI品質が成否を分ける

- Eventログ設計が将来価値を生む

- ROI成立可能性は高い


* * *

# 最終提案

本企画は、

✔ 画像中心問い合わせに最適化

✔ サポートコスト削減可能

✔ 将来拡張可能

✔ 投資回収見込みあり

**段階的導入（PoC → 本番）を推奨**


# AI画像対応チャットボット

## 最終版 仕様書（Ver.1.0）

* * *

# 0\. 基本方針（初期前提）

本システムは以下を **必須設計要件として初期仕様に組み込む**：

1. **入力をEvent Sourceとしてログ管理（必須）**

2. **画像はPII自動検出＋マスク処理後に保存**

3. **pii\_auto\_detect\_usedフラグ設計**

4. **スコア閾値の自動最適化設計**

5. **誤認識確率モデル（統計的重み付け）導入**


これらは将来拡張ではなく、 **初期リリース要件** とする。

* * *

# 1\. システム概要

## 1.1 目的

- Webサービスに関する問い合わせの自己解決率向上

- 画像付き問い合わせの自動解析

- ログ駆動型改善基盤の構築


## 1.2 利用形態

- 匿名利用

- Webサイト右下ポップアップ起動

- 画像最大5枚

- RAG型ナレッジ検索


* * *

# 2\. 全体アーキテクチャ

## 2.1 論理構成

ユーザー

→ Web UI

→ Direct Line

→ Copilot Studio

→ 画像解析（JSON）

→ PII検出・マスク

→ クラスタ分類

→ 誤認識確率モデル補正

→ RAG検索

→ 統合回答生成

→ Eventログ保存

* * *

# 3\. UI仕様（重点設計）

## 3.1 設計思想

- 即時解決体験

- ブラックボックス排除

- 操作ストレス最小化

- 情報透明性確保


* * *

## 3.2 UI機能仕様

### 3.2.1 起動

- 右下固定ポップアップ

- モーダル表示

- 最小化・再表示可能


* * *

### 3.2.2 画像入力機能

- 最大5枚

- JPG / PNGのみ

- Ctrl+V貼り付け対応

- ドラッグ＆ドロップ対応

- 送信前プレビュー

- 削除可能

- 長辺1600pxへ自動変換

- JPEG品質80%

- EXIF削除


* * *

### 3.2.3 解析進行表示

- 「画像解析中」

- 「個人情報確認中」

- 「FAQ検索中」

- ステップ可視化UI


* * *

### 3.2.4 回答表示

構造固定：

```

Copy code

【状況整理】
【確認された事実】
【想定原因】
【解決手順】
```

- 原因最大3件

- 追加質問最大1件


* * *

# 4\. 画像処理仕様

## 4.1 PII自動検出（初期必須）

### 対象

- メールアドレス

- 電話番号

- 氏名

- 住所

- 顧客番号

- クレジット番号

- その他識別可能情報


* * *

## 4.2 PII処理フロー

1. OCR抽出

2. PII検出エンジン

3. スコア算出

4. 閾値判定

5. マスク処理

6. マスク済画像保存


* * *

## 4.3 保存仕様

| 項目 | 方針 |
| --- | --- |
| 元画像 | 保存しない |
| マスク済画像 | 保存 |
| メタ情報 | 保存 |
| PII検出ログ | 保存 |

* * *

## 4.4 ログ追加項目

| カラム | 説明 |
| --- | --- |
| pii\_auto\_detect\_used | true/false |
| pii\_detected\_count | 件数 |
| pii\_confidence\_avg | 平均信頼度 |

* * *

# 5\. 誤認識確率モデル（統計的重み付け）

## 5.1 目的

- 画像解析誤判定の抑制

- クラスタ誤分類率低減


* * *

## 5.2 モデル構成

各抽出項目に重み付け：

```
makefile
Copy code

FinalScore =
w1 * OCR_confidence +
w2 * error_code_match +
w3 * cluster_prior +
w4 * rag_similarity
```

* * *

## 5.3 重み設計

初期値：

- OCR\_confidence: 0.3

- error\_code\_match: 0.3

- cluster\_prior: 0.2

- rag\_similarity: 0.2


* * *

## 5.4 誤認識確率算出

```
makefile
Copy code

Misclassification_Probability =
1 - Softmax(FinalScore)
```

閾値超過時：

- 追加確認質問発生

- escalated優先判定


* * *

# 6\. スコア閾値自動最適化設計

## 6.1 背景

固定閾値は環境変動に弱い。

* * *

## 6.2 自動最適化ロジック

月次ログ分析：

- TRUE Positive

- FALSE Positive

- FALSE Negative


ROC曲線生成

最適閾値更新：

```
nginx
Copy code

Youden Index 最大化
```

* * *

## 6.3 更新ポリシー

- 月次自動計算

- 管理者承認後反映

- ロールバック可能


* * *

# 7\. RAG検索仕様

## 7.1 クエリ構成

```
nginx
Copy code

cluster_id + error_code + screen_type + user_text
```

* * *

## 7.2 優先順位

1. cluster一致

2. error\_code一致

3. 類似検索


* * *

# 8\. ログ管理仕様（必須）

## 8.1 Event Source設計

1問い合わせ＝1イベント

* * *

## 8.2 保存項目

- event\_id

- session\_id

- user\_text

- image\_count

- cluster\_id

- rag\_hit

- escalated

- processing\_time\_ms

- pii\_auto\_detect\_used

- misclassification\_probability

- threshold\_version


* * *

## 8.3 保存期間

12ヶ月

* * *

# 9\. 性能要件

- 画像1枚：8秒以内

- 5枚：15秒以内

- 同時20接続対応


* * *

# 10\. セキュリティ要件

- TLS1.2以上

- SVG拒否

- MIME二重検証

- 画像PIIマスク必須

- ログ改ざん不可


* * *

# 11\. テスト要件（抜粋）

- JSON構造保証

- PII検出率検証

- 誤分類率 <10%

- UNKNOWN率 <10%

- 自己解決率 60%以上


* * *

# 12\. 運用設計

- 月次閾値最適化

- UNKNOWN監視

- クラスタ偏り分析

- PII検出精度監視


* * *

# 13\. 非機能要件

- 可用性99%以上

- 追記専用ログ

- バージョニング管理


* * *

# 14\. 変更管理

- Prompt変更は回帰テスト必須

- 閾値変更は承認制

- モデル重み変更は履歴保存


* * *

# 15\. まとめ

本仕様は：

- 画像中心設計

- PII安全設計

- 統計的補正導入

- ログ駆動改善基盤

- UI体験重視


を初期リリース要件とする。

* * *


# 技術者向け詳細設計書（Ver.1.0）

* * *

# 1\. 全体処理パイプライン（厳密フロー）

```mathematica
User Input
  ↓
[Client Side]
Image Preprocess (Resize/Compress)
  ↓
OCR (Tesseract.js)
  ↓
PII Detection & Masking
  ↓
Direct Line Transmission
  ↓
[Server Side: Copilot Studio]
RAG Search & Answer Generation
  ↓
[Async / Logging]
Statistical Analysis & Logging
```

* * *

# 2\. 画像前処理設計 (Client Side)

## 2.1 リサイズ処理 (Canvas API)

長辺制限：
scale = min(1, 1600 / max(W, H))

JPEG品質：
Q = 0.8

* * *

## 2.2 EXIF削除
Canvas再描画によりメタデータ除去。

* * *

# 3\. OCR信頼度モデル (Client Side)

OCR出力 (Tesseract.js):
Confidence Score (0-100) を 0-1 に正規化して使用。

* * *

# 4\. PII自動検出モデル (Client Side)

## 4.1 PII検出ロジック
- 正規表現 (Email, Phone, CreditCard)
- 辞書マッチング (Japanese Names)

## 4.2 閾値判定
- Regex Match: Score = 1.0 (即時マスク)
- Dictionary Match: Score = 0.8 (> Threshold 0.75)

## 4.3 マスク処理
Canvas上で検出座標を黒塗りつぶし (FillRect)。

## 4.4 ログ項目 (ChannelData)
```json
{
  "pii": {
    "autoDetectUsed": true,
    "detectedCount": 2,
    "confidenceAvg": 0.82
  }
}
```

* * *

# 5\. クラスタ分類 & スコアリング (Server Side / Async)

**Backend Logging Layer (Azure Functions) で実施**

Web Frontendから送信された `channelData` (OCR結果、PIIスコア等) と、Copilot Studioの回答ログを紐付け、事後分析としてスコアリングを行う。

## 5.1 スコアリングモデル
各クラスタ $C_k$ に対して：
$Score(C_k) = w_1 \cdot \text{OCR\_confidence} + w_2 \cdot \text{ErrorMatch} + w_3 \cdot \text{RAG\_Relevance}$

## 5.2 誤認識確率 (Misclassification Probability)
$P_{error} = 1 - \max(\text{Softmax}(Score))$

* * *

# 6\. 閾値判定 & 最適化 (Async Batch)

## 6.1 判定ロジック
- **Real-time**: Frontend/Copilot Studioは `Auto_Resolve` (高信頼度) か `Escalate` (低信頼度) を簡易判定。
- **Batch**: Azure Functionsが詳細スコアを計算し、次回の閾値最適化に利用。

## 6.2 閾値自動最適化
月次ログからROC曲線を生成し、Youden Indexに基づいて $\theta_{auto}, \theta_{esc}$ を更新。

* * *

# 10\. RAGクエリ生成

Query=cluster\_id+error\_code+screen\_type+user\_textQuery = cluster\\\_id + error\\\_code + screen\\\_type + user\\\_textQuery=cluster\_id+error\_code+screen\_type+user\_text

TF-IDF + cosine similarity：

Similarity=A⋅B∥A∥∥B∥Similarity = \\frac{A \\cdot B}{\\\|A\\\| \\\|B\\\|}Similarity=∥A∥∥B∥A⋅B​

* * *

# 11\. Eventログ設計（Append Only）

## 11.1 保存構造

```json
json
Copy code

{
  "event_id": "uuid",
  "timestamp": "...",
  "cluster_id": "AUTH_INVALID",
  "misclassification_probability": 0.18,
  "threshold_version": "v1.3",
  "pii_auto_detect_used": true,
  "processing_time_ms": 8420
}
```

* * *

# 12\. コードレベル設計（TypeScript例）

* * *

# 12\. コードレベル設計 (Backend Logging Reference)

※以下はAzure Functions (Log Analysis) での事後分析用ロジックの参照実装です。

## 12.1 スコア計算 (Reference)

```ts
interface ClusterFeatures {
  ocrConfidence: number;
  errorMatch: number;
  prior: number;
  ragSimilarity: number;
}
// ... (Logic implemented in Python/Node.js on Backend)
```

* * *

## 12.2 Softmax (Reference)
(Backend Implementation)

* * *

## 12.3 誤認識確率 (Reference)
(Backend Implementation)

* * *

## 12.4 PII検出 (Client Side Implementation)

```js
// src/services/piiDetection.js implementation
export const detectPII = (text) => {
  const patterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    phone: /(?:\d{2,4}-)?\d{2,4}-\d{4}/,
    // ...
  };
  // ...
};
```

* * *

## 12.5 閾値最適化 (Backend Batch)
(Azure Functions Timer Trigger)

# 13\. 性能設計

- 並列画像処理

- 非同期OCR

- Promise.all活用

- キャッシュ付きRAG


* * *

# 14\. セキュリティ設計

- 画像はマスク後保存

- 原本非保存

- ログは追記専用

- PII検出必須


* * *

# 15\. 監視指標

- 誤分類率 < 10%

- PII検出漏れ率 < 1%

- UNKNOWN率 < 10%

- 自己解決率 >= 60%


* * *

# 16\. 拡張余地

- ベイズ更新による重み再推定

- オンライン学習

- Embedding再学習

- 異常検知導入


* * *

# 最終まとめ

本設計は：

- 数式ベースの統計補正

- 自動閾値最適化

- PII安全設計

- ログ駆動改善

- 非決定性LLM対策


を実装レベルまで定義した。

* * *


# 1\. 全体物理構成（Production）

```
java
Copy code

┌───────────────────────────────────────────────┐
│                  Internet                     │
└───────────────────────────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────┐
        │ Azure Application Gateway│
        │ (WAF有効)               │
        └─────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────┐
        │  Web Frontend (AppSvc)  │
        │  - Web Chat UI          │
        │  - 画像前処理(JS)        │
        └─────────────────────────┘
                    │ Direct Line (TLS)
                    ▼
        ┌─────────────────────────┐
        │ Copilot Studio          │
        │  - Prompt A/B/C         │
        │  - RAG Engine           │
        └─────────────────────────┘
                    │
                    ▼
 ┌───────────────────────────────────────────────┐
 │        AI Processing Layer (Azure)           │
 │-----------------------------------------------│
 │ 1. OCR Service (Azure Vision)                │
 │ 2. PII Detection Service (Azure AI / Custom) │
 │ 3. Statistical Scoring API (App Service)     │
 │ 4. Threshold Optimizer (Batch Function)      │
 └───────────────────────────────────────────────┘
                    │
                    ▼
 ┌───────────────────────────────────────────────┐
 │                Data Layer                    │
 │-----------------------------------------------│
 │ Azure SQL (Event Log)                        │
 │ Blob Storage (Masked Images Only)            │
 │ Log Analytics                                │
 │ Power BI                                     │
 └───────────────────────────────────────────────┘
```

* * *

# 2\. コンポーネント詳細（物理単位）

* * *

## 2.1 Web Frontend

**Azure App Service**

- Bot Framework Web Chat

- 画像リサイズ（1600px）

- JPEG圧縮80%

- EXIF削除

- PII検出ステータス表示UI


スケール設定：

- Auto-scale（CPU > 70%）


* * *

## 2.2 Copilot Studio

- Dev / Staging / Production分離

- RAGナレッジソース接続

- JSON中間層設計

- Direct Lineトークン制御


* * *

## 2.3 OCR & PII層

### OCR

Azure Computer Vision Read API

### PII Detection

- Azure AI Language PII API

- 追加Regexエンジン


## 2.3 OCR & PII層 (Client Side)

**Web Frontend (Browser)** 上で実行。

### OCR
- Tesseract.js (v5.1.0)
- 言語: 英語 + 日本語

### PII Detection
- 正規表現ベース + 辞書マッチング
- 対象: Email, 電話番号, 氏名(ローマ字)

フロー：
```nginx
Browser: Resize → OCR → PII検出 → マスク → DirectLine送信
```

* * *

## 2.4 Statistical Scoring & Logging

**Copilot Studio / Azure Functions**

Web Frontend から送信された `channelData` (統計情報) を基にログ保存・分析を行う。


* * *

## 2.5 Threshold Optimizer

Azure Function（Timer Trigger）

月次実行：
- ログ分析
- 閾値見直し (手動/半自動)


* * *

# 3\. ネットワーク構成

## 3.1 VNet分離

- Public Subnet
  - Application Gateway
- Private Subnet
  - App Services

  - SQL

  - Storage

  - Functions

## 3.2 通信制御

- Private Endpoint for SQL

- Storage Private Endpoint

- TLS1.2以上必須


* * *

# 4\. データ保存物理構成

## 4.1 Azure SQL

テーブル：

- UserInquiryEvent

- AnalysisResult

- RagSearchLog

- ThresholdHistory

- PiiAuditLog


可用性：

- Zone Redundant

- Geo-Backup


* * *

## 4.2 Blob Storage

保存：

- マスク済画像のみ

- 12ヶ月保持

- ライフサイクルポリシー有効


* * *

# 5\. セキュリティ物理設計

| 項目 | 実装 |
| --- | --- |
| WAF | Application Gateway |
| DDoS | Azure DDoS Protection |
| Key管理 | Azure Key Vault |
| ログ改ざん防止 | Append-only設定 |
| 画像原本 | 非保存 |

* * *

# 6\. 可用性設計

| レイヤー | 可用性 |
| --- | --- |
| Web | 99% |
| SQL | 99.99% |
| Storage | LRS/GRS選択可 |
| Function | 消費プラン冗長 |

* * *

# 7\. スケーラビリティ

月500件規模：

- CPU負荷軽微

- 画像保存量年間30GB未満（マスク済）


将来1,000件対応：

- App Serviceスケールアウト

- SQL DTU拡張


* * *

# 8\. 監視設計（物理レベル）

Azure Monitor：

- 応答時間

- PII検出失敗率

- 誤分類率

- UNKNOWN率

- escalated率


* * *

# 9\. 障害時経路

Copilot停止：

```
nginx
Copy code

UI → フォーム誘導
```

SQL停止：

```

Copy code

ログキュー → 後送
```

* * *

# 10\. 環境分離

| 環境 | 分離方式 |
| --- | --- |
| Dev | 別リソース |
| Staging | 本番同等構成 |
| Prod | 専用VNet |

* * *

# 11\. コスト最適構成（物理視点）

- App Service Basic〜Standard

- SQL DTU 低〜中

- Blob Cool Tier

- Function Consumption Plan


* * *

# 12\. 将来拡張物理ポイント

- Embedding用Azure AI Search追加

- ML再学習用Azure ML

- Event Hub連携

- リアルタイム異常検知


* * *

# まとめ

本物理構成は：

- セキュア

- スケーラブル

- PII安全設計

- ログ駆動改善可能

- 統計モデル組込み済


* * *


# 1\. DFD（データフロー図）

## 1.1 レベル0（コンテキスト図）


```css
[User]
   │ ①Text / Image
   ▼
[Web Chat UI]
   │ (Client Side)
   │ - OCR / PII Check
   │ - Masking
   │
   │ ②Masked Image + Meta(JSON)
   ▼
[Copilot Studio]
   │ ③RAG Search & Answer Gen
   ▼
[Data Layer]
   │ ④Event Log (via ChannelData)
   │ ⑤Masked Image Storage
```

* * *

## 1.2 レベル1（詳細DFD）

```scss
(1) User
    │
    ▼
(2) Web Frontend (Client Side)
    - Resize
    - Compress
    - EXIF Remove
    - OCR (Tesseract.js)
    - PII Detection & Masking
    - ChannelData Creation (Stats)
    │
    ▼
(3) Direct Line
    │ (Masked Image + ChannelData)
    ▼
(4) Copilot Studio
    - RAG Search
    - Answer Generation (JSON)
    │
    ▼
(5) Backend Logging (Azure Functions)
    - Save Event Log (SQL)
    - Save Masked Image (Blob)
```

* * *

# 2\. データストア定義

| ID | データストア | 内容 |
| --- | --- | --- |
| D1 | Azure SQL | Eventログ |
| D2 | Blob Storage | マスク済画像 |
| D3 | ThresholdHistory | 閾値履歴 |
| D4 | PiiAuditLog | PII検出記録 |

* * *

# 3\. データフロー定義

| Flow | 内容 | セキュリティ |
| --- | --- | --- |
| F1 | Raw Image | TLS必須 |
| F2 | OCR Text | 内部通信 |
| F3 | PII Detection Result | 暗号化 |
| F4 | Masked Image | Private Endpoint |
| F5 | Scoring Result | 内部API |
| F6 | Event Log | Append Only |

* * *

# 4\. 信頼境界（Trust Boundaries）

```
yaml
Copy code

Boundary A: Internet ↔ Azure (WAF)
Boundary B: Client Frontend ↔ Copilot Studio (Direct Line)
Boundary C: Copilot Studio ↔ Internal Knowledge (RAG)
Boundary D: Backend Logging ↔ Data Layer (SQL/Blob)
```

* * *

# 5\. 脅威モデル（STRIDE）

* * *

# 5.1 S — Spoofing（なりすまし）

| 対象 | リスク | 対策 |
| --- | --- | --- |
| Direct Line | 不正接続 | トークン期限短縮 |
| API | 不正呼び出し | Managed Identity |

* * *

# 5.2 T — Tampering（改ざん）

| 対象 | リスク | 対策 |
| --- | --- | --- |
| Eventログ | 改ざん | Append Only |
| Masked画像 | 差替え | SAS制御 |
| 閾値 | 不正変更 | 承認制 |

* * *

# 5.3 R — Repudiation（否認）

| 対象 | リスク | 対策 |
| --- | --- | --- |
| 問い合わせ履歴 | 削除 | 追記専用ログ |
| PII検出 | 不記録 | pii\_auto\_detect\_used保存 |

* * *

# 5.4 I — Information Disclosure（情報漏洩）

| 対象 | リスク | 対策 |
| --- | --- | --- |
| 原本画像 | PII漏洩 | 非保存 |
| OCRテキスト | ログ流出 | マスキング |
| Storage | 外部公開 | Private Endpoint |

* * *

# 5.5 D — Denial of Service

| 対象 | リスク | 対策 |
| --- | --- | --- |
| Web UI | 過負荷 | Rate Limit |
| OCR API | 負荷増 | Queue化 |
| SQL | ロック | Connection Pool |

* * *

# 5.6 E — Elevation of Privilege

| 対象 | リスク | 対策 |
| --- | --- | --- |
| App Service | 権限拡大 | RBAC |
| SQL | 管理者誤使用 | 最小権限 |

* * *

# 6\. PII特化脅威

## 6.1 誤検出（False Positive）

影響：過剰マスク

対策：信頼度閾値＋ログ監視

## 6.2 検出漏れ（False Negative）

影響：PII保存

対策：

- 高感度閾値

- 定期監査

- ランダムサンプリング検査


* * *

# 7\. 統計モデル関連脅威

## 7.1 スコア重み改ざん

対策：

- 重みハッシュ保存

- 変更履歴管理


## 7.2 閾値過学習

対策：

- クロスバリデーション

- 過去3ヶ月平均使用


* * *

# 8\. 攻撃面（Attack Surface）

- Web Client (XSS/Injection)
- Direct Line API
- SQL接続 (Internal)
- Blob Storage (Private)


* * *

# 9\. リスク優先順位（例）

| リスク | 重大度 | 発生確率 | 優先度 |
| --- | --- | --- | --- |
| PII漏洩 | 高 | 中 | 最優先 |
| 閾値誤設定 | 中 | 中 | 高 |
| DoS | 中 | 中 | 高 |
| クラスタ誤分類 | 中 | 高 | 高 |

* * *

# 10\. セキュリティ設計原則

- 原本非保存

- マスク後保存

- 追記専用ログ

- 管理者承認制変更

- 最小権限原則

- 暗号化（at rest / in transit）


* * *

# 11\. 残余リスク

- OCR精度限界

- LLM非決定性

- 閾値最適化遅延


* * *

# まとめ

本DFD＋脅威モデルは：

- 画像PII保護前提

- 統計モデル導入前提

- ログ完全性保証

- STRIDE網羅

- Azure前提物理構成対応


* * *


# セキュリティレビュー資料

## AI画像対応チャットボット（Ver.1.0）

* * *

# 1\. システム概要

## 1.1 目的

- Web問い合わせの自己解決率向上

- 画像付き問い合わせの自動解析

- PII保護前提の設計

- ログ駆動改善基盤の構築


* * *

## 1.2 システム構成（物理）


構成要素：

- Web Frontend（Azure App Service）

- Application Gateway（WAF）

- Copilot Studio

- OCRサービス

- PII検出API

- Statistical Scoring API

- Azure SQL（Eventログ）

- Blob Storage（マスク済画像のみ）


* * *

# 2\. データ分類

| データ種別 | 区分 | 保存 | 備考 |
| --- | --- | --- | --- |
| 画像（原本） | 機微 | ❌ 保存しない | 即時破棄 |
| 画像（マスク済） | 制限付き | ✅ | PII除去済 |
| OCRテキスト | 機微 | マスク後保存 |  |
| Eventログ | 業務 | 保存 | Append Only |
| 閾値履歴 | 内部 | 保存 | 変更履歴管理 |

* * *

# 3\. PII保護設計

## 3.1 PII検出対象

- 氏名

- メール

- 電話番号

- 住所

- 顧客番号

- クレジット番号

- その他識別情報


* * *

## 3.2 PII処理フロー

```
nginx
Copy code

OCR → PII検出 → スコア算出 → 閾値判定 → マスク → 保存
```

* * *

## 3.3 保存ポリシー

- 原本画像：保存しない

- マスク済画像：Blob保存

- pii\_auto\_detect\_used：必須ログ項目

- pii\_detected\_count：保存

- pii\_confidence\_avg：保存


* * *

## 3.4 PII誤検出リスク管理

| リスク | 対策 |
| --- | --- |
| False Negative | 高感度閾値設定 |
| False Positive | 月次監査 |
| API障害 | 処理停止＋保存拒否 |

* * *

# 4\. アクセス制御

## 4.1 認証

- Managed Identity使用

- SQL接続はPrivate Endpoint


## 4.2 RBAC

- 最小権限原則

- 本番は管理者2名承認制


* * *

# 5\. ログ完全性設計

## 5.1 Event Source

- 1問い合わせ＝1イベント

- 追記専用

- 削除不可


* * *

## 5.2 保存期間

- 12ヶ月

- 自動アーカイブ


* * *

## 5.3 ログ項目（抜粋）

```
nginx
Copy code

event_id
cluster_id
misclassification_probability
pii_auto_detect_used
threshold_version
processing_time_ms
```

* * *

# 6\. 統計モデル関連セキュリティ

## 6.1 重み改ざん対策

- 重みハッシュ保存

- 変更履歴保存

- 管理者承認必須


* * *

## 6.2 閾値最適化管理

- 月次バッチ

- ROC生成

- Youden Index最大化

- 承認後反映

- ロールバック可能


* * *

# 7\. 通信セキュリティ

| 通信 | 保護 |
| --- | --- |
| Internet | TLS1.2+ |
| 内部API | VNet |
| Storage | Private Endpoint |
| SQL | 暗号化 |

* * *

# 8\. STRIDE分析（要約）

| 区分 | 主な対策 |
| --- | --- |
| Spoofing | トークン期限短縮 |
| Tampering | Append Only |
| Repudiation | ログ完全保存 |
| Information Disclosure | 原本非保存 |
| DoS | Rate Limit |
| Elevation | RBAC |

* * *

# 9\. 可用性

- 稼働率99%以上

- Auto-scale

- Geo Backup


* * *

# 10\. 残余リスク

| リスク | 評価 |
| --- | --- |
| OCR精度限界 | 中 |
| LLM非決定性 | 中 |
| API依存 | 中 |

* * *

# 11\. インシデント対応

- PII検出漏れ発覚時
  - ログ確認

  - Blob削除

  - 再マスク処理
- 閾値誤設定
  - 即時ロールバック

* * *

# 12\. 法令対応

- 個人情報保護法

- GDPR想定

- データ最小化原則

- 保存期間限定


* * *

# 13\. セキュリティ評価結果（自己評価）

| 項目 | 評価 |
| --- | --- |
| PII保護 | 高 |
| ログ完全性 | 高 |
| 改ざん耐性 | 高 |
| 可観測性 | 高 |
| モデル安全性 | 中〜高 |

* * *

# 14\. レビュー観点チェックリスト

- 原本保存なし確認

- PII検出ログ確認

- 閾値変更履歴確認

- RBAC設定確認

- WAF有効確認

- Append Only確認


* * *

# 15\. 総括

本システムは：

- 原本画像非保存

- PII自動マスク

- 追記専用ログ

- 統計的誤判定補正

- 承認制閾値変更


を備えた設計であり、 **企業利用におけるセキュリティ水準を満たす設計である**。

* * *




# 1\. Blob設計詳細（命名規則／フォルダ設計）設計原則

1. **原本画像は保存禁止**

2. 保存対象は **PIIマスク済画像のみ**

3. 1問い合わせ（event\_id）単位で完全追跡可能

4. フォルダ階層は「検索性 × アクセス制御 × ライフサイクル管理」重視

5. Append Only（削除は保持期限経過後のみ自動）


* * *

# 2\. ストレージアカウント設計

## 2.1 構成

- Storage Account: `staiimgprod01`

- パフォーマンス: Standard

- 冗長性: ZRS（推奨）または GRS

- Public Access: Disabled

- Private Endpoint: 必須


* * *

# 3\. コンテナ設計

| コンテナ名 | 用途 | アクセス |
| --- | --- | --- |
| `masked-images` | PIIマスク済画像 | Private |
| `audit-export` | 監査用一時出力 | 限定 |
| `threshold-artifacts` | ROC生成物 | 内部専用 |

* * *

# 4\. フォルダ（仮想ディレクトリ）設計

## 4.1 基本階層

```
bash
Copy code

masked-images/
  └── {env}/
       └── {year}/
            └── {month}/
                 └── {day}/
                      └── {event_id}/
                           ├── img_01_masked.jpg
                           ├── img_02_masked.jpg
                           └── metadata.json
```

* * *

## 4.2 例

```
swift
Copy code

masked-images/prod/2026/02/16/550e8400-e29b-41d4-a716-446655440000/
    img_01_masked.jpg
    metadata.json
```

* * *

# 5\. 命名規則（Blob名）

## 5.1 画像ファイル名

```
pgsql
Copy code

img_{index}_masked_v{mask_version}.jpg
```

例：

```

Copy code

img_01_masked_v1.jpg
```

* * *

## 5.2 metadata.json

```
pgsql
Copy code

metadata.json
```

内容：

```json
json
Copy code

{
  "event_id": "uuid",
  "pii_auto_detect_used": true,
  "pii_detected_count": 2,
  "pii_confidence_avg": 0.82,
  "mask_version": "v1.0",
  "timestamp": "2026-02-16T10:15:22Z"
}
```

* * *

# 6\. Blobパス設計ロジック

## 6.1 生成式

Path=/masked−images/env/yyyy/mm/dd/eventid/Path =
/masked-images/{env}/{yyyy}/{mm}/{dd}/{event\_id}/Path=/masked−images/env/yyyy/mm/dd/eventi​d/

* * *

# 7\. メタデータ設計（Blob Metadata）

Azure Blob Metadataに保存：

| Key | Value |
| --- | --- |
| event\_id | UUID |
| cluster\_id | AUTH\_INVALID |
| pii\_auto\_detect\_used | true |
| threshold\_version | v1.2 |
| misclassification\_probability | 0.18 |

* * *

# 8\. ライフサイクル管理

## 8.1 ポリシー

- 0〜30日：Hot

- 31〜180日：Cool

- 181日以降：Archive

- 365日後：自動削除


* * *

# 9\. セキュリティ設計

## 9.1 アクセス制御

- SAS禁止（原則）

- Managed Identityのみ許可

- RBAC最小権限


* * *

## 9.2 ネットワーク

- Public Access Disabled

- Private Endpoint

- VNet制限


* * *

## 9.3 暗号化

- At Rest: AES-256

- In Transit: TLS1.2+

- CMK（Key Vault）推奨


* * *

# 10\. 改ざん対策

- Immutable Blob Policy（WORM）30日

- Versioning有効

- Soft Delete有効（7日）


* * *

# 11\. スケーラビリティ

月500件想定：

- 1件平均2画像

- 年間約12,000画像

- 年間容量目安：20〜40GB


Blob設計上問題なし。

* * *

# 12\. 障害対策

- ZRS推奨

- Geo-redundant backup

- 定期整合性チェック


* * *

# 13\. 命名規則まとめ

| 要素 | 規則 |
| --- | --- |
| コンテナ | kebab-case |
| フォルダ | env/year/month/day |
| イベント | UUID |
| 画像 | img\_{番号}\_masked\_v{ver}.jpg |
| JSON | metadata.json |

* * *

# 14\. 監査対応

監査時：

```
sql
Copy code

event_id → SQL検索 → Blobパス取得 → metadata照合
```

追跡性完全担保。

* * *

# 15\. 拡張設計

将来：

```
bash
Copy code

/vector-embeddings/
/anomaly-detection/
/pii-sample-review/
```

追加可能。

* * *

# 16\. セキュリティレビュー観点

- 原本非保存確認

- Public Access無効確認

- Immutable設定確認

- Lifecycle設定確認

- Key Vault連携確認


* * *

# まとめ

本Blob設計は：

- PII安全設計前提

- 追跡可能

- 改ざん耐性

- スケーラブル

- 監査対応可能


* * *



# 1\. マスクUI仕様詳細目的

- ユーザーが **PIIマスク状態を視覚的に確認可能**

- 自動検出への **透明性担保**

- 誤検出・未検出の **リスク低減**

- 監査対応可能なUI証跡確保


* * *

# 2\. UX設計原則

1. 自動マスクが前提

2. ユーザーは確認・補正のみ可能

3. 原本はUI上でも保持しない

4. マスク処理は可視化

5. 操作は最小ステップ


* * *

# 3\. UIフロー

```
markdown
Copy code

画像アップロード
      ↓
解析中表示
      ↓
PII検出結果オーバーレイ表示
      ↓
ユーザー確認
      ↓
（任意）追加マスク指定
      ↓
保存確定
```

* * *

# 4\. 画面構成

* * *

## 4.1 レイアウト構成

```
scss
Copy code

┌─────────────────────────────┐
│ ① 画像表示エリア            │
│   ┌─────────────────────┐   │
│   │  マスク済オーバーレイ  │   │
│   └─────────────────────┘   │
│                              │
│ ② 検出一覧パネル             │
│   ・メール (0.92)            │
│   ・電話番号 (0.87)          │
│                              │
│ ③ 操作ボタン                │
│   [再検出] [手動マスク]     │
│   [確定] [キャンセル]       │
└─────────────────────────────┘
```

* * *

# 5\. 表示仕様

## 5.1 マスク表示

- 半透明黒（opacity 0.6）

- 角丸矩形

- hoverでラベル表示


表示例：

```
markdown
Copy code

[****MASKED****]
```

* * *

## 5.2 信頼度表示

ラベル形式：

```
scss
Copy code

Email (92%)
Phone (87%)
```

色分け：

- ≥90%：緑

- 75〜89%：橙

- <75%：赤（要確認）


* * *

# 6\. 操作仕様

* * *

## 6.1 自動検出結果確認

- ON/OFF切替不可（自動マスク強制）

- ただし除外申請可能


* * *

## 6.2 手動マスク追加

操作：

1. ドラッグ選択

2. 種別選択（任意）

3. 「追加」


制約：

- 原本は表示しない

- 上書きのみ可能


* * *

## 6.3 再検出

- 再OCR＋再PII判定

- 前回結果との差分表示


* * *

# 7\. 確定動作

「確定」押下時：

- マスク済画像をBlob保存

- metadata.json保存

- Eventログ記録


* * *

# 8\. ログ連動仕様

保存項目：

```
vbnet
Copy code

pii_auto_detect_used: true
pii_user_modified: true/false
pii_manual_add_count: int
pii_detected_count: int
pii_confidence_avg: float
```

* * *

# 9\. エラーUI

| 状況 | 表示 |
| --- | --- |
| PII API失敗 | 「個人情報検出失敗。送信不可」 |
| OCR失敗 | 再試行ボタン |
| 保存失敗 | ロールバック |

* * *

# 10\. セキュリティ仕様

- 原本はブラウザメモリのみ

- マスク後にのみサーバ送信

- キャッシュ無効

- BlobはPrivate


* * *

# 11\. アクセシビリティ

- キーボード操作対応

- ARIAラベル付与

- 色覚対応（パターン表示可）


* * *

# 12\. パフォーマンス

- マスク描画はCanvas利用

- bounding boxはJSON管理

- 200ms以内描画


* * *

# 13\. UXガード

- マスク解除不可

- 全削除不可

- 保存前に警告確認


* * *

# 14\. 監査対応UI

「検出履歴」ポップアップ：

- 検出日時

- 検出APIバージョン

- mask\_version

- threshold\_version


* * *

# 15\. データ構造（フロント）

```ts
ts
Copy code

interface PiiBox {
  id: string;
  type: "EMAIL" | "PHONE" | "NAME";
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  source: "auto" | "manual";
}
```

* * *

# 16\. UXガイドメッセージ例

- 「個人情報を自動的に保護しました」

- 「赤色の項目は確認を推奨します」

- 「マスクは解除できません」


* * *

# 17\. 重大リスク対策

| リスク | UI対策 |
| --- | --- |
| 誤検出 | 色分け |
| 未検出 | 手動追加 |
| ユーザー誤操作 | 確認ダイアログ |

* * *

# 18\. テスト観点

- PII 10パターン検証

- 手動追加動作確認

- 低信頼度強調表示確認

- 保存前ログ生成確認


* * *

# 19\. 将来拡張

- AI説明可能性表示

- 類似履歴提示

- マスク種別自動分類改善


* * *

# まとめ

本マスクUIは：

- 自動保護前提

- ユーザー確認可能

- 原本非保存

- ログ完全記録

- 監査対応可能


* * *


PII正規表現詳細コード

###### ChatGPT said:

以下は \*\* **の“使える”詳細コードです（TypeScript/JavaScript想定）。**

**※正規表現だけで100%は無理なので、**「候補抽出 → 正規化 → 追加判定（Luhn等） → 信頼度付与」\*\*の形にしています（PIIマスク設計と整合）。

* * *

## PII検出用 正規表現（実装レベル）1) 実装コード（TypeScript）

```ts
ts
Copy code

/* PII regex pack (JP + general)
 * - 候補抽出: regex
 * - 追加判定: domain allow/deny, Luhn, 文字種チェック 等
 * - 位置(オフセット)も取れるように /g 前提
 */

export type PiiType =
  | "EMAIL"
  | "PHONE_JP"
  | "PHONE_INTL"
  | "POSTAL_JP"
  | "ADDRESS_JP_HINT"
  | "CREDIT_CARD"
  | "IPV4"
  | "IPV6"
  | "URL"
  | "JWT"
  | "API_KEY_HINT"
  | "MYNUMBER_JP"
  | "BANK_ACCOUNT_JP_HINT";

export interface PiiMatch {
  type: PiiType;
  value: string;
  start: number;
  end: number;
  confidence: number; // 0..1 (heuristic)
}

function collectAll(pattern: RegExp, text: string): Array<{ value: string; start: number; end: number }> {
  const out: Array<{ value: string; start: number; end: number }> = [];
  pattern.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const value = m[0];
    out.push({ value, start: m.index, end: m.index + value.length });
    // zero-length safety
    if (m.index === pattern.lastIndex) pattern.lastIndex++;
  }
  return out;
}

/** Luhn check for credit cards */
export function luhnCheck(num: string): boolean {
  const s = num.replace(/[^\d]/g, "");
  if (s.length < 13 || s.length > 19) return false;

  let sum = 0;
  let dbl = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = s.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/** Simple domain sanity for email (optional) */
function emailDomainLooksOk(email: string): boolean {
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase();
  // deny obviously fake domains if you want (optional)
  if (domain.endsWith(".local") || domain.endsWith(".invalid")) return false;
  return domain.includes(".");
}

export const PII_REGEX = {
  // Email (RFC完璧ではなく“実務向け”)
  EMAIL: /\b[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,255}\.[A-Z]{2,24}\b/gi,

  // Japan phone: 0X-XXXX-XXXX / 0XX-XXX-XXXX / 090-1234-5678 / 03-1234-5678 等
  // ※数字列の誤検出を抑えるため、境界を意識
  PHONE_JP: /(?<!\d)(0\d{1,4})[-\s]?\d{1,4}[-\s]?\d{4}(?!\d)/g,

  // International phone: +81 90 1234 5678 など（ゆるめ）
  PHONE_INTL: /(?<!\w)\+\d{1,3}[-\s]?(?:\d{1,4}[-\s]?){2,5}\d{2,4}(?!\w)/g,

  // Japan postal code: 〒123-4567 or 123-4567
  POSTAL_JP: /(?:〒\s*)?(?<!\d)\d{3}-\d{4}(?!\d)/g,

  // “住所っぽい”ヒント（都道府県＋市区町村 + 番地の一部）
  // ※厳密な住所同定は難しいので「候補抽出」用
  ADDRESS_JP_HINT:
    /(?:東京都|北海道|(?:京都|大阪)府|.{2,3}県)\s*(?:.{1,20}市|.{1,20}区|.{1,20}町|.{1,20}村).{0,40}?(?:\d{1,4}[-丁目番地号\d]{0,15})/g,

  // Credit card (候補抽出): 13〜19桁をスペース/ハイフン許容
  // → Luhn で確定
  CREDIT_CARD: /(?<!\d)(?:\d[ -]?){13,19}(?!\d)/g,

  // IP
  IPV4: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  IPV6: /\b(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4}\b/gi,

  // URL
  URL: /\bhttps?:\/\/[^\s<>"']{3,2000}\b/gi,

  // JWT (header.payload.signature)
  JWT: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,

  // API key “っぽい” (例: sk- / api_key= / token= などの近傍)
  API_KEY_HINT: /\b(?:api[_-]?key|token|secret|access[_-]?token)\s*[:=]\s*([A-Za-z0-9_\-]{16,})\b/gi,

  // マイナンバー（12桁）候補。実運用では文脈(“マイナンバー”という語)併用推奨
  MYNUMBER_JP: /(?<!\d)\d{12}(?!\d)/g,

  // 口座番号っぽい（文脈併用推奨）
  BANK_ACCOUNT_JP_HINT: /\b(?:口座|口座番号|普通|当座)\s*[:：]?\s*\d{6,8}\b/g,
} as const;

export function detectPiiRegex(text: string): PiiMatch[] {
  const matches: PiiMatch[] = [];

  // EMAIL
  for (const m of collectAll(PII_REGEX.EMAIL, text)) {
    const conf = emailDomainLooksOk(m.value) ? 0.95 : 0.75;
    matches.push({ type: "EMAIL", ...m, confidence: conf });
  }

  // PHONE JP
  for (const m of collectAll(PII_REGEX.PHONE_JP, text)) {
    // 例: 0120(フリーダイヤル)なども含むので、運用に応じて調整可
    matches.push({ type: "PHONE_JP", ...m, confidence: 0.85 });
  }

  // PHONE INTL
  for (const m of collectAll(PII_REGEX.PHONE_INTL, text)) {
    matches.push({ type: "PHONE_INTL", ...m, confidence: 0.7 });
  }

  // POSTAL
  for (const m of collectAll(PII_REGEX.POSTAL_JP, text)) {
    matches.push({ type: "POSTAL_JP", ...m, confidence: 0.8 });
  }

  // ADDRESS hint
  for (const m of collectAll(PII_REGEX.ADDRESS_JP_HINT, text)) {
    matches.push({ type: "ADDRESS_JP_HINT", ...m, confidence: 0.65 });
  }

  // CREDIT CARD candidate + Luhn
  for (const m of collectAll(PII_REGEX.CREDIT_CARD, text)) {
    const digits = m.value.replace(/[^\d]/g, "");
    if (luhnCheck(digits)) {
      matches.push({ type: "CREDIT_CARD", ...m, confidence: 0.95 });
    }
  }

  // IPs
  for (const m of collectAll(PII_REGEX.IPV4, text)) {
    matches.push({ type: "IPV4", ...m, confidence: 0.8 });
  }
  for (const m of collectAll(PII_REGEX.IPV6, text)) {
    matches.push({ type: "IPV6", ...m, confidence: 0.75 });
  }

  // URL
  for (const m of collectAll(PII_REGEX.URL, text)) {
    matches.push({ type: "URL", ...m, confidence: 0.6 });
  }

  // JWT
  for (const m of collectAll(PII_REGEX.JWT, text)) {
    matches.push({ type: "JWT", ...m, confidence: 0.9 });
  }

  // API key hint (capture group is the key, but we store full match for masking context)
  for (const m of collectAll(PII_REGEX.API_KEY_HINT, text)) {
    matches.push({ type: "API_KEY_HINT", ...m, confidence: 0.75 });
  }

  // MyNumber (12 digits) — 文脈併用推奨
  for (const m of collectAll(PII_REGEX.MYNUMBER_JP, text)) {
    matches.push({ type: "MYNUMBER_JP", ...m, confidence: 0.5 });
  }

  // Bank account hint
  for (const m of collectAll(PII_REGEX.BANK_ACCOUNT_JP_HINT, text)) {
    matches.push({ type: "BANK_ACCOUNT_JP_HINT", ...m, confidence: 0.55 });
  }

  // 重複/包含の簡易整理（必要なら強化）
  // 例: URL内のトークン等が二重検出される場合は、優先度でマージする
  matches.sort((a, b) => a.start - b.start || b.confidence - a.confidence);

  return matches;
}
```

* * *

## 2) マスク適用（テキスト用）例

> 画像のマスクは bounding box ですが、OCRテキストログ等を保存する場合の **文字列マスク** も必要になるので、例を付けます。

```ts
ts
Copy code

export function applyTextMask(text: string, matches: PiiMatch[]): string {
  // 後ろから置換（indexズレ防止）
  const sorted = [...matches].sort((a, b) => b.start - a.start);
  let out = text;
  for (const m of sorted) {
    const masked = "****MASKED****";
    out = out.slice(0, m.start) + masked + out.slice(m.end);
  }
  return out;
}
```

* * *

## 3) 運用上の推奨（誤検出/漏れ対策）

- **住所・マイナンバー・口座** は正規表現だけだと誤検出が増えるので
  - “文脈キーワード”併用（例：`マイナンバー`, `口座番号`, `住所`）

  - 近傍ウィンドウ（±20文字）で重み付け

  - confidence を下げて \*\*UIで要確認（橙/赤）\*\*に回す
- クレカは必ず **Luhn** を通して確定

- Emailは **ドメイン妥当性チェック**（最小限でも効果あり）


* * *

# OCR結果 → PIIテキストSpan → 画像Bounding Box変換 → マージ最適化 → ログ確定処理まで含む実装詳細（TypeScript）1\. 前提データ構造

## 1.1 OCRレスポンス構造（例：Azure Vision想定）

```ts
ts
Copy code

interface OcrWord {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface OcrLine {
  words: OcrWord[];
}

interface OcrResult {
  lines: OcrLine[];
  imageWidth: number;
  imageHeight: number;
}
```

* * *

# 2\. OCRテキストを連結しオフセット付与

OCRは単語単位なので、

「全文テキスト＋単語ごとの文字オフセット」を生成する。

```ts
ts
Copy code

interface IndexedWord extends OcrWord {
  start: number;
  end: number;
}

function indexOcrWords(ocr: OcrResult): {
  fullText: string;
  words: IndexedWord[];
} {
  let cursor = 0;
  const words: IndexedWord[] = [];
  let fullText = "";

  for (const line of ocr.lines) {
    for (const w of line.words) {
      const start = cursor;
      const end = cursor + w.text.length;

      words.push({ ...w, start, end });
      fullText += w.text + " ";
      cursor = end + 1;
    }
  }

  return { fullText: fullText.trim(), words };
}
```

* * *

# 3\. PIIテキストSpan → OCR単語へマッピング

```ts
ts
Copy code

interface TextSpan {
  start: number;
  end: number;
  type: string;
  confidence: number;
}

function mapSpanToBoxes(
  span: TextSpan,
  words: IndexedWord[]
) {
  return words.filter(
    w => !(w.end <= span.start || w.start >= span.end)
  );
}
```

* * *

# 4\. Bounding Box統合ロジック（欠け防止）

OCR単語は細かく分かれているため、

連続したBoxを統合する。

```ts
ts
Copy code

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function mergeBoxes(words: IndexedWord[]): Box {
  const xs = words.map(w => w.boundingBox.x);
  const ys = words.map(w => w.boundingBox.y);
  const rights = words.map(w => w.boundingBox.x + w.boundingBox.width);
  const bottoms = words.map(w => w.boundingBox.y + w.boundingBox.height);

  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...rights) - x;
  const height = Math.max(...bottoms) - y;

  return { x, y, width, height };
}
```

* * *

# 5\. マスクボックス拡張（文字欠け防止）

上下左右に安全マージンを追加。

```ts
ts
Copy code

function expandBox(box: Box, padding: number, imgW: number, imgH: number): Box {
  return {
    x: Math.max(0, box.x - padding),
    y: Math.max(0, box.y - padding),
    width: Math.min(imgW, box.x + box.width + padding) - Math.max(0, box.x - padding),
    height: Math.min(imgH, box.y + box.height + padding) - Math.max(0, box.y - padding),
  };
}
```

推奨 padding: 4〜8px

* * *

# 6\. 重複ボックス統合（オーバーラップ除去）

IoUベースで統合。

```ts
ts
Copy code

function iou(a: Box, b: Box): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;

  return inter / (areaA + areaB - inter);
}

function mergeOverlapping(boxes: Box[], threshold = 0.3): Box[] {
  const result: Box[] = [];

  for (const box of boxes) {
    let merged = false;

    for (let i = 0; i < result.length; i++) {
      if (iou(box, result[i]) > threshold) {
        result[i] = mergeBoxesFromTwo(result[i], box);
        merged = true;
        break;
      }
    }

    if (!merged) result.push(box);
  }

  return result;
}

function mergeBoxesFromTwo(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);

  return { x, y, width: right - x, height: bottom - y };
}
```

* * *

# 7\. 画像Canvasマスク描画

```ts
ts
Copy code

function drawMask(ctx: CanvasRenderingContext2D, box: Box) {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(box.x, box.y, box.width, box.height);
}
```

* * *

# 8\. ログ確定ロジック

## 8.1 フラグ決定

```ts
ts
Copy code

interface MaskSession {
  autoDetected: boolean;
  manualAdded: number;
  autoCount: number;
}

function finalizeMaskSession(session: MaskSession) {
  return {
    pii_auto_detect_used: session.autoDetected,
    pii_user_modified: session.manualAdded > 0,
    pii_detected_count: session.autoCount + session.manualAdded,
  };
}
```

* * *

# 9\. 保存フロー（確定時）

```
markdown
Copy code

1. OCR → Span抽出
2. Span → Box変換
3. Box拡張
4. 重複統合
5. Canvas描画
6. toBlob()
7. Blob保存
8. metadata.json保存
9. Eventログ保存
```

* * *

# 10\. セキュリティ重要ポイント

- 原本Canvasは即破棄

- マスク前画像はサーバ送信禁止

- ブラウザキャッシュ無効

- 保存は Private Endpoint


* * *

# 11\. 誤検出リスク軽減

- 低confidenceは橙表示

- 0.75未満は要確認

- 自動確定不可（UI確認必須）


* * *

# 12\. 監査対応ログ例

```json
json
Copy code

{
  "event_id": "uuid",
  "pii_auto_detect_used": true,
  "pii_user_modified": true,
  "pii_detected_count": 3,
  "mask_version": "v1.1",
  "threshold_version": "v1.2",
  "timestamp": "2026-02-16T10:22:01Z"
}
```

* * *

# まとめ

この実装で：

- OCR文字単位漏れ防止

- Bounding Box精度確保

- PII検出透明化

- ログ完全追跡

- 原本非保存保証


が担保されます。

* * *



# 1\. 都道府県 完全リスト（47都道府県）

```ts
ts
Copy code

export const PREFECTURES = [\
  "北海道",\
  "青森県","岩手県","宮城県","秋田県","山形県","福島県",\
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",\
  "新潟県","富山県","石川県","福井県","山梨県","長野県",\
  "岐阜県","静岡県","愛知県","三重県",\
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",\
  "鳥取県","島根県","岡山県","広島県","山口県",\
  "徳島県","香川県","愛媛県","高知県",\
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県",\
  "沖縄県"\
] as const;
```

* * *

# 2\. 政令指定都市セット

```ts
ts
Copy code

export const DESIGNATED_CITIES = [\
  "札幌市","仙台市","さいたま市","千葉市","横浜市","川崎市","相模原市",\
  "新潟市","静岡市","浜松市","名古屋市","京都市","大阪市","堺市",\
  "神戸市","岡山市","広島市","北九州市","福岡市","熊本市"\
] as const;
```

* * *

# 3\. 市区町村パターン（汎用）

```ts
ts
Copy code

export const MUNICIPAL_SUFFIX = [\
  "市","区","町","村","郡"\
] as const;
```

* * *

# 4\. 丁目・番地・号パターン

```ts
ts
Copy code

export const ADDRESS_NUMBER_PATTERN =
  /(\d{1,4})(丁目)?[-ー－]?\d{1,4}?(番地)?[-ー－]?\d{0,4}(号)?/g;
```

* * *

# 5\. 建物名ヒント辞書

```ts
ts
Copy code

export const BUILDING_HINTS = [\
  "ビル","マンション","ハイツ","コーポ","タワー",\
  "アパート","レジデンス","メゾン","センター",\
  "第一","第二","本館","別館"\
] as const;
```

* * *

# 6\. 住所候補抽出ロジック（実装）

```ts
ts
Copy code

export function detectJapaneseAddress(text: string) {
  const results: Array<{ value: string; confidence: number }> = [];

  for (const pref of PREFECTURES) {
    if (text.includes(pref)) {
      const start = text.indexOf(pref);
      const snippet = text.slice(start, start + 60);

      const cityMatch = snippet.match(/.{1,20}(市|区|町|村)/);
      const numberMatch = snippet.match(ADDRESS_NUMBER_PATTERN);

      let score = 0.5; // base

      if (cityMatch) score += 0.2;
      if (numberMatch) score += 0.2;

      if (BUILDING_HINTS.some(b => snippet.includes(b))) {
        score += 0.1;
      }

      results.push({
        value: snippet,
        confidence: Math.min(score, 1.0)
      });
    }
  }

  return results;
}
```

* * *

# 7\. 信頼度モデル（住所用）

Confidence=0.5(prefecture)+0.2(city)+0.2(numberpattern)+0.1(buildinghint)Confidence =
0.5 (prefecture) +
0.2 (city) +
0.2 (number pattern) +
0.1 (building hint)Confidence=0.5(prefecture)+0.2(city)+0.2(numberpattern)+0.1(buildinghint)

閾値例：

- ≥0.8 → 自動マスク

- 0.65–0.79 → UI要確認

- <0.65 → ログのみ


* * *

# 8\. 高速化（Trie構造）

都道府県検索を高速化するなら：

```ts
ts
Copy code

class TrieNode {
  children: Record<string, TrieNode> = {};
  isEnd = false;
}

export class PrefTrie {
  root = new TrieNode();

  insert(word: string) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = new TrieNode();
      node = node.children[ch];
    }
    node.isEnd = true;
  }

  search(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
      let node = this.root;
      let j = i;
      while (j < text.length && node.children[text[j]]) {
        node = node.children[text[j]];
        if (node.isEnd) return true;
        j++;
      }
    }
    return false;
  }
}
```

* * *

# 9\. 拡張：郵便番号→住所照合（高精度版）

日本郵便CSV連携（オプション）：

- 郵便番号辞書

- 郵便番号一致でconfidence +0.3


* * *

# 10\. 監査ログ項目追加

```json
json
Copy code

{
  "address_detected": true,
  "address_confidence_avg": 0.82,
  "address_auto_masked": true
}
```

* * *

# 11\. 実運用推奨構成

| レイヤー | 方法 |
| --- | --- |
| Regex | 候補抽出 |
| 辞書 | 都道府県＋都市 |
| 数字判定 | 丁目番地 |
| 建物辞書 | 補強 |
| スコアリング | 重み付け |
| UI確認 | 中間ゾーン |

* * *

# 12\. 注意点

- OCR誤認識（例：東大阪市 → 東大坂市）

- 半角全角混在

- 旧字体

- 住所途中改行


→ 正規化処理必須

* * *

# まとめ

この辞書セットで：

- 47都道府県完全対応

- 政令指定都市対応

- 丁目番地対応

- 建物名ヒント対応

- スコアリング統合可能


* * *

さらに高度化可能：

- 全国市区町村完全辞書（約1,700件）

- 日本郵便公式CSV自動更新スクリプト

- 形態素解析統合（MeCab）

- 誤検出率統計モデル


次はどこまで本気で作りますか？

1. 全国市区町村完全辞書（コード生成）

2. 日本郵便CSV連携コード

3. 住所正規化エンジン

4. 高精度ベイズ型住所判定モデル


