# 03_Image_Upload_Spec

## 画像アップロード基本仕様

### 数量制限
- **最大枚数**：5 枚
- **1枚あたり最大サイズ**：5 MB
- **サポートフォーマット**：
  - JPEG (.jpg, .jpeg)
  - PNG (.png)
  - WebP (.webp) - オプション
- **非サポート**：
  - SVG（セキュリティリスク → 強制的に拒否）
  - GIF（アニメーション対応不可）
  - BMP（古いフォーマット）

### ファイル選択ダイアログ
```javascript
<input type="file" accept="image/jpeg,image/png,image/webp" multiple>
```

## バリデーション & エラーメッセージ

### フロントエンド検証
1. **ファイル形式チェック**
   ```
   拡張子 AND MIME タイプ確認
   ```
   - ❌ SVG 検出時：「SVG形式はサポートされていません」
   - ❌ 非対応形式：「JPEG、PNG、WebP 形式のみ対応しています」

2. **ファイルサイズチェック**
   ```
   if (file.size > 5 * 1024 * 1024) {
     // エラー
   }
   ```
   - ❌ 5MB 超過時：「画像サイズが大きすぎます（最大 5MB）」

3. **枚数チェック**
   ```
   if (selectedImages.length >= 5) {
     disableImageButton();
   }
   ```
   - ❌ 5 枚以上選択時：「画像は最大 5 枚までです」

4. **重複チェック**（オプション）
   ```
   if (duplicateHash exists) {
     // 警告
   }
   ```
   - ⚠️ 同一画像選択時：「この画像はすでに選択されています」

### バックエンド検証
すべてのバリデーション結果を Event ログに記録
```json
{
  "event": "image_validation_failed",
  "reason": "size_exceeded | format_invalid | svg_detected | duplicate",
  "timestamp": "2025-02-16T10:30:00Z"
}
```

## 前処理（Preprocessing）仕様

### 処理順序

#### 1. EXIF データ削除
- **対象**：JPEG 画像の EXIF メタデータ（位置情報、撮影日時、カメラ機種等）
- **方法**：
  - Node.js: `piexifjs` または `sharp` ライブラリ使用
  - C#/.NET: `System.Drawing` または `MetadataExtractor` NuGet パッケージ
- **例（Node.js）**：
  ```javascript
  const sharp = require('sharp');
  const processedBuffer = await sharp(imageBuffer)
    .withMetadata(false) // EXIF 削除
    .toBuffer();
  ```
- **Event 記録**：`exif_removed`

#### 2. 画像リサイズ
- **目標解像度**：最大 1600 × 1600 ピクセル
- **アスペクト比**：保持（パディング不可）
- **方法**：
  ```javascript
  await sharp(imageBuffer)
    .resize(1600, 1600, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .toBuffer();
  ```
- **目的**：
  - API 呼び出し時間削減
  - ストレージ節約
  - PII 検出精度維持（十分な解像度確保）
- **Event 記録**：`resize_completed`, 元サイズと新サイズを記録

#### 3. JPEG 圧縮
- **フォーマット**：JPEG（PNG は一度 JPEG に統一）
- **品質**：80%（0-100 スケール）
- **理由**：
  - 品質損失最小化（80% は視覚的にほぼ無損失）
  - ファイルサイズ削減（約 40-50%）
  - 一貫した処理
- **例**：
  ```javascript
  await sharp(imageBuffer)
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();
  ```
- **Event 記録**：`jpeg_compressed`, 圧縮率を記録

#### 4. SHA-256 ハッシュ生成
- **用途**：
  - 重複検出（同一画像の再アップロード判定）
  - 整合性確認（伝送中の破損検出）
  - 監査ログトレーサビリティ
- **例**：
  ```javascript
  const crypto = require('crypto');
  const hash = crypto
    .createHash('sha256')
    .update(processedBuffer)
    .digest('hex');
  ```
- **形式**：16 進数 64 文字文字列
- **Event 記録**：`image_hash_generated`, hash 値を記録

### 処理タイムライン

```
Input Image
    ↓
[EXIF Removal] ... ~10ms
    ↓
[Resize] ... ~50ms
    ↓
[JPEG Compress] ... ~30ms
    ↓
[SHA-256 Hash] ... ~20ms
    ↓
Output (Preprocessed Image + Hash)
    Total: ~110ms (typical)
```

## 前処理結果の保存

### フロントエンド（WebWorker）
```javascript
{
  imageBuffer: Uint8Array,
  hash: "a3f5b2c1d...", // SHA-256
  originalSize: 2048000,
  processedSize: 512000,
  originalDimensions: { width: 2048, height: 1536 },
  processedDimensions: { width: 1600, height: 1200 },
  timestamp: 1676464200000
}
```

### バックエンド送信
- **送信形式**：Base64 エンコード または バイナリ（multipart/form-data）
- **送信項目**：
  ```json
  {
    "image_hash": "a3f5b2c1d...",
    "image_data": "data:image/jpeg;base64,...",
    "original_size": 2048000,
    "processed_size": 512000,
    "processing_time_ms": 115
  }
  ```

## エラーハンドリング

### エラーシナリオ

| シナリオ | メッセージ | ユーザー操作 | Event |
|---------|----------|----------|-------|
| SVG ファイル選択 | 「SVG 形式はサポートされていません」 | ファイル削除 | `svg_rejected` |
| 6 枚目アップロード | 「画像は最大 5 枚までです」 | キャンセル | `max_images_exceeded` |
| 5MB 超過 | 「画像サイズが大きすぎます（最大 5MB）」 | ファイル削除 | `size_exceeded` |
| 非対応形式 | 「JPEG、PNG、WebP 形式のみ対応しています」 | ファイル削除 | `format_invalid` |
| EXIF 削除失敗 | 「画像処理中にエラーが発生しました。別の画像をお試しください」 | リトライ | `exif_removal_failed` |
| ハッシュ重複 | 「この画像はすでに選択されています」 | 警告のみ | `duplicate_hash_detected` |
| 処理タイムアウト（>10s） | 「画像処理中にエラーが発生しました」 | キャンセル | `preprocessing_timeout` |

