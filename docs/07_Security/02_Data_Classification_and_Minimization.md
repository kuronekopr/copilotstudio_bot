# 02_Data_Classification_and_Minimization

## データ分類（Data Classification）

### ユーザーが入力するデータ

| データタイプ | 例 | 分類 | 取扱 |
|-----------|--|------|-----|
| **画像ファイル** | 身分証、請求書 | 📕 秘密 | 一時保存（削除後） |
| **テキスト（質問）** | 「パスワードをリセットしたい」 | 📘 内部 | 処理後 30 日削除 |
| **検出 PII** | メール、電話、住所 | 📕 秘密 | Hash のみ保存 |
| **セッション ID** | sess-xxxxx | 📗 内部 | 有効期限 24 時間 |
| **IP アドレス** | 203.0.113.42 | 📘 内部 | 地域のみ保存 |

### システムが生成するデータ

| データタイプ | 例 | 分類 | 保持期間 |
|-----------|--|------|--------|
| **Event ログ** | image_uploaded, pii_detected | 📗 内部 | 6 ヶ月 |
| **スコアリング結果** | score=0.85, decision=AUTO | 📗 内部 | 1 年 |
| **エラーログ** | timeout, api_error | 📗 内部 | 3 ヶ月 |
| **セッション情報** | session_id, token | 📕 秘密 | 24 時間（有効期限） |

### 分類定義

```
📕 秘密（Confidential）：
  - PII（個人識別情報）
  - 元画像
  - セッショントークン
  - API キー

📘 内部（Internal）：
  - イベントログ（秘匿化）
  - スコアリング結果
  - エラーログ
  - システムメトリクス

📗 公開（Public）：
  - FAQ リンク
  - ドキュメント
```

## データ最小化設計（Data Minimization）

### 原則
```
「現在必要な最小限のデータのみ、最短期間保持する」
```

### 実装パターン

#### パターン 1: 元画像非保存
```
フロー：
ユーザー ─ [Upload] → Frontend WebWorker
                           ↓
                    [Preprocess]
                    - EXIF 削除
                    - リサイズ (1600×1600)
                    - JPEG 圧縮 (80%)
                    - Hash 生成
                           ↓
Backend ← [Send: hash + image_buffer + metadata]
                           ↓
                    [Discard original image]
                           ↓
   Process with preprocessed image only
```

**目的**：
- 元画像漏洩リスク排除
- ストレージ節約（80-90% 削減）
- GDPR 対応（最小化要件）

#### パターン 2: PII テキスト非保存
```
フロー：
OCR Output (テキスト)
        ↓
PII Detection Model
        ↓
検出結果：{
  "type": "email",
  "bbox": [100, 150, 250, 170],
  "confidence": 0.95,
  "value": "user@example.com"  ← DB に保存しない
}
        ↓
秘匿化：{
  "type": "email",
  "bbox": [100, 150, 250, 170],
  "confidence": 0.95,
  "value_hash": "a1b2c3d4..."  ← Hash のみ保存
}
```

**目的**：
- PII テキスト漏洩リスク排除
- 重複検出（hash による）
- 監査ログの PII 秘匿化

#### パターン 3: メタデータ削除
```
EXIF メタデータ削除対象：
- GPS 座標（位置情報）
- 撮影日時
- カメラ機種
- シリアル番号
- Copyright / Author

コード例：
const processed = await sharp(imageBuffer)
  .withMetadata(false)  // すべてのメタデータ削除
  .toBuffer();
```

#### パターン 4: ハッシュベースの検証
```
用途：
1. 重複検出
   hash(image1) === hash(image2) → 同じ画像

2. 整合性確認
   hash(received_image) === stored_hash → 破損なし

3. PII 重複検出
   hash("user@example.com") を複数回検出したら
   → 同一 PII の繰り返し

実装：
const hash = crypto
  .createHash('sha256')
  .update(processedImageBuffer)
  .digest('hex');
```

