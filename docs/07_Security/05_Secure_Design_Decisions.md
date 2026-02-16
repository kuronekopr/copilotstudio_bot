# 05_Secure_Design_Decisions

システムの 5 つの重要なセキュア設計判断

---

## 判断 1: 原本画像非保存（No Original Image Storage）

### 決定内容
```
元画像（ユーザーがアップロードした状態）は一切保存しない。
前処理（EXIF 削除、リサイズ、圧縮）後の画像のみを処理・保存。
```

### 理由（Why）
1. **リスク最小化**：画像漏洩時のダメージ減少
   - 画像 = 身分証、請求書、スクリーンショット等
   - 漏洩 = 身元特定、詐欺、プライバシー侵害
   
2. **GDPR 対応**：データ最小化要件
   - EU でサービス提供する場合は必須
   - 日本でも個人情報保護法に準拠推奨

3. **法的責任軽減**：
   - 保存しない = 漏洩責任なし
   - 保存している = 厳格な責任

### 実装方法
```javascript
// Frontend (WebWorker)
async function processImage(imageBuffer) {
  const exifRemoved = removeExif(imageBuffer);  // 手順 1
  const resized = resizeImage(exifRemoved, 1600, 1600);  // 手順 2
  const compressed = compressJpeg(resized, 80);  // 手順 3
  const hash = sha256Hash(compressed);  // 手順 4
  
  // 元画像を破棄
  imageBuffer = null;  // GC
  
  // 前処理後の画像のみを返す
  return { processedImage: compressed, hash };
}

// Backend (Don't save original)
app.post('/api/chat/upload', async (req, res) => {
  const { preprocessedImage, hash } = req.body;
  
  // ✅ 前処理画像のみ処理
  const ocrResult = await runOcr(preprocessedImage);
  
  // ❌ 元画像は保存しない
  // await saveToBlob(req.body.originalImage);  // 禁止！
  
  // ✅ マスク済画像のみ保存（オプション、30 日後削除）
  await saveToBlob(maskedImage, { ttl: 30 });
  
  res.json({ success: true });
});
```

### トレードオフ
- **利点**：セキュリティ向上
- **欠点**：
  - ユーザーが画像を再度確認できない
  - → UI で「確認用」として一時表示のみ

### リスク受容
```
残存リスク：なし（元画像未保存なので漏洩不可能）
```

---

## 判断 2: PII 文字列非保存（No PII String Storage）

### 決定内容
```
検出された PII テキスト（メール、電話等）そのものは
データベースに保存しない。
代わりに PII 値のハッシュのみを保存。
```

### 理由（Why）
1. **PII 漏洩リスク排除**：
   - DB 漏洩時も、テキストは読めない
   - ハッシュから原文は復元困難

2. **GDPR 対応**：
   - PII = 個人情報（保護対象）
   - テキスト非保存 = 個人情報扱わない

3. **監査対応**：
   - ログには PII 値なし
   - 秘匿化済みログのみ

### 実装方法
```javascript
// ❌ 危険：PII テキストを保存
const piiResult = {
  type: 'email',
  value: 'user@example.com',  // 危険！
  confidence: 0.95
};
await db.insertEvent({
  event_type: 'pii_detected',
  data: JSON.stringify(piiResult)  // PII 露出！
});

// ✅ 安全：ハッシュのみ保存
const piiHash = sha256('user@example.com');
const secureResult = {
  type: 'email',
  value_hash: piiHash,  // ハッシュのみ
  confidence: 0.95
};
await db.insertEvent({
  event_type: 'pii_detected',
  data: JSON.stringify(secureResult)  // PII なし
});

// 重複検出用（ハッシュベース）
const detectedHashes = new Set();
piiResults.forEach(pii => {
  const hash = sha256(pii.value);
  if (detectedHashes.has(hash)) {
    console.log('Same PII detected twice');  // テキスト露出なし
  }
  detectedHashes.add(hash);
});
```

### ハッシュの性質
```
利点：
1. 一方向性：hash(x) → y、だが y → x は困難
2. 整合性：同じ値は常に同じハッシュ
3. サイズ固定：SHA-256 = 64 文字

欠点：
1. Rainbow table 攻撃（ハッシュから元値を逆算）
   対策：salt を使用
   hash = sha256(pii_value + salt)

2. 値の列挙攻撃（一般的なメールを試す）
   対策：strong salt（random, unique）
```

