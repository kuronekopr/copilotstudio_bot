# 02_Test_Scope_and_Risk

## インスコープ（In Scope）

### 機能テスト
```
✓ UI/UX（チャットウィンドウ、ボタン、フォーム）
✓ 画像アップロード（複数画像、上限チェック）
✓ PII マスク確認UI
✓ ボット回答表示
✓ 満足度投票
✓ エスカレーション
✓ キーボード操作（アクセシビリティ）
```

### PII テスト
```
✓ メールアドレス検出
✓ 電話番号検出
✓ 住所検出
✓ 郵便番号検出
✓ 氏名検出
✓ 誤検出（False Positive）
✓ 見落とし（False Negative）
```

### セキュリティテスト
```
✓ SVG ファイル拒否
✓ 元画像非保存確認
✓ PII テキスト非保存確認
✓ EXIF 削除確認
✓ ログ改竄防止（Append-only）
✓ トークン有効期限
✓ レート制限
```

### パフォーマンステスト
```
✓ P50 レスポンスタイム
✓ P95 レスポンスタイム
✓ 並行セッション負荷テスト
✓ メモリ使用量
✓ CPU 使用率
```

---

## アウトオブスコープ（Out of Scope）

### 非テスト対象
```
× Azure インフラストラクチャ（Microsoft 責任）
× Direct Line フレームワーク（Microsoft 提供）
× Azure Computer Vision API（Microsoft）
× Azure OpenAI API（OpenAI 責任）
× ブラウザの互換性（Chrome, Firefox 等）
  → 推奨環境のみテスト
```

### 後続フェーズ（将来）
```
△ 多言語対応テスト（現在は日本語のみ）
△ モバイルアプリ版（Web only）
△ オフラインモード（オンラインのみ）
△ カスタマイズ機能（将来追加予定）
```

---

## リスク評価マトリックス

### Probability × Impact

```
High Probability (80-100%)
├─ 低 Impact: Server down (可用性影響)
├─ 中 Impact: API slow (UX 影響)
└─ 高 Impact: PII visible to user (セキュリティ)

Medium Probability (40-79%)
├─ 低 Impact: UI button misaligned
├─ 中 Impact: Wrong FAQ displayed
└─ 高 Impact: False Negative (PII 見落とし)

Low Probability (1-39%)
├─ 低 Impact: Typo in message
├─ 中 Impact: Rare browser crash
└─ 高 Impact: 外部攻撃成功（ペネトレーション）
```

### リスク別テスト投資

| リスク | 確率 × 影響 | テスト強度 | テスト件数 |
|--------|----------|----------|---------|
| **PII 漏洩** | 高 × 高 | ★★★★★ | 50+ |
| **誤分類（FN）** | 中 × 高 | ★★★★ | 25+ |
| **API エラー** | 中 × 中 | ★★★ | 15 |
| **UI 不具合** | 低 × 低 | ★★ | 5 |
| **セキュリティ脆弱性** | 低 × 極高 | ★★★★★ | 40+ |

---

## テスト優先度（Priority）

### Phase 1（Week 5）: Critical Path

```
1. PII 検出 & マスク
   - テスト件数：25
   - 優先度：P0
   - ブロッカー：YES

2. セキュリティ（SVG拒否、ログ改竄防止）
   - テスト件数：15
   - 優先度：P0
   - ブロッカー：YES

3. API エラー処理
   - テスト件数：10
   - 優先度：P1
   - ブロッカー：YES
```

### Phase 2（Week 6）: High Priority

```
4. 機能テスト（画像アップロード、UI）
   - テスト件数：20
   - 優先度：P1

5. パフォーマンステスト
   - テスト件数：8
   - 優先度：P1

6. 回帰テスト（モデル更新後）
   - テスト件数：100
   - 優先度：P1
```

### Phase 3（Week 7）: UAT & Release

```
7. ユーザー受け入れテスト
   - 対象：日本語ネイティブスピーカー
   - テスト件数：5 シナリオ
   - 優先度：P2

8. 最終リリースチェック
   - テスト件数：Checklist
   - 優先度：P0
```

