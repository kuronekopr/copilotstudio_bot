# データ設計原則

## 1. Event Source（必須）
入力は単なる会話ログではなく、UserInquiryEvent として扱い、将来のBI/異常検知/SLA監視に拡張可能な形で保持する。

## 2. PII最小化
- 個人情報はマスキング必須
- 画像は原則保存しない（メタ情報のみ）
- （例外）監査・再現性の理由で保存する場合は「マスク済画像のみ」を別ポリシーで許可

## 3. Append-only（改ざん耐性）
- 主要イベントテーブルは原則INSERTのみ
- UPDATE/DELETEはDB権限で禁止（運用・監査ロール分離）

## 4. 監視と改善のための必須項目
- cluster_id は必ずログ化
- processing_time_ms を必ず記録
- rag_hit を記録
- UNKNOWN は監視対象
