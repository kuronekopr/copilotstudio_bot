# 03_Threat_Model_STRIDE

## STRIDE 脅威モデル

STRIDE は 6 つのセキュリティ脅威カテゴリ：
- **S**poofing（詐称）
- **T**ampering（改竄）
- **R**epudiation（否認）
- **I**nformation Disclosure（情報漏洩）
- **D**enial of Service（可用性妨害）
- **E**levation of Privilege（権限昇格）

---

## S: Spoofing（詐称）

### 脅威 S1: トークン詐造
```
シナリオ：
攻撃者が有効な JWT トークンを偽造し、別のユーザーになりすます

リスク：
- 他ユーザーのセッション情報へのアクセス
- 不正な質問送信

対策：
1. RS256（非対称署名）を使用
   const token = jwt.sign(payload, private_key, {
     algorithm: 'RS256',
     expiresIn: '15min'
   });

2. 署名検証を厳格に
   const decoded = jwt.verify(token, public_key, {
     algorithms: ['RS256']
   });

3. トークン有効期限を短く（15 分）

残存リスク評価：
- 確率：< 1%（RS256 + 強い暗号化）
- 影響：中（セッション情報のみアクセス可能）
```

### 脅威 S2: IP スプーフィング
```
シナリオ：
攻撃者が正規ユーザーの IP アドレスを偽装して API を呼び出す

対策：
1. Rate limit by session_id（IP ではなく token ベース）
2. Geographic anomaly detection
   if (session.region != current_region) {
     // 警告またはチャレンジ
   }

3. User-Agent validation
   if (token.user_agent != current_user_agent) {
     // 無効化
   }

残存リスク評価：
- 確率：< 2%（複数層での検証）
- 影響：中（セッション乗っ取りの準備段階）
```

---

## T: Tampering（改竄）

### 脅威 T1: イベントログ改竄
```
シナリオ：
悪意のある DB 管理者が、イベントログを改竄して不正操作を隠蔽

例：
UPDATE event_logs
SET action = 'no_pii_detected'
WHERE id = 12345;  -- 本来は pii_detected だった

対策：
1. Append-only ポリシー
   - INSERT のみ許可
   - UPDATE / DELETE は禁止
   - 触発可能な SQL ペア ミスを防ぐ

   CREATE TABLE event_logs (
     id BIGINT PRIMARY KEY AUTO_INCREMENT,
     session_id VARCHAR(64) NOT NULL,
     event_type VARCHAR(50) NOT NULL,
     data JSON NOT NULL,
     created_at TIMESTAMP NOT NULL,
     -- 以下は UPDATE/DELETE を禁止するチェック制約
     CHECK (created_at <= NOW())
   );

2. イベントチェーン（blockchain 風）
   - 前のイベント hash を保存
   - 改竄検出可能
   
   CREATE TABLE event_logs (
     id BIGINT,
     session_id VARCHAR(64),
     event_type VARCHAR(50),
     data JSON,
     timestamp TIMESTAMP,
     previous_hash VARCHAR(64),  -- hash(event_id-1)
     current_hash VARCHAR(64)    -- hash(id + session_id + event_type + data + timestamp + previous_hash)
   );

3. DB トリガー
   CREATE TRIGGER prevent_event_log_update
   BEFORE UPDATE ON event_logs
   FOR EACH ROW
   BEGIN
     SIGNAL SQLSTATE '45000'
     SET MESSAGE_TEXT = 'Event logs cannot be modified';
   END;

4. 監査ロール（外部監査人）
   - 定期的にログをエクスポート
   - 改竄の有無をチェック

残存リスク評価：
- 確率：< 0.1%（DB 管理者が悪意あり & append-only トリガー回避）
- 影響：極大（監査証拠の喪失）
```

