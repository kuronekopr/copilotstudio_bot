# /07_Security

## 目的
セキュリティ設計の体系的整理と実装ガイド

システム全体を通じた以下を確保：
- **PII 漏洩防止**：個人情報の厳格な保護
- **イメージハードニング**：画像データの最小化と非保存
- **誤分類防止**：モデルの堅牢性と検証メカニズム
- **監査対応**：すべての操作のトレーサビリティ
- **可用性維持**：DoS 攻撃への耐性

## 前提条件
- **原本画像は保存しない**：前処理後、元データを破棄
- **マスク済画像のみ**：PII 検出後のマスク済み画像は参考用に一時保存可能
- **PII 文字列非保存**：検出された PII テキストそのものは DB に保存しない
- **Event Source**：すべての操作をイベントログに記録（append-only）
- **閾値変更は承認制**：スコアリング閾値の変更には承認フローが必須

## セキュリティ設計哲学

### 1. Zero Trust
```
すべてのユーザー入力は危険と想定し、検証 & サニタイズを必須化
- ファイルタイプ検証（MIME タイプ + 拡張子 + ファイルシグネチャ）
- サイズチェック（フロント/バック両側）
- JSON Schema 検証（API 入出力）
```

### 2. Least Privilege
```
システムの各コンポーネントは最小限の権限のみ保有
- Azure RBAC：role separation
- トークン：短期有効、スコープ制限
- API ゲートウェイ：rate limiting, WAF
```

### 3. Data Minimization
```
取得・保持する個人情報を最小化
- 元画像非保存
- PII テキスト非保存（hash のみ）
- メタデータ削除（EXIF）
```

### 4. Append-Only Logging
```
過去のイベントログは改竄禁止
- DB: INSERT のみ、UPDATE/DELETE 禁止
- イベント ID: monotonically increasing
- タイムスタンプ: signed
```

## ファイル構成
- `01_Security_Overview.md` - セキュリティ目標と原則
- `02_Data_Classification_and_Minimization.md` - データ分類と最小化設計
- `03_Threat_Model_STRIDE.md` - STRIDE 脅威モデル分析
- `04_Trust_Boundaries_and_Data_Flow.md` - 信頼境界とデータフロー
- `05_Secure_Design_Decisions.md` - セキュア設計判断 (5 つ)
- `06_Identity_and_Access_Control.md` - 認証・認可設計
- `07_Network_and_Infrastructure_Security.md` - ネットワーク & インフラセキュリティ
- `08_Application_Security_Controls.md` - アプリケーション層セキュリティコントロール
- `09_Logging_Monitoring_and_Audit.md` - ログ・監視・監査
- `10_Vulnerability_and_Pentest_Checklist.md` - 脆弱性テストチェックリスト
- `11_Incident_Response_Plan.md` - インシデント対応計画

## リスク認知
このシステムは以下の残存リスクを認知・受容しています：
- **モデル誤分類**：PII を見落とす可能性（確率<5%, <75%信頼度のものはユーザー確認）
- **ゼロデイ脆弱性**：未発見のセキュリティバグ（定期的なセキュリティ監査で軽減）
- **Insider Threat**：悪意のある管理者によるアクセス（監査ログ by 外部監査）
- **Advanced Persistent Threat（APT）**：国家レベルの攻撃（別途インシデント対応計画）

