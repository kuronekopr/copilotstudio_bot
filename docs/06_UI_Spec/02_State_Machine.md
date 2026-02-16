# 02_State_Machine

## 状態遷移図

```
    [IDLE]
      ↓
      ├─ ユーザーが画像を選択
      ↓
  [IMAGE_SELECTED] ← 画像キャンセル → [IDLE]
      ↓
      ├─ 「送信」ボタンクリック
      ↓
  [PREPROCESSING] ← エラー → [IMAGE_SELECTED]
      ├─ EXIF削除、リサイズ（1600×1600）、JPEG品質80%、SHA-256ハッシュ生成
      ↓
  [PII_DETECTING] ← タイムアウト（>30s） → [ERROR]
      ├─ Azure Computer Vision OCR
      ├─ PII検出モデル実行
      ↓
  [PII_REVIEW] ← ユーザーキャンセル → [IDLE]
      ├─ マスク済画像表示（セミトランスパレント）
      ├─ 信頼度別色分け（≥90%:緑, 75-89%:オレンジ, <75%:赤）
      ├─ 手動マスク追加・削除オプション
      ├─ マスク確認必須
      ↓
      ├─ 「送信」クリック
      ↓
  [SENDING]
      ├─ Direct Line へマスク済画像とテキスト送信
      ├─ Event: "pii_masked_sent" 記録
      ↓
  [WAITING_RESPONSE]
      ├─ ボット応答待機（タイムアウト 30s）
      ├─ ロードスピナー表示
      ↓
  [ANSWER_SHOWN]
      ├─ AUTO_RESOLVE: 回答表示 + FAQ リンク + 満足度ボタン
      ├─ ASK_CLARIFICATION: 追加質問表示
      ├─ ESCALATE: フォーム引継ぎ → フォーム画面へ遷移
      ↓
      ├─ ユーザー別操作
      ├─ AUTO_RESOLVE: 「役に立った」「役に立たなかった」投票 → [END]
      ├─ ASK_CLARIFICATION: 「回答する」クリック → [SENDING]
      ├─ ESCALATE: フォーム記入・送信 → [END/ESCALATED]
      ↓
  [END / ESCALATED]
      └─ チャット終了、ポップアップクローズ（ユーザー操作またはタイムアウト 5 分）
```

## 状態詳細説明

### 1. IDLE（アイドル状態）
- **説明**：ユーザーがチャットを開いた初期状態、または前のセッション終了後
- **画面表示**：
  - ウェルカムメッセージ：「ご質問がありましたら、画像をアップロードしてください」
  - [📎] 画像選択ボタン活性化
- **遷移条件**：
  - → IMAGE_SELECTED：ユーザーが画像選択
  - → IDLE：キャンセルボタンクリック

### 2. IMAGE_SELECTED（画像選択済み）
- **説明**：1～5枚の画像が選択されている状態
- **画面表示**：
  - サムネイル表示（複数画像可能）
  - テキスト入力欄（任意）
  - 「送信」ボタン活性化
  - 「画像削除」オプション表示
- **遷移条件**：
  - → PREPROCESSING：「送信」ボタンクリック
  - → IDLE：すべての画像を削除

### 3. PREPROCESSING（前処理中）
- **説明**：フロントエンドで画像を加工中
- **処理内容**：
  - EXIF データ削除
  - 最大 1600×1600 ピクセルへリサイズ
  - JPEG 品質 80% で圧縮
  - SHA-256 ハッシュ生成
  - Event: "preprocessing_started" 記録
- **画面表示**：「画像を処理中...」スピナー
- **タイムアウト**：10秒（超過時 ERROR → IDLE に遷移）

### 4. PII_DETECTING（PII検出中）
- **説明**：バックエンドで OCR と PII 検出を実行
- **処理内容**：
  - Azure Computer Vision で OCR 実行
  - PII 検出線形モデルで信頼度を算出
  - 検出結果を UI 用データ構造に変換
  - Event: "pii_detection_completed" 記録（結果内容は秘匿化）
- **画面表示**：「内容を分析中...」スピナー
- **タイムアウト**：30秒（超過時 ERROR へ遷移、「サーバーエラーが発生しました」）

