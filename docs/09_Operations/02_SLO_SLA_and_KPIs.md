# 02_SLO_SLA_and_KPIs

## SLO & SLA 定義

### 可用性（Availability）

```
【SLO】≥99%
【SLA】≥99%（顧客向けの公式承諾）

定義：
システムが正常に応答可能な時間 / 全時間 × 100%

計測方法：
- エンドポイント：GET /api/health
- チェック間隔：5 分ごと
- 許容 downtime： (100 - 99) % × 365 日 = 3.65 日 /年

Downtime 分類：
- Planned Maintenance: 除外（事前通知で中断）
- Unplanned Outage: カウント（警告対象）

Alert：
- Availability < 99% → P2 Alert
- Availability < 95% → P1 Alert (Critical)
```

### レスポンスタイム（Response Time）

```
【SLO】P50 < 8秒、P95 < 15秒
【SLA】P95 < 20秒（厳しい基準）

計測対象：
- チャット送信から回答表示まで
- 含む：前処理、OCR、PII 検出、スコアリング、LLM 生成

分析：
- P50（中央値）: 50% のセッションはこの時間以下
- P95（95 パーセンタイル）: 95% のセッションはこの時間以下
- P99（99 パーセンタイル）: 外れ値検出用

Alert：
- P95 > 15s → P2 Alert
- P95 > 20s → P1 Alert
```

### PII 漏洩（PII Leak）

```
【SLO】= 0件/年
【SLA】= 0件/年（絶対的）

定義：
ユーザーの個人情報が意図しない形で外部に露出

計測：
- 監査ログ確認（月次）
- セキュリティスキャン（月次）
- 外部ペネトレーションテスト（半年ごと）

Alert：
- PII 漏洩検出 → P1 Alert (Critical & Immediate)
```

## KPI（Key Performance Indicators）

### モデル品質（Model Quality）

```
【UNKNOWN 率】
定義：AUTO/ASK/ESCALATE のいずれにも判定できず
      「UNKNOWN」と判定される割合

【SLO】< 20%
【Alert】> 20% → Investigation Required

例：
100 セッション中、20 セッションが UNKNOWN
→ 目標達成（20% = 許容上限）

100 セッション中、25 セッションが UNKNOWN
→ Alert（21% > 20%）
→ 対応：モデルの再学習または閾値調整検討
```

### RAG（検索精度）

```
【RAG Hit Rate】
定義：FAQ データベースから関連する回答を
      見つけられた割合

【SLO】> 80%
【Alert】< 75% → FAQ DB 更新またはモデル改善

計測方法：
- 検索クエリ 100 個の適中数
- NDCG（Normalized Discounted Cumulative Gain）スコア
```

### 処理時間（Processing Time）

```
【OCR処理時間】
- 目標：< 5秒/画像
- Alert：> 8秒

【PII検出処理時間】
- 目標：< 3秒
- Alert：> 5秒

【LLM生成時間】
- 目標：< 5秒
- Alert：> 10秒
```

### エスカレーション率（Escalation Rate）

```
【定義】
全セッション中、ESCALATE に遷移した割合

【目標】10-15%（健全な範囲）
- < 5%：モデルが過度に AUTO_RESOLVE している可能性
  → False Positive が多い？ → 調査が必要
- > 20%：モデルが過度に保守的（ESCALATE が多い）
  → カバレッジが低い？ → 再学習検討

【Alert】
- < 5% → Warning（モデル品質確認）
- > 20% → Warning（費用増加、ユーザー満足度低下）
```

### 手動マスク率（Manual Masking Rate）

```
【定義】
PII_REVIEW 画面で、ユーザーが手動でマスク追加した割合

【目標】< 10%
- 高い手動マスク率 = 自動検出の False Negative が多い

【Alert】> 15% → PII 検出モデルの性能低下確認

計測：
- 手動マスク追加イベントのカウント
- 月単位で集計
```

### 満足度（User Satisfaction）

```
【定義】
AUTO_RESOLVE 後の投票結果

【投票形式】
- 👍 役に立った
- 👎 役に立たなかった

【目標】
- 肯定率 > 75%
- 否定率 < 25%

【Alert】
- 肯定率 < 70% → 回答品質低下
- 全投票数 < 50 → サンプル不足（分析延期）
```

## KPI ダッシュボード

```
┌─────────────────────────────────────────┐
│     Daily Operations Dashboard          │
├─────────────────────────────────────────┤
│                                          │
│ Availability: 99.85% ✓                 │
│ P50: 7.2秒 ✓  P95: 14.1秒 ✓           │
│ PII Leak: 0件 ✓                        │
│ UNKNOWN Rate: 18.3% ✓                  │
│ RAG Hit Rate: 82% ✓                    │
│ Escalation Rate: 12.1% ✓               │
│ Manual Mask Rate: 8.5% ✓               │
│ User Satisfaction: 78% ✓               │
│                                          │
├─────────────────────────────────────────┤
│ Alerts: None 🟢                         │
│ Last Updated: 2025-02-16 12:15 UTC      │
└─────────────────────────────────────────┘
```