### Salted Hash の実装
```javascript
const crypto = require('crypto');

function hashPII(piiValue, salt) {
  return crypto
    .createHash('sha256')
    .update(piiValue + salt)
    .digest('hex');
}

// 各セッションで異なる salt を使用
const sessionSalt = crypto.randomBytes(16).toString('hex');
const emailHash = hashPII('user@example.com', sessionSalt);
```

### トレードオフ
- **利点**：PII 漏洩リスク排除
- **欠点**：
  - ハッシュからは PII を復元できない
  - ただし重複検出は可能（salt 統一時）

### リスク受容
```
残存リスク：
- Rainbow table 攻撃（<1% 確率、strong salt で軽減）
```

---

## 判断 3: マスク削除不可（No Mask Removal）

### 決定内容
```
自動検出されたマスク対象は、ユーザーが削除できない。
削除 = システムから削除ではなく、UI で削除不可にする。
```

### 理由（Why）
1. **PII 再露出防止**：
   - ユーザーが意図せず（悪意あり）にマスク削除
   - マスク済画像にもかかわらず PII 含有

2. **法的責任**：
   - ユーザーミスに対するシステム防御
   - システムは「最善を尽くした」ことを証明

3. **UI/UX バランス**：
   - 自動検出：絶対に削除禁止
   - 手動追加：削除可能（ユーザー権限）

### 実装方法
```javascript
// PII Detection Result
const detectedPIIs = [
  {
    type: 'email',
    confidence: 0.95,
    isAutoDetected: true,  // ← マーク
    bbox: [100, 150, 250, 170]
  },
  {
    type: 'phone',
    confidence: 0.87,
    isAutoDetected: true,
    bbox: [300, 200, 400, 220]
  }
];

// Frontend: UI で削除不可に
<div className="pii-item">
  <input 
    type="checkbox" 
    checked 
    disabled={pii.isAutoDetected}  // 自動検出は disabled
    onChange={handlePIIToggle}
  />
  {pii.type} (信頼度: {pii.confidence * 100}%)
  {pii.isAutoDetected && (
    <span className="icon-locked">🔒</span>
  )}
</div>

// Backend: Validation
if (pii.isAutoDetected && !maskApplied) {
  return res.status(400).json({
    error: 'Auto-detected PIIs cannot be removed'
  });
}
```

### ユーザーメッセージ
```
ℹ️ 自動検出されたマスク対象は削除できません。
   ご不明な点はサポートまでお問い合わせください。
```

### トレードオフ
- **利点**：PII 再露出防止
- **欠点**：
  - ユーザー自由度が低い
  - 誤検出時にマスク削除不可 → サポート負荷増加

### リスク受容
```
残存リスク：
- 誤検出によるユーザー不便（<5% 確率）
  対策：サポートチャネル提供
```

---

## 判断 4: 承認ベース閾値管理（Approval-Based Threshold Management）

### 決定内容
```
スコアリング閾値（AUTO/ASK/ESCALATE の判定値）の変更には
必ず承認フロー（管理者レビュー）を経る。
自動更新は禁止。
```

### 理由（Why）
1. **誤分類影響の抑止**：
   - 閾値を下げる = より多くを AUTO と判定
   - AUTO → ユーザーに直接回答
   - 閾値誤り = PII 漏洩ブレーク

2. **説明責任**：
   - 誰が、いつ、なぜ閾値を変更したか記録
   - 事故調査で重要

3. **段階的改善**：
   - テスト環境で検証
   - 本番環境への段階的ロールアウト
   - Canary deployment

### 実装方法
```javascript
// 閾値変更リクエスト
POST /api/admin/threshold/update
{
  thresholdName: 'auto_resolve_threshold',
  oldValue: 0.70,
  newValue: 0.75,
  reason: 'Based on ROC analysis, Youden index optimization',
  affectedPercentage: 3.2  // 意思決定に影響するセッション数
}

// 承認フロー（管理者）
1. リクエスト受信
2. テスト環境でバリデーション
3. 影響分析（ログデータで過去のセッションをシミュレート）
4. 管理者（2 名以上）による検討
5. 承認 → 本番デプロイ
6. 監視（false negative rate, false positive rate）

// 実装: Feature toggle（段階的ロールアウト）
const getThreshold = () => {
  const featureFlag = await getFeatureFlag('threshold_0.75');
  if (featureFlag === 'enabled') {
    return 0.75;  // 新しい閾値
  } else if (featureFlag === 'canary') {
    // 10% のセッションのみ新しい閾値を使用
    return Math.random() < 0.1 ? 0.75 : 0.70;
  } else {
    return 0.70;  // 従来の閾値
  }
};
```

