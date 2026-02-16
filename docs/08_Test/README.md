# /08_Test

## 目的
機能、PII検出、スコアリング、セキュリティの包括的検証

すべての機能が仕様通りに動作し、以下を保証：
- **機能完全性**：UI/UX が期待通り動作
- **PII保護**：個人情報が適切にマスクされ、漏洩しない
- **スコアリング精度**：AUTO/ASK/ESCALATE 判定が正確
- **セキュリティ堅牢性**：脆弱性がなく、攻撃に耐える
- **パフォーマンス**：レスポンスタイムが目標値以内
- **回帰防止**：バージョン更新後の機能退行なし
- **リリース基準達成**：本番展開前の品質確認

## テスト戦略（Test Strategy）

### テストレベル

1. **ユニットテスト**（Unit）
   - 個別関数の動作確認
   - 例：sha256Hash(), resizeImage()
   - ツール：Jest, pytest
   - カバレッジ目標：>80%

2. **統合テスト**（Integration）
   - モジュール間の連携確認
   - 例：画像アップロード → 前処理 → OCR → PII 検出
   - ツール：Mocha, pytest-fixtures

3. **システムテスト**（System）
   - エンド・トゥ・エンドの動作確認
   - 例：チャット開始 → 画像送信 → 回答取得 → 終了
   - ツール：Selenium, Puppeteer, Cypress

4. **回帰テスト**（Regression）
   - 新版モデルでの性能変化確認
   - 過去のゴールドセット（100 画像）で再テスト
   - ツール：Custom Python scripts

5. **セキュリティテスト**（Security）
   - 脆弱性検査（OWASP Top 10）
   - ペネトレーションテスト
   - ツール：OWASP ZAP, Burp Suite

6. **パフォーマンステスト**（Performance）
   - レスポンスタイム計測
   - 並行セッション負荷テスト
   - ツール：Apache JMeter, k6

7. **ユーザー受け入れテスト**（UAT）
   - 実際のユーザーが使用して確認
   - 日本語マイクロコピーの確認
   - チェックリスト形式

## リスク優先順位

| リスク | 優先度 | テストカテゴリ |
|--------|--------|-----------|
| PII が送信される | Critical | PII/Security |
| 元画像が保存される | Critical | Security |
| モデル誤分類（False Negative）| High | Scoring |
| API タイムアウト | High | Performance |
| ネットワークエラー処理 | Medium | Functional |
| UI 崩れ（小画面） | Medium | Functional/Accessibility |

## ファイル構成
- `01_Test_Strategy.md` - テスト方針・アプローチ
- `02_Test_Scope_and_Risk.md` - テスト対象・対象外、リスク評価
- `03_Functional_Test_Cases.md` - 機能テスト FT-01～FT-06
- `04_PII_Test_Cases.md` - PII テスト PII-01～PII-06
- `05_Scoring_and_Threshold_Test.md` - スコアリング SC-01～SC-06
- `06_Security_Test.md` - セキュリティ SEC-01～SEC-06
- `07_Performance_Test.md` - パフォーマンス PERF-01～PERF-03
- `08_Regression_Test_Model_Update.md` - 回帰テスト（モデル更新時）
- `09_UAT_Criteria.md` - 受け入れテスト基準
- `10_Release_Gate_Checklist.md` - リリース前チェックリスト

## テスト実行スケジュール

```
開発フェーズ（週 1-4）
  ├─ ユニットテスト（continuous）
  └─ 統合テスト（daily）

テストフェーズ（週 5-6）
  ├─ システムテスト（daily）
  ├─ セキュリティテスト
  ├─ パフォーマンステスト
  └─ 回帰テスト

リリース前（週 7）
  ├─ UAT
  ├─ Final checklist
  └─ Go/No-Go decision
```

## テスト成功基準（Exit Criteria）

```
本番リリース前に以下をすべて満たす必要がある：

✓ ユニットテストカバレッジ：>80%
✓ 機能テスト：すべて PASS
✓ PII テスト：すべて PASS（PII 漏洩 0件）
✓ セキュリティテスト：Critical/High issues = 0
✓ パフォーマンス：P50<8s, P95<15s
✓ UAT：70% 以上の機能が承認
✓ リグレッション：モデル精度 ±3% 以内
```

