# 01_Security_Overview

## セキュリティ目標（Security Objectives）

### S1: PII 漏洩防止（PII Leak Prevention）
**定義**：個人情報（メール、電話、住所、名前、郵便番号）がシステム外部に漏洩しない

**許容値**：
- PII 漏洩インシデント：0/年（absolute zero）
- PII を含むログ出力：0/年
- 原本画像外部送信：0/回

**実装**：
- 元画像非保存（一時メモリのみ）
- マスク済画像のみ処理・保存
- PII テキスト非保存（hash のみ）
- ログサニタイズ（PII 検出ラベルは保存、テキストは秘匿化）

### S2: 画像最小化（Image Minimization）
**定義**：画像データの保有を最小化し、外部漏洩時の影響を減らす

**許容値**：
- 画像ストレージ使用期間：≤30 日（自動削除）
- 原本画像保存：0%（100% 前処理削除）

**実装**：
- EXIF 削除（位置情報等メタデータ）
- 解像度制限（1600px）
- JPEG 圧縮（品質 80%）

### S3: モデル誤分類防止（Misclassification Prevention）
**定義**：スコアリングモデルが誤った判定をしないための検証メカニズム

**許容値**：
- False Negative Rate（PII を見落とす）：<3%
- False Positive Rate（誤検出）：<5%
- 低信頼度（<75%）の PII：ユーザー確認必須

**実装**：
- ユーザー確認画面（PII_REVIEW）必須
- 信頼度表示（信号機：緑/オレンジ/赤）
- 手動マスク追加機能
- ROC 分析による定期的な閾値最適化

### S4: 監査対応（Auditability）
**定義**：すべてのユーザー操作とシステム決定を記録・追跡可能にする

**許容値**：
- イベントログ脱落：0/年
- ログ改竄検出：monthly
- セッション追跡可能性：100%

**実装**：
- Append-only Event Log
- Timestamped & signed events
- Session tracking (session_id → user_agent, IP, region, etc.)
- Monthly audit review

### S5: 可用性維持（Availability）
**定義**：DoS 攻撃やリソース枯渇からシステムを保護

**許容値**：
- 可用性：≥99%（年間 3.65 日の停止許容）
- P95 応答時間：<15秒

**実装**：
- Rate limiting（IP/session 単位）
- File size limit（5MB/枚）
- Concurrent session limit（200 per server）
- Autoscaling（負荷に応じた自動スケール）

## セキュリティ設計原則

### 原則 1: Defense in Depth（多層防御）
```
  フロントエンド検証
        ↓ (ファイル形式, サイズ)
  バックエンド検証
        ↓ (MIME, signature)
  API Gateway (WAF, rate limit)
        ↓
  Application Logic (サニタイズ, SQL injection 対策)
        ↓
  Database (encryption at rest)
        ↓
  Network (HTTPS, VPN)
```

### 原則 2: Fail Securely（安全な失敗）
```
エラー発生時の原則：
- より制限的な状態へ遷移
- ユーザー情報を漏らさない
- 例：API timeout → ESCALATE（人間へ引継ぎ）
```

### 原則 3: Least Privilege（最小権限）
```
各コンポーネントの権限を最小化：
- Frontend: UI のみ（認証なし）
- Backend API: read/write only（admin API 別）
- Database: select/insert のみ（delete/update は管理者のみ）
- Storage: Blob only（VM は full access 不可）
```

### 原則 4: Zero Trust（ゼロトラスト）
```
すべての入力・リクエストを疑う：
- input validation: 必須
- output encoding: 必須
- 内部通信: TLS 必須
```

### 原則 5: Transparency & Logging（透明性 & ログ）
```
操作の完全な記録：
- すべてのユーザー操作
- すべてのシステム決定
- 改竄防止（append-only）
- 監査可能（人間が週単位で確認）
```

## セキュリティ層別の責務

### Layer 1: ネットワーク & インフラ
- HTTPS (TLS 1.2+)
- VPC / Private Endpoint
- WAF / DDoS Protection
- 暗号化（転送中、保存時）

### Layer 2: API ゲートウェイ
- 認証（JWT token）
- 認可（RBAC）
- Rate limiting
- Request validation

### Layer 3: アプリケーション
- Input sanitization
- Output encoding
- CSRF 対策
- SQL injection 対策
- XSS 対策
- Prompt injection 対策（LLM 向け）

### Layer 4: データベース
- Access control
- Encryption at rest
- Backup & recovery
- Audit logging

### Layer 5: 監査 & インシデント対応
- Event log review
- Vulnerability scanning
- Penetration testing
- Incident response runbook