### 変更履歴
```
Date       | Threshold | Reason | Approved By
-----------|-----------|--------|-------------
2025-02-01 | 0.70      | Initial deployment | Admin A
2025-02-15 | 0.75      | ROC analysis | Admin A, B
2025-03-01 | 0.72      | False negative ↑ | Admin C, D
```

### トレードオフ
- **利点**：慎重な運用、誤分類防止
- **欠点**：
  - 変更の遅延（承認待ち）
  - 運用コスト増加

### リスク受容
```
残存リスク：
- 承認期間中の悪い判定（数日間）
  対策：迅速な承認プロセス、emergency override
```

---

## 判断 5: Append-Only ロギング（Append-Only Logging）

### 決定内容
```
イベントログテーブルに対して、INSERT のみを許可。
UPDATE, DELETE, TRUNCATE は禁止（トリガー + 権限で強制）。
```

### 理由（Why）
1. **監査証拠の改竄防止**：
   - 万が一 DB が侵害されても、ログは改竄不可
   - 事後調査で真実が判定可能

2. **コンプライアンス**：
   - SOC 2, ISO 27001 要件
   - 金融、医療業界では必須

3. **Insider threat 検出**：
   - 悪意のあるオペレーター検出
   - 「ログがない」= 改竄した証拠

### 実装方法
```sql
-- テーブル定義
CREATE TABLE event_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (created_at <= NOW())  -- 未来日付を防止
);

-- UPDATE 防止トリガー
CREATE TRIGGER prevent_event_log_update
BEFORE UPDATE ON event_logs
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'Event logs cannot be updated';
END;

-- DELETE 防止トリガー
CREATE TRIGGER prevent_event_log_delete
BEFORE DELETE ON event_logs
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'Event logs cannot be deleted';
END;

-- アクセス権限
GRANT SELECT, INSERT ON event_logs TO app_user;
-- DELETE, UPDATE, TRUNCATE は付与しない
```

### イベントチェーン（ブロックチェーン風）
```sql
-- イベントチェーン用フィールド
ALTER TABLE event_logs ADD COLUMN (
  previous_hash VARCHAR(64),
  current_hash VARCHAR(64)
);

-- 挿入時に自動計算
CREATE TRIGGER calculate_event_hash
BEFORE INSERT ON event_logs
FOR EACH ROW
BEGIN
  -- 前イベントのハッシュを取得
  SET @prev_hash = (
    SELECT current_hash FROM event_logs
    WHERE id = (SELECT MAX(id) FROM event_logs)
  );
  
  -- 現在のハッシュを計算
  SET NEW.previous_hash = COALESCE(@prev_hash, '0');
  SET NEW.current_hash = SHA2(
    CONCAT(NEW.session_id, NEW.event_type, 
           NEW.data, NEW.created_at, NEW.previous_hash),
    256
  );
END;

-- 改竄検出
SELECT * FROM event_logs
WHERE current_hash != SHA2(
  CONCAT(session_id, event_type, data, created_at, previous_hash),
  256
);  -- 改竄あれば行が返される
```

### トレードオフ
- **利点**：監査証拠の改竄不可
- **欠点**：
  - ログサイズ増加（削除不可）
  - 定期アーカイブが必須

### リスク受容
```
残存リスク：なし（append-only で改竄不可）
```

---

## まとめ：5 つの設計判断と効果

| 判断 | 対象脅威 | リスク低減 |
|------|--------|----------|
| 1. 原本非保存 | 画像漏洩 | -80% |
| 2. PII 文字列非保存 | PII 漏洩 | -90% |
| 3. マスク削除不可 | PII 再露出 | -99% |
| 4. 承認ベース閾値 | 誤分類 | -70% |
| 5. Append-only ログ | ログ改竄 | -99% |

