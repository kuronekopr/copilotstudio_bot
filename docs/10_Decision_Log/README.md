# /10_Decision_Log

## 目的
システム設計における重要な意思決定と論理的根拠を記録

アーキテクチャ、データ、セキュリティ、UI/UX 等の
各領域で「なぜこの選択をしたのか」を記録し、
将来の参考資料と監査証拠とする

## 記録形式

### 決定レコード（Decision Record）

```markdown
## [AD-01] B案 (Direct Line + Custom Web Chat) 採用

### 決定日
2025-01-15

### 決定内容
Direct Line + Custom Web Chat フレームワークを採用する

### 背景と論拠（Why）
1. 実装期間短縮（3週間 vs 8週間）
2. Microsoft によるサポート（更新、セキュリティパッチ）
3. LLM 統合の容易性（Azure OpenAI との連携）
4. スケーラビリティ（Azure インフラ）

### 検討対象（Alternatives）
1. A案：カスタム開発（Express.js + React）
   → 利点：完全なカスタマイズ、学習価値
   → 欠点：開発期間長い、保守負荷

2. C案：既存 chat SDK（Intercom, Freshdesk）
   → 利点：実装早い
   → 欠点：PII マスク機能なし、セキュリティ懸念

### 決定基準
- 開発期間: B案 < A案 < C案
- セキュリティ: B案 ≈ C案 > A案
- カスタマイズ: A案 > B案 > C案
→ Overall: B案が最適

### リスク
- Microsoft 依存性：中（代替案あり）
- カスタマイズ制限：低（独自拡張可能）

### 承認者
Architecture Lead: _____________ Date: _______

### 関連決定
- AD-02: Event Source アーキテクチャ
- PD-01: データ最小化
```

## ファイル構成
- `01_Architecture_Decisions.md` - AD-01, AD-02 等
- `02_PII_and_Data_Minimization_Decisions.md` - PD-01, PD-02, PD-03
- `03_Model_and_Threshold_Decisions.md` - MD-01, MD-02, MD-03, MD-04
- `04_UI_and_User_Experience_Decisions.md` - UD-01, UD-02, UD-03
- `05_Security_and_Risk_Acceptance.md` - SD-01, SD-02, SD-03, SD-04
- `06_Tradeoffs_and_Rejected_Options.md` - 却下された選択肢と理由
- `07_Change_History.md` - バージョン履歴

## 決定カテゴリ

### アーキテクチャ決定 (AD-xx)
- フレームワーク選定
- インフラ構成
- API 設計

### PII & データ決定 (PD-xx)
- 保持ポリシー
- 暗号化
- アクセス制御

### モデル & 閾値決定 (MD-xx)
- モデルアーキテクチャ
- 損失関数
- 最適化戦略

### UI/UX 決定 (UD-xx)
- UI パターン
- マイクロコピー
- ナビゲーション

### セキュリティ決定 (SD-xx)
- 認証方式
- 暗号化戦略
- コンプライアンス