## データ保持期間（Data Retention Policy）

### 保持スケジュール

| データタイプ | 保持期間 | 削除方法 | 理由 |
|-----------|--------|--------|-----|
| **元画像** | 削除直後 | メモリ解放 | リスク最小化 |
| **マスク済画像** | 30 日 | 自動削除ジョブ | 参考用、短期保存 |
| **イベントログ** | 6 ヶ月 | Archive → Delete | 監査対応 |
| **セッションログ** | 1 年 | Archive → Delete | トレーサビリティ |
| **エラーログ** | 3 ヶ月 | 圧縮 → Archive | トラブルシューティング |
| **セッショントークン** | 24 時間 | 自動失効 | セキュリティ |

### 自動削除ジョブ

```bash
# 日次（深夜 02:00 UTC）
DELETE FROM images
WHERE created_at < NOW() - INTERVAL 30 DAY
  AND status = 'masked'  # 本当にマスク済みか確認
  AND is_referenced = FALSE  # ログから参照されていないか確認;

# 月次（1 日深夜）
DELETE FROM event_logs
WHERE created_at < NOW() - INTERVAL 6 MONTH
  AND event_type IN ('image_uploaded', 'preprocessing_completed');

# 毎日（深夜）
UPDATE session_tokens
SET is_expired = TRUE
WHERE expires_at < NOW();
```

### GDPR 対応：Right to Be Forgotten（忘れられる権利）

```
ユーザーリクエスト：「自分の情報を削除してください」
        ↓
1. セッション ID を特定
2. そのセッションに関するすべてのデータを削除
   - イベントログ（秘匿化されたものも）
   - セッショントークン
   - 参照されているマスク済画像

実装：
DELETE FROM event_logs
WHERE session_id = 'sess-xxxxx';

DELETE FROM images
WHERE session_id = 'sess-xxxxx';

DELETE FROM session_tokens
WHERE session_id = 'sess-xxxxx';
```

## データフロー図

```
┌─────────────────────────────────────────────────────┐
│                   ユーザー                            │
└─────────────────────────────────────────────────────┘
                        ↓ [Upload Image + Text]
┌─────────────────────────────────────────────────────┐
│          Frontend (Browser WebWorker)               │
│ - ファイルバリデーション                              │
│ - EXIF 削除                                         │
│ - リサイズ                                           │
│ - JPEG 圧縮                                         │
│ - Hash 生成                                         │
│ → 元画像破棄（メモリ解放）                           │
└─────────────────────────────────────────────────────┘
                        ↓ [Send: preprocessed image + hash]
┌─────────────────────────────────────────────────────┐
│         Backend API (Direct Line)                   │
│ - リクエストバリデーション                            │
│ - イベントログ記録                                   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│            OCR + PII Detection Service              │
│ - Azure Computer Vision OCR                         │
│ - PII Model Inference                               │
│ → 検出結果のハッシュ化・秘匿化                       │
└─────────────────────────────────────────────────────┘
                        ↓ [Masked image + secrete result]
┌─────────────────────────────────────────────────────┐
│               Frontend (PII Review)                 │
│ - マスク確認UI表示                                  │
│ → ユーザーマスク確認 & 追加                         │
└─────────────────────────────────────────────────────┘
                        ↓ [Send: masked image + text]
┌─────────────────────────────────────────────────────┐
│              Bot + Scoring Engine                   │
│ - LLM で回答生成                                    │
│ - スコアリング（AUTO/ASK/ESCALATE）                │
│ - イベント記録                                       │
└─────────────────────────────────────────────────────┘
                        ↓ [Display Result]
┌─────────────────────────────────────────────────────┐
│              Database (Azure SQL)                   │
│ - Event ログ（append-only）                        │
│ - セッション情報                                     │
│ - マスク済画像 (30 日後削除)                        │
│ - イベント集計                                       │
└─────────────────────────────────────────────────────┘
```

