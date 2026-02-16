# 07_Accessibility_and_Performance

## アクセシビリティ（WCAG 2.1 Level AA）

### キーボード操作サポート

#### Tab キーナビゲーション
```
Tab キー押下時の遷移順序：
1. 「画像を選択」ボタン
2. テキスト入力欄
3. 「送信」ボタン
4. メッセージ履歴（スクロール可能）
5. サムネイル画像（削除ボタン含む）
6. 投票ボタン（役に立った/立たなかった）
7. リンク（FAQ、お問い合わせ）

Shift+Tab: 逆順移動
```

#### Enter / Space キー
```
• 「送信」ボタン：Enter キーで実行
• テキストエリア：Shift+Enter で改行、Ctrl+Enter で送信
• チェックボックス：Space キーでチェック/アンチェック
• ボタン：Space または Enter で実行
```

#### Escape キー
```
• PII マスク確認画面：Escape で「キャンセル」実行
• エラーダイアログ：Escape で閉じる
```

### スクリーンリーダー対応

#### ARIA ラベル
```html
<!-- 画像アップロード -->
<button aria-label="画像をアップロード（複数選択可、最大5枚、JPEG/PNG形式）">
  📎 画像を選択
</button>

<!-- テキスト入力 -->
<textarea aria-label="ご質問を入力してください（複数行対応）"></textarea>

<!-- 送信ボタン -->
<button aria-label="マスク済み画像とご質問を送信">
  送信
</button>

<!-- メッセージ履歴 -->
<div role="log" aria-live="polite" aria-label="チャットメッセージ履歴">
  ...
</div>

<!-- 満足度投票 -->
<button aria-label="この回答は役に立ちました">👍 役に立った</button>
<button aria-label="この回答は役に立ちませんでした">👎 役に立たなかった</button>
```

#### ARIA Role と Live Region
```html
<!-- ローディングスピナー -->
<div role="status" aria-live="polite" aria-atomic="true">
  <span aria-busy="true">画像を処理中...</span>
</div>

<!-- エラーメッセージ -->
<div role="alert" aria-live="assertive">
  「画像サイズが大きすぎます（最大 5MB）」
</div>

<!-- 状態遷移 -->
<div aria-live="polite" aria-label="現在の状態">
  状態：PII 確認待機中
</div>
```

### コントラスト（WCAG AA 基準）

#### 推奨カラー
```css
/* テキスト */
--text-primary: #212121;    /* 背景 #FFFFFF に対して 19:1 *)
--text-secondary: #656565;   /* 背景 #FFFFFF に対して 7:1 *)
--text-disabled: #BDBDBD;    /* 背景 #FFFFFF に対して 4.5:1 以上 *)

/* ボタン */
--button-primary: #0078D4;   /* 背景 #FFFFFF に対して 8.6:1 *)
--button-hover: #005A9E;
--button-disabled: #E0E0E0;

/* 警告 / エラー */
--alert-error: #D32F2F;      /* 背景 #FFFFFF に対して 5.3:1 *)
--alert-warning: #F57C00;    /* 背景 #FFFFFF に対して 7.8:1 *)
--alert-success: #388E3C;    /* 背景 #FFFFFF に対して 6.5:1 *)
```

### フォーカスインジケータ
```css
button:focus-visible {
  outline: 3px solid #0078D4;
  outline-offset: 2px;
}

input:focus-visible,
textarea:focus-visible {
  outline: 2px solid #0078D4;
  outline-offset: 1px;
}
```

### テキストサイズ調整
```css
/* ベースサイズ 14px、最大 200% までズーム対応 */
body {
  font-size: 14px;
  line-height: 1.6;
  letter-spacing: 0.3px;
}

/* ズーム対応テスト */
/* ユーザーブラウザ設定で 200% ズーム時も UI 崩れなし */
```

## パフォーマンス要件

### キー パフォーマンス インジケータ（KPI）

| 項目 | 目標 | 許容範囲 |
|------|------|--------|
| **Canvas 画像処理（前処理）** | <200ms | <250ms |
| **画像アップロード（5MB）** | <500ms | <1000ms |
| **PII マスク確認画面表示** | <500ms | <1000ms |
| **チャットメッセージ表示** | <100ms | <200ms |
| **ボット応答表示（初回）** | <2秒 | <3秒 |
| **全体応答時間（P50）** | <8秒 | <10秒 |
| **全体応答時間（P95）** | <15秒 | <20秒 |

### 前処理パフォーマンス（WebWorker）

#### 分解
```
1. EXIF 削除：~10ms
2. リサイズ（1600×1600）：~50ms
3. JPEG 圧縮（品質 80%）：~30ms
4. SHA-256 ハッシュ：~20ms
─────────────────────────
合計：~110ms（5MB ファイル時）
```

