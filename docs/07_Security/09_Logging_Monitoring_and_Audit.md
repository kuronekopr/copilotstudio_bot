# 09_Logging_Monitoring_and_Audit

## イベントログシステム（Event Logging System）

### 記録対象イベント

```
├─ User Interactions
│  ├─ image_uploaded: 画像アップロード
│  ├─ message_sent: メッセージ送信
│  ├─ pii_review_shown: PII 確認画面表示
│  ├─ pii_review_submitted: PII 確認完了
│  └─ satisfaction_voted: 満足度投票
│
├─ System Processing
│  ├─ preprocessing_started: 前処理開始
│  ├─ preprocessing_completed: 前処理完了
│  ├─ ocr_completed: OCR 完了
│  ├─ pii_detection_completed: PII 検出完了
│  └─ scoring_completed: スコアリング完了
│
├─ Decisions
│  ├─ decision_auto_resolve: AUTO_RESOLVE 決定
│  ├─ decision_ask_clarification: ASK_CLARIFICATION 決定
│  └─ decision_escalate: ESCALATE 決定
│
├─ Errors
│  ├─ error_ocr_failed: OCR 失敗
│  ├─ error_pii_detection_failed: PII 検出失敗
│  ├─ error_timeout: タイムアウト
│  └─ error_api_error: API エラー
│
└─ Security Events
   ├─ token_generated: トークン生成
   ├─ token_validated: トークン検証
   ├─ rate_limit_exceeded: レート制限超過
   └─ suspicious_access_detected: 疑わしいアクセス検出
```

### ログエントリフォーマット

```json
{
  "id": 123456,
  "timestamp": "2025-02-16T10:30:00Z",
  "session_id": "sess-a1b2c3d4",
  "event_type": "pii_detection_completed",
  "event_severity": "INFO",
  "data": {
    "detected_pii_types": ["email", "phone", "address"],
    "detection_confidence_distribution": {
      "high": 2,
      "medium": 1,
      "low": 0
    },
    "processing_time_ms": 125,
    "pii_value_hash": [
      "a1b2c3d4e5f6...",
      "b2c3d4e5f6a7...",
      "c3d4e5f6a7b8..."
    ]
  },
  "user_agent": "Mozilla/5.0...",
  "ip_region": "JP",
  "previous_hash": "7a8b9c0d1e2f...",
  "current_hash": "8b9c0d1e2f3g..."
}
```

## モニタリング & アラーティング

### KPI（Key Performance Indicators）

```
┌─────────────────────────────────────────┐
│ 可用性（Availability）                  │
├─────────────────────────────────────────┤
│ 目標: ≥99%                              │
│ 実績: 99.8%                             │
│ Alert: < 99% → Critical                 │
│                                          │
├─────────────────────────────────────────┤
│ 応答時間（P50, P95）                    │
├─────────────────────────────────────────┤
│ P50: 8秒 (目標: <8秒)                  │
│ P95: 15秒 (目標: <15秒)                │
│ Alert: P95 > 20秒 → Warning            │
│                                          │
├─────────────────────────────────────────┤
│ PII 漏洩（PII Leak）                    │
├─────────────────────────────────────────┤
│ 目標: 0件/年                             │
│ Alert: 1件以上 → Critical               │
│                                          │
├─────────────────────────────────────────┤
│ モデル品質（Model Quality）              │
├─────────────────────────────────────────┤
│ UNKNOWN 率: <20%                        │
│ RAG ヒット率: >80%                      │
│ False Negative 率: <3%                 │
│ Alert: UNKNOWN > 20% → Warning         │
│                                          │
├─────────────────────────────────────────┤
│ 手動マスク率（Manual Masking Rate）      │
├─────────────────────────────────────────┤
│ 目標: <10%                              │
│ Alert: > 15% → Investigation Required  │
│                                          │
├─────────────────────────────────────────┤
│ Escalation 率（Escalation Rate）        │
├─────────────────────────────────────────┤
│ 目標: 10-15%                            │
│ Alert: < 5% または > 20% → Check       │
└─────────────────────────────────────────┘
```

### Alert ルール

```yaml
alerts:
  - name: High Error Rate
    metric: error_rate
    condition: > 5%
    duration: 5min
    severity: Critical
    action: Page on-call engineer

  - name: P95 Latency High
    metric: response_time_p95
    condition: > 20s
    duration: 10min
    severity: Warning
    action: Notify ops team

  - name: UNKNOWN Ratio High
    metric: unknown_ratio
    condition: > 20%
    duration: 1h
    severity: Warning
    action: Review model performance

  - name: Manual Masking High
    metric: manual_mask_ratio
    condition: > 15%
    duration: 1h
    severity: Warning
    action: Investigate false negatives

  - name: Rate Limit Exceeded
    metric: rate_limit_hit_count
    condition: > 100/min
    duration: 5min
    severity: Warning
    action: Check for DDoS, block if needed

  - name: Suspicious Access
    metric: geographic_anomaly
    condition: distance > max_speed * time_elapsed
    duration: 1min
    severity: Warning
    action: Require MFA or block session
```