### 脅威 T2: API リクエスト改竄
```
シナリオ：
中間者（Man-in-the-Middle）が、HTTPS 通信を傍受して
テキストを改竄（例：「パスワードをリセット」→ 「パスワード設定」）

対策：
1. HTTPS + TLS 1.2+（転送中の暗号化）
2. Request integrity check
   POST /api/chat/send {
     payload: {...},
     signature: hmac_sha256(payload, server_secret)
   }

3. API Gateway 検証
   if (hmac_sha256(payload, server_secret) !== signature) {
     return 401 Unauthorized;
   }

残存リスク評価：
- 確率：< 0.1%（TLS + HMAC）
- 影響：中（改竄されたテキストが処理される）
```

---

## R: Repudiation（否認）

### 脅威 R1: ユーザー操作の否定
```
シナリオ：
ユーザーが「私は実行していない」と主張
実際には、ユーザーが「DELETE」ボタンをクリックしていたが、
ログに記録されていない

対策：
1. すべての操作をログ記録
   - UI クリック：image_upload, send_message, vote_satisfaction
   - API 呼び出し：backend で再ログ

2. タイムスタンプ + session_id の組み合わせ
   {
     event: "vote_satisfaction",
     timestamp: "2025-02-16T10:30:00Z",
     session_id: "sess-xxxxx",
     user_agent: "Mozilla/5.0...",
     ip_region: "JP"
   }

3. デジタル署名
   - 重要イベントには署名を付加
   - ユーザーが改竄を否定できない

残存リスク評価：
- 確率：< 1%（ログに完全に記録）
- 影響：低（ログ証拠により否定を反驳可能）
```

---

## I: Information Disclosure（情報漏洩）

### 脅威 I1: PII の外部漏洩
```
シナリオ：
DB が侵害され、ユーザーの個人情報（メール、電話、住所）が漏出

対策：
1. PII テキスト非保存
   - DB に保存：PII 値のハッシュのみ
   - 漏洩 = ハッシュのみ（原文は回復困難）

2. 元画像非保存
   - メモリにのみ保存し、処理後削除
   - DB に保存なし

3. 暗号化（転送中、保存時）
   - TLS 1.2+（転送中）
   - AES-256-GCM（保存時）
   
   CREATE TABLE event_logs (
     ...
     data VARBINARY(1000),
     data_key_id INT,
     ...
   );
   
   INSERT INTO event_logs
   VALUES (..., AES_ENCRYPT(data_json, master_key), ...);

4. アクセス制御（RBAC）
   - 業務用アカウント：event_logs read のみ
   - 管理者アカウント：session_logs, sensitive_data read のみ
   - ユーザー本人：自分のセッションのみ read（実装済み）

残存リスク評価：
- 確率：< 2%（複数層防御）
- 影響：極大（PII 漏洩）
```

### 脅威 I2: PII マスク情報の漏洩
```
シナリオ：
バックアップが盗まれ、マスク済画像から PII を復元できる可能性

対策：
1. マスク済画像の短期保存（30 日）
2. バックアップ暗号化
   - Azure Backup with encryption at rest
3. バックアップアクセス制限
   - 最小権限の原則
4. 定期削除
   DELETE FROM images
   WHERE created_at < NOW() - INTERVAL 30 DAY;

残存リスク評価：
- 確率：< 1%（複数層防御）
- 影響：中（マスク済画像 = すでに秘匿化済み）
```

### 脅威 I3: スコアリング結果の漏洩
```
シナリオ：
スコアリング結果（score=0.85, decision=AUTO_RESOLVE）から
ユーザーの質問内容や企業の意思決定を推測できる

対策：
1. スコアリング結果の秘匿化
   - ユーザーには最終結果（回答）のみ表示
   - スコア数値は表示しない

2. アクセス制御
   - scoring_results は ops team のみ閲覧可能
   - 他スタッフは見不可

残存リスク評価：
- 確率：< 2%（アクセス制限）
- 影響：低（推測程度）
```

---

## D: Denial of Service（可用性妨害）