#### 最適化手法
```javascript
// 1. WebWorker で非同期処理
const worker = new Worker('image-processor.js');
worker.postMessage({ imageData: imageBuffer });

// 2. Sharp ライブラリのストリーミング
const stream = fs.createReadStream('image.jpg')
  .pipe(sharp()
    .withMetadata(false)
    .resize(1600, 1600, { fit: 'inside' })
    .jpeg({ quality: 80 })
  )
  .pipe(outputStream);

// 3. キャッシング（同一ハッシュ）
const processingCache = new Map();
if (processingCache.has(imageHash)) {
  return processingCache.get(imageHash);
}
```

### ネットワークパフォーマンス

#### 画像送信サイズ
```
元画像：5 MB
前処理後：~200-400 KB（リサイズ + JPEG80%）
Base64 エンコード：+33% → ~280-530 KB
```

#### API 呼び出し最適化
```javascript
// 1. 並列化（複数画像）
Promise.all([
  uploadImage(image1),
  uploadImage(image2),
  uploadImage(image3)
]);

// 2. バッチ送信
{
  images: [image1, image2, image3],
  text: "...",
  session_id: "..."
}

// 3. 圧縮転送
Content-Encoding: gzip
```

### ブラウザレンダリングパフォーマンス

#### First Contentful Paint（FCP）
- **目標**：<1.5秒
- **ポップアップ初期化**：軽量 HTML/CSS → 即座に描画

#### Largest Contentful Paint（LCP）
- **目標**：<2.5秒
- **メッセージ履歴**：段階的読み込み（仮想スクロール）

#### Cumulative Layout Shift（CLS）
- **目標**：<0.1
- **画像読み込み**：事前にサイズ確保（width/height 属性）
- **動的コンテンツ**：margin 固定

### メモリ管理

#### 画像バッファ管理
```javascript
// 1. 処理完了後に元バッファ削除
const processedImage = await processImage(imageBuffer);
imageBuffer = null; // ガベージコレクション

// 2. Canvas 解放
canvas.width = 0;
canvas.height = 0;
ctx = null;

// 3. IndexedDB での一時保存（大量ケース）
const db = new IDBRequest();
const store = db.createObjectStore('temp_images');
store.add(processedImage, imageHash);
```

#### メモリリーク防止
```javascript
// 1. イベントリスナー削除
element.removeEventListener('click', handler);

// 2. タイマー クリア
clearTimeout(timerId);
clearInterval(intervalId);

// 3. WeakMap での参照管理
const weakMap = new WeakMap();
weakMap.set(element, data); // element GC 時に自動削除
```

## WebWorker による非同期処理

### アーキテクチャ
```
Main Thread（UI）
    ↓ postMessage
┌────────────────────────┐
│   Web Worker           │
│ - EXIF 削除            │
│ - リサイズ             │
│ - JPEG 圧縮            │
│ - ハッシュ生成         │
└────────────────────────┘
    ↓ postMessage（結果）
Main Thread（UI 更新）
```

### 実装例
```javascript
// メインスレッド
function processImage(imageBuffer) {
  return new Promise((resolve) => {
    const worker = new Worker('processor.js');
    
    worker.onmessage = (e) => {
      const { processedImage, hash, processingTime } = e.data;
      console.log(`処理時間: ${processingTime}ms`);
      resolve({ processedImage, hash });
      worker.terminate();
    };
    
    worker.postMessage({
      imageBuffer,
      targetWidth: 1600,
      targetHeight: 1600,
      jpegQuality: 80
    });
  });
}

// Worker スレッド（processor.js）
self.onmessage = async (e) => {
  const { imageBuffer, targetWidth, targetHeight, jpegQuality } = e.data;
  const startTime = performance.now();
  
  const processed = await sharp(imageBuffer)
    .withMetadata(false)
    .resize(targetWidth, targetHeight, { fit: 'inside' })
    .jpeg({ quality: jpegQuality })
    .toBuffer();
  
  const hash = crypto.createHash('sha256')
    .update(processed)
    .digest('hex');
  
  self.postMessage({
    processedImage: processed,
    hash,
    processingTime: performance.now() - startTime
  });
};
```

## モバイルパフォーマンス最適化

### ネットワーク
```
• 4G: OK
• 3G: リトライロジック必須
• LTE: P50 <8s 目標
```

### レンダリング
```
• フレームレート：60fps（animations）
• 仮想スクロール：>100 メッセージ時は virtualization
• 画像遅延読み込み：lazy loading
```

### 電池消費
```
• WebWorker：CPU 負荷を主スレッドから分離
• アニメーション：requestAnimationFrame
• インターバル：不要な polling 削除
```