## 監査プロセス（Audit Process）

### 週次監査（Weekly）

```
毎週月曜日 09:00 UTC

1. ログスナップショット出力
   SELECT * FROM event_logs
   WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
   ORDER BY created_at DESC
   → audit_logs/weekly_2025-02-17.csv

2. KPI 集計
   - 可用性: 99.85%
   - P95: 14.2秒
   - PII 漏洩: 0件
   - UNKNOWN 率: 18.3%

3. エラー分析
   - OCR timeout: 2件
   - API error: 5件
   - Model error: 1件
   → 原因分析 & 対応

4. 異常パターン検出
   - unusual session duration
   - suspicious ip regions
   - high error rate from specific user_agent
   → Escalation または Whitelist

5. レポート作成
   - Internal Wiki に記録
   - チームで共有
   - 次のアクション定義
```

### 月次監査（Monthly）

```
毎月第 1 営業日 09:00 UTC

1. 月間データ集計
   - Total sessions: 450
   - AUTO_RESOLVE: 340 (75.6%)
   - ASK_CLARIFICATION: 75 (16.7%)
   - ESCALATE: 35 (7.8%)

2. モデル性能評価
   - Precision: 94.2%
   - Recall: 96.1%
   - F1 Score: 95.1%
   - ROC AUC: 0.978
   → 月次目標クリア

3. セキュリティイベント確認
   - Rate limit hits: 45
   - Token validation failures: 3
   - Geographic anomalies: 2
   → すべて Normal（攻撃なし）

4. コスト確認
   - Copilot calls: $145
   - OCR API: $82
   - Storage: $12
   - Total: $239 (予算内)

5. ユーザーフィードバック確認
   - Satisfaction votes: 380 (84%)
   - Positive: 295 (77.6%)
   - Negative: 85 (22.4%)
   → Acceptable

6. サーバーパフォーマンス
   - CPU avg: 35%
   - Memory avg: 45%
   - Storage used: 2.3GB (quota: 10GB)
   → Normal

7. 次月目標設定
   - AUTO_RESOLVE rate target: 77%
   - UNKNOWN 率削減: < 17%
   - Manual masking rate: < 9%
```

### 半年次監査（Semi-Annual）

```
毎年 06 月、12 月 / 第 1 営業日

1. 6 ヶ月間のトレンド分析
   - Session growth: 450 → 480 (+6.7%)
   - AUTO_RESOLVE rate: 75.6% → 76.2% (+0.6%)
   - Error rate: 3.2% → 2.1% (-1.1%)
   - Escalation rate: 7.8% → 7.5% (-0.3%)

2. セキュリティイベント集計
   - PII 漏洩インシデント: 0件
   - Unauthorized access attempts: 12件（すべてブロック）
   - Data integrity issues: 0件
   → Security posture: Strong

3. SLA 達成度
   - Availability: 99.81% (目標: ≥99%) ✓
   - P95 latency: 15.2秒 (目標: <15秒) △
   - PII breach: 0件 (目標: 0件) ✓

4. 外部監査準備
   - Logs の完全性確認
   - Change logs 確認
   - Access control 確認
   → Ready for external audit

5. インシデント分析
   - 5件の軽微なエラー発生
   - すべて RCA 完了、対応済み
   → No repeat incidents

6. コスト最適化
   - Rightsizing opportunities 検討
   - Reserved instances 活用検討
   → 予想月 cost 削減: $20
```

## データベース監査（Database Audit）

### Azure SQL Audit

```powershell
# Audit 有効化
Set-AzSqlDatabaseAudit `
  -ResourceGroupName "myResourceGroup" `
  -ServerName "myserver" `
  -DatabaseName "mydb" `
  -AuditType SqlServerAudit `
  -StorageEndpoint "https://mystg.blob.core.windows.net" `
  -StorageKey $storageKey `
  -AuditActionGroup "SUCCESSFUL_DATABASE_AUTHENTICATION_GROUP" `
  -RetentionInDays 90

# Audit ログ確認
Get-AzSqlDatabaseAuditRecord `
  -ResourceGroupName "myResourceGroup" `
  -ServerName "myserver" `
  -DatabaseName "mydb" `
  -StartTime (Get-Date).AddDays(-1) `
  -EndTime (Get-Date)
```