### 脅威 D1: リソース枯渇（API 濫用）
```
シナリオ：
攻撃者が大量の画像アップロードをしたり、
同じセッションで 1000 回の送信をして
サーバーリソースを枯渇させる

対策：
1. Rate Limiting
   - IP 単位：100 リクエスト/5 分
   - Session 単位：10 リクエスト/分
   
   const rateLimiter = rateLimit({
     windowMs: 60 * 1000,  // 1 分
     max: 10,              // 最大 10 回
     keyGenerator: (req) => req.session.id,  // session ベース
     handler: (req, res) => res.status(429).send('Too many requests')
   });

2. ファイルサイズ制限
   - 1 ファイル最大 5MB
   - 1 リクエスト最大 25MB（5 画像 × 5MB）
   
   if (req.headers['content-length'] > 25 * 1024 * 1024) {
     return res.status(413).send('Payload too large');
   }

3. Timeout 設定
   - API 呼び出し：30 秒
   - OCR 処理：30 秒
   - チャット全体：10 分

4. Autoscaling
   - CPU > 70% → scale up（Azure Virtual Machine Scale Sets）
   - Queue length > 50 → scale up

5. Request queue
   - 最大 100 件待機
   - 超過分は reject（429）

残存リスク評価：
- 確率：< 5%（rate limit 複数層）
- 影響：中（一時的なサービス低下）
```

### 脅威 D2: アルゴリズム DoS
```
シナリオ：
特殊に細工された画像を送信して、
OCR や PII 検出モデルの計算を無限ループさせる

対策：
1. Timeout（処理全体で 30 秒）
   Promise.race([
     piiDetectionPromise,
     timeoutPromise(30000)
   ]).catch(err => {
     if (err.code === 'TIMEOUT') {
       escalate();  // 人間へ引継ぎ
     }
   });

2. Input validation
   - 画像解像度チェック（最大 1600px）
   - 圧縮率チェック（JPEG quality 80%）

3. リソース制限
   - 最大メモリ：500MB/リクエスト
   - CPU 時間：20 秒

残存リスク評価：
- 確率：< 1%（timeout + input validation）
- 影響：中（timeout → escalate）
```

---

## E: Elevation of Privilege（権限昇格）

### 脅威 E1: 管理 API への無認可アクセス
```
シナリオ：
ユーザーが管理 API（閾値変更、モデル更新）に直接アクセスして
システム動作を改竄する

対策：
1. Role-based Access Control（RBAC）
   - User role：チャット利用のみ
   - Operator role：ログ閲覧、モニタリング
   - Admin role：閾値変更、モデル更新
   
   if (req.user.role !== 'admin') {
     return res.status(403).send('Forbidden');
   }

2. 管理 API は別エンドポイント
   - /api/chat/... → 公開
   - /api/admin/threshold/update → 管理者のみ

3. リクエスト署名
   - Admin API は HMAC signature 必須
   - User API は不要（JWT のみ）

残存リスク評価：
- 確率：< 0.5%（RBAC + 署名）
- 影響：極大（システム改竄）
```

### 脅威 E2: トークン権限昇格
```
シナリオ：
JWT トークンの payload を改竄して
role: "user" → role: "admin" に変更する

対策：
1. RS256（非対称署名）で署名
   - ユーザーが秘密鍵を持たない
   - 署名改竄は検出される

2. Signature verification
   const decoded = jwt.verify(token, public_key, {
     algorithms: ['RS256']
   });

3. Token rotation
   - Access token：15 分有効期限
   - Refresh token：使用禁止（セキュリティため）

残存リスク評価：
- 確率：< 0.1%（RS256 + 署名検証）
- 影響：極大
```

---

## まとめ：脅威と対策マトリックス

| 脅威 | リスク（確率 × 影響） | 対策優先度 |
|------|-----------------|---------|
| S1: トークン詐造 | 低（< 1% × 中） | High |
| T1: ログ改竄 | 極低（< 0.1% × 極大） | Critical |
| I1: PII 漏洩 | 低～中（< 2% × 極大） | Critical |
| D1: リソース枯渇 | 中（< 5% × 中） | High |
| E1: 権限昇格 | 極低（< 0.5% × 極大） | Critical |

