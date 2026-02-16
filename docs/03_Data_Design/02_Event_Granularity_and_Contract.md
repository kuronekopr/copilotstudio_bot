# イベント粒度と契約（Event Contract）

## 1. イベント粒度（2層構造）

### 1.1 Inquiry（問い合わせ単位：必須）
- 1問い合わせ＝1イベント（基幹レコード）
- timestamp/session_id/user_text/image_count等を中核とする

### 1.2 Stage Events（段階イベント：推奨）
- 入力、画像、解析、RAG、回答、エスカレーションを段階イベントとして追記（トレーサビリティ向上）
- ただし、集計/KPIは問い合わせ単位へ正規化して参照可能にする

## 2. PIIとuser_textの扱い
- user_text はPII混入可能性があるため、DBには user_text_masked のみ保存（マスキング済み）
- 生テキストは保存しない
- 検索性が必要な場合は user_text_hash（正規化＋SHA-256）を併用

## 3. 必須ログ機能（イベント種別）
ログ必須6種：入力/画像/解析結果/RAG検索/回答/エスカレーション

## 4. Idempotency
- event_id はUUID
- 同一event_idの再送は拒否または無視（409/OKのいずれかをAPI契約で固定）