### 5. PII_REVIEW（PII確認）
- **説明**：ユーザーがマスク結果を確認する強制確認フェーズ
- **画面表示**：
  - PII 検出ダイアログオーバーレイ（セミトランスパレント背景）
  - マスク済画像プレビュー（セミトランスパレント白ボックス）
  - 検出 PII リスト（名前、メール、電話、住所等）
  - 信頼度別色分け：
    - ≥90%：**緑** [███]（高確実）
    - 75-89%：**オレンジ** [███]（中程度）
    - <75%：**赤** [███]（低）
  - 「マスク対象を追加」ボタン（ドラッグ選択）
  - 「キャンセル」「送信」ボタン
- **ユーザー操作**：
  - 手動マスク追加（ドラッグで選択範囲指定）
  - 自動検出マスクは削除不可
  - キャンセル → IDLE へ戻る
  - 「送信」クリック → SENDING へ遷移
- **Event 記録**：
  - "pii_review_shown" （ダイアログ表示）
  - "pii_review_submitted" （マスク確認提出）

### 6. SENDING（送信中）
- **説明**：マスク済画像とテキストを Direct Line へ送信
- **処理内容**：
  - マスク済画像を Base64 またはバイナリで送信
  - テキスト（あれば）を送信
  - Event: "masked_message_sent" 記録
  - 送信完了を確認
- **画面表示**：「送信中...」スピナー
- **タイムアウト**：10秒（超過時 ERROR へ遷移）

### 7. WAITING_RESPONSE（応答待機）
- **説明**：ボットから応答が返ってくるのを待つ
- **処理内容**：
  - Direct Line メッセージハブでボット応答をリッスン
  - スコアリングエンジンが AUTO/ASK/ESCALATE を決定
  - 決定結果を受け取る
- **画面表示**：「回答を作成中...」ロードスピナー
- **タイムアウト**：30秒（超過時 TIMEOUT エラー → ESCALATE へ）

### 8. ANSWER_SHOWN（回答表示）
- **説明**：ボットの応答が表示される
- **3つの応答パターン**：
  1. **AUTO_RESOLVE**
     - ボットが直接回答を生成
     - 回答テキスト表示
     - FAQ リンク表示（3～5 件）
     - 「役に立った」「役に立たなかった」投票ボタン表示
  2. **ASK_CLARIFICATION**
     - ボットが追加質問を提示
     - 質問テキスト表示
     - 「回答する」ボタン表示
  3. **ESCALATE**
     - 「お問い合わせフォームへご案内します」メッセージ
     - フォーム画面に自動リダイレクト
     - フォーム内にセッション情報・サマリー自動入力

### 9. END / ESCALATED（終了）
- **説明**：チャットセッション終了状態
- **遷移元**：
  - AUTO_RESOLVE で投票完了
  - ASK で全往復完了
  - ESCALATE でフォーム送信完了
- **画面表示**：
  - 「ご利用ありがとうございました」メッセージ
  - [×] クローズボタン有効化
  - 5分後に自動クローズ

## イベントログ記録ポイント

| 状態遷移 | Event 名 | 記録内容 | 秘匿化 |
|---------|----------|--------|------|
| IDLE → IMAGE_SELECTED | `image_selected` | 画像ハッシュ、枚数 | Yes |
| IMAGE_SELECTED → PREPROCESSING | `preprocessing_started` | 開始時刻 | No |
| PREPROCESSING → PII_DETECTING | `preprocessing_completed` | 処理時間 | No |
| PII_DETECTING → PII_REVIEW | `pii_detection_completed` | 検出 PII 種別（秘匿化）、信頼度分布 | Yes |
| PII_REVIEW → SENDING | `pii_review_submitted` | マスク確定 | No |
| SENDING → WAITING_RESPONSE | `masked_message_sent` | 送信時刻 | No |
| WAITING_RESPONSE → ANSWER_SHOWN | `response_received` | 応答タイプ (AUTO/ASK/ESC) | No |
| ANSWER_SHOWN → END | `session_ended` | 終了理由、投票内容 | Yes |

