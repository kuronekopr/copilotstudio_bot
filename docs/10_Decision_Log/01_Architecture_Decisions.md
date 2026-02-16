# 01_Architecture_Decisions

## AD-01: B案 (Direct Line + Custom Web Chat) 採用

| 項目 | 内容 |
|------|------|
| **決定日** | 2025-01-15 |
| **決定責任者** | Architecture Lead |
| **決定カテゴリ** | Architecture |
| **優先度** | Critical |

### 決定内容
Direct Line + Custom Web Chat フレームワークを採用する

### 背景（Context）
チャットボット UI の実装方法で 3 つの案が提案された：
1. **A案**：カスタム開発（Express.js + React）
2. **B案**：Direct Line + Custom Web Chat
3. **C案**：既存 ChatSDK（Intercom 等）

### 論拠（Rationale）

#### 実装期間
```
A案：8週間（React コンポーネント開発、API 統合）
B案：3週間（テンプレート活用、Azure 設定）← 最短
C案：2週間（既存機能使用）

→ B案は A案の 60% 期間で完了できる
```

#### セキュリティ & 信頼性
```
A案：100% 自社責任
B案：Microsoft 責任分掌（フレームワーク、認証）← ベスト
C案：ベンダー（Intercom）責任（PII マスク機能なし）

→ B案は Microsoft の 24/7 サポート & 更新
```

#### カスタマイズ性
```
A案：完全なカスタマイズ ★★★★★
B案：拡張ポイント多い ★★★★ ← 十分
C案：限定的なカスタマイズ ★★

→ B案で必要な機能はすべて実装可能
```

#### LLM 統合
```
A案：自分で LLM API を統合（複雑）
B案：Direct Line が Bot Framework と連携（簡単） ← ベスト
C案：限定的（OpenAI API のみ）
```

### 意思決定マトリックス

| 基準 | 重み | A案 | B案 | C案 |
|------|------|-----|-----|-----|
| 開発期間 | 30% | 2 | 5 | 4 |
| セキュリティ | 25% | 3 | 5 | 2 |
| カスタマイズ | 20% | 5 | 4 | 2 |
| LLM統合 | 15% | 3 | 5 | 2 |
| コスト | 10% | 3 | 4 | 5 |
| **合計スコア** | | **3.15** | **4.55** | **2.80** |

→ **B案が最適** ✓

### リスク評価

| リスク | 確率 | 影響 | 対策 |
|--------|------|------|------|
| Microsoft 依存 | 低 | 中 | 代替フレームワークに移行可能（設計上） |
| UI カスタマイズ限界 | 低 | 低 | CSS override、JavaScript 拡張で対応 |
| Direct Line API 廃止 | 極低 | 極大 | Azure ロードマップ監視、代替案検討 |

### 承認

- **Architecture Lead**: _____________ 日付: _______
- **Project Manager**: _____________ 日付: _______
- **Security Lead**: _____________ 日付: _______

---

## AD-02: イベントソース (Event Sourcing) パターン採用

| 項目 | 内容 |
|------|------|
| **決定日** | 2025-01-20 |
| **決定責任者** | Backend Architect |
| **決定カテゴリ** | Architecture |
| **優先度** | High |

### 決定内容
ユーザー操作とシステム処理を append-only イベントログに記録

### 論拠

#### 監査対応
```
Event Sourcing により：
- すべての操作をタイムスタンプ付きで記録
- 改竄防止（append-only）
- イベントの因果関係を追跡可能
```

#### デバッグ効率
```
本番環境の問題を再現するため：
- イベントログをリプレイ可能
- 同じセッションを再度実行
- 根本原因分析が容易
```

#### スケーラビリティ
```
将来の分析・拡張に対応：
- マイクロサービスへの分解
- イベント駆動アーキテクチャ
- リアルタイム分析
```

### 代替案との比較

#### 案 1: 従来のトランザクション DB
```
利点：シンプル
欠点：
  - 履歴管理が複雑
  - UPDATE/DELETE で改竄可能
  - イベント再生ができない
```

#### 案 2（採用）: Event Sourcing
```
利点：
  - 完全な監査証拠
  - イベント再生可能
  - 改竄防止（append-only）

欠点：
  - ディスク使用量増加（解決：アーカイブ）
  - クエリ複雑化（解決：CQRS パターン）
```

### 実装

```sql
-- append-only テーブル
CREATE TABLE event_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(64),
  event_type VARCHAR(50),
  data JSON,
  created_at TIMESTAMP,
  previous_hash VARCHAR(64),
  current_hash VARCHAR(64)
);

-- トリガーで UPDATE/DELETE を禁止
CREATE TRIGGER prevent_modification
BEFORE UPDATE ON event_logs FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000';
END;
```

### 承認

- **Backend Architect**: _____________ 日付: _______
- **Security Lead**: _____________ 日付: _______

