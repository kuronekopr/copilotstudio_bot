# 01_Test_Strategy

## テスト方針（Test Approach）

### 方針 1: リスク駆動テスト（Risk-Driven Testing）

```
最大リスク（PII 漏洩）に対して最大のテスト投資

リスク分類：
1. Critical（PII 漏洩）
   → テスト強度：★★★★★（最大）
   → テスト件数：50+ ケース
   → チーム：複数人での相互確認

2. High（誤分類、API エラー）
   → テスト強度：★★★★ (高)
   → テスト件数：20+ ケース

3. Medium（UI/UX）
   → テスト強度：★★★ (中)
   → テスト件数：10+ ケース
```

### 方針 2: 自動化テスト優先

```
CI/CD パイプラインに組み込まれるテスト：
- ユニットテスト（毎コミット）
- 統合テスト（毎デイリービルド）
- セキュリティスキャン（毎ビルド）

手動テストのみ：
- UI/UX テスト（パイロット確認用）
- UAT（エンドユーザーテスト）
- ペネトレーション（外部監査）
```

### 方針 3: データ駆動テスト（Data-Driven Testing）

```
複数の入力パターンを系統的にテスト：

テストデータセット：
- 正常ケース（happy path）
- 境界値（boundary）
- エッジケース（edge cases）
- エラーケース（error cases）

例：PII テスト
- email: valid@example.com (正常)
- email: a@b (境界)
- email: 123@456 (エッジ)
- email: @invalid (エラー)
```

### 方針 4: 品質ゲート（Quality Gates）

```
各ステージで品質基準をクリアしないと進行不可：

Unit Test Phase
  ↓ (カバレッジ >80%)
Integration Test Phase
  ↓ (すべて PASS)
System Test Phase
  ↓ (Critical/High issues 0)
Security Test Phase
  ↓ (脆弱性 0)
Performance Test Phase
  ↓ (P95<15s)
Regression Test Phase
  ↓ (精度 ±3%)
UAT & Release Gate
  ↓ (GO/NO-GO decision)
Production Release
```

## テストレベル別の目標

### ユニットテスト

```
対象： 個別関数・クラス
例：
  - imagePreprocessing()
  - sha256Hash()
  - validateImageFile()
  - maskPII()

目標：
  - カバレッジ > 80%
  - Statement coverage: 80%
  - Branch coverage: 70%
  - Function coverage: 90%

ツール： Jest (Node.js), pytest (Python)

実行頻度： 毎コミット
```

### 統合テスト

```
対象： モジュール間の連携
例：
  - WebWorker → Backend API
  - OCR Service → PII Detection
  - Scoring Engine → Direct Line

目標：
  - すべて PASS
  - API レスポンス時間 <500ms
  - エラー処理の確認

ツール： Mocha, pytest-fixtures

実行頻度： 日次（nightly build）
```

### システムテスト

```
対象： E2E シナリオ
例：
  1. ユーザーが画像をアップロード
  2. 前処理実行
  3. PII 検出
  4. マスク確認
  5. 送信
  6. ボット応答表示
  7. 投票

目標：
  - すべてのシナリオが PASS
  - UI が期待通り表示
  - タイムアウトなし

ツール： Selenium, Cypress

実行頻度： テストフェーズ（週 5-6）
```

## テスト環境

### 環境構成

```
【Development】
- ローカル PC
- DB: SQLite (in-memory)
- API: Mocker (モック API)
- OCP: Mocker

【Staging】
- Azure App Service
- DB: Azure SQL (test database)
- API: 実 API（テスト用キー）
- OCR:実 API（テスト用キー）
- LLM: Mocker（応答を制御）

【Production】
- Azure App Service (Scale set)
- DB: Azure SQL (encrypted)
- API: 実 API
- OCR: Azure Computer Vision
- LLM: Azure OpenAI
```

### テストデータ管理

```
【Golden Set】（回帰テスト用）
- 100 個の画像（20 クラスタ）
- 既知の PII パターン
- 既知のモデル予測（ベースライン）
- 保管：Staging environment

【テストユーザー】
- Anonymous test_user_001 ~ test_user_100
- 履歴なしで各テスト開始
- テスト終了後に purge
```

## テスト報告書フォーマット

```markdown
# Test Report
Date: YYYY-MM-DD
Tester: [Name]
Build Version: v1.2.3

## Summary
- Total Test Cases: 50
- Passed: 48 (96%)
- Failed: 2 (4%)
- Blocked: 0

## Failures
| ID | Category | Description | Severity |
|----|----------|-------------|----------|
| FT-03 | Functional | Upload 6 images → still shows "Add" button | High |
| SEC-01 | Security | SVG file accepted | Critical |

## Root Cause Analysis
- FT-03: Frontend validation check not synchronized
- SEC-01: MIME type check bypassed

## Recommendations
- [ ] Fix JavaScript validation
- [ ] Add server-side SVG detection
- [ ] Re-run tests after fix

## Approval
QA Lead: _________________ Date: _______
```

