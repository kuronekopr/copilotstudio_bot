# 04_Trust_Boundaries_and_Data_Flow

## 信頼境界（Trust Boundaries）

システムを 6 つの信頼境界に分割：

```
┌──────────────────────────────────────────────────────┐
│ TB1: ユーザー ↔ Frontend                             │
│      [チャットウィンドウ in ブラウザ]                 │
└──────────────────────────────────────────────────────┘
                        ↕ (HTTPS)
┌──────────────────────────────────────────────────────┐
│ TB2: Frontend ↔ API Gateway                         │
│      [Direct Line, CORS]                             │
└──────────────────────────────────────────────────────┘
                        ↕ (HTTPS)
┌──────────────────────────────────────────────────────┐
│ TB3: API Gateway ↔ Backend Services                 │
│      [Internal VPC]                                  │
└──────────────────────────────────────────────────────┘
                        ↕ (Private Endpoint)
┌──────────────────────────────────────────────────────┐
│ TB4: Backend ↔ External Services                    │
│      [Azure Computer Vision, OpenAI API]             │
└──────────────────────────────────────────────────────┘
                        ↕ (HTTPS)
┌──────────────────────────────────────────────────────┐
│ TB5: Backend ↔ Database                             │
│      [Azure SQL Database]                            │
└──────────────────────────────────────────────────────┘
                        ↕ (Private Link)
┌──────────────────────────────────────────────────────┐
│ TB6: Backend ↔ Storage                              │
│      [Azure Blob Storage]                            │
└──────────────────────────────────────────────────────┘
```

## 各信頼境界の詳細

### TB1: ユーザー ↔ Frontend

**特性**：
- 完全に不信頼（ユーザーは攻撃者かもしれない）
- クライアント側のコードは改竄可能

**防御策**：
1. フロントエンド検証はヒントのみ（バックエンド必須検証）
2. 入力のサニタイズ（XSS 対策）
3. CSRF トークン（フォーム送信）

**実装**：
```javascript
// XSS 対策
const sanitized = DOMPurify.sanitize(userInput);

// ファイル検証（ヒント）
if (!['image/jpeg', 'image/png'].includes(file.type)) {
  warn('形式をご確認ください');
  // でもバックエンドでも再検証
}
```

### TB2: Frontend ↔ API Gateway

**特性**：
- HTTPSにより転送中暗号化
- しかし CORS なので外部からのリクエスト可能

**防御策**：
1. HTTPS/TLS 1.2+ 必須
2. CORS ポリシー制限
3. Rate limiting（IP 単位）
4. Request validation（Content-Type 等）

**設定例**：
```javascript
// CORS ポリシー
app.use(cors({
  origin: ['https://example.com', 'https://www.example.com'],
  methods: ['POST'],  // GET 不許可
  credentials: true,
  maxAge: 3600
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100  // IP あたり 5 分間に 100 リクエスト
}));
```

### TB3: API Gateway ↔ Backend Services

**特性**：
- 内部 VPC 通信
- 相互認証なし（物理的に隔離）
- mTLS オプション

**防御策**：
1. VPC isolation
2. Security groups（ファイアウォール）
3. mTLS（オプション）

**設定例**：
```yaml
# Azure Network Security Group
resources:
  - type: Microsoft.Network/networkSecurityGroups
    name: backend-nsg
    properties:
      securityRules:
        - name: allow-api-gateway
          properties:
            protocol: TCP
            sourcePortRange: '*'
            destinationPortRange: '8080'
            sourceAddressPrefix: '10.0.1.0/24'  # API Gateway subnet
            destinationAddressPrefix: '10.0.2.0/24'  # Backend subnet
            access: Allow
            direction: Inbound
```

### TB4: Backend ↔ External Services

**特性**：
- 外部インターネット通信
- API キー / 認証が必要
- 高リスク

**防御策**：
1. HTTPS/TLS 1.2+ 必須
2. API キー管理（Azure Key Vault）
3. Request signing（HMAC）
4. Response validation

**実装例**：
```javascript
// Azure Key Vault から API キー取得
const keyVaultUrl = 'https://mykeyvalut.vault.azure.net/';
const credential = new DefaultAzureCredential();
const client = new SecretClient(keyVaultUrl, credential);
const apiKey = await client.getSecret('ComputerVisionKey');

// API 呼び出し
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey.value}`,
    'Content-Type': 'application/json',
    'X-Request-Id': uuid()  // Request tracking
  },
  body: JSON.stringify({...})
});

// Response validation
if (response.status !== 200) {
  throw new Error(`API error: ${response.status}`);
}
```

### TB5: Backend ↔ Database

**特性**：
- SQL injection リスク
- Credential compromise リスク

**防御策**：
1. Prepared statements（パラメータ化クエリ）
2. HTTPS/TLS 1.2+
3. 最小権限（read-only, append-only accounts）
4. Encryption at rest

**実装例**：
```javascript
// ✅ 正しい：Prepared statement
const stmt = await connection.prepareStatement(
  'SELECT * FROM event_logs WHERE session_id = ? AND created_at > ?'
);
const result = await stmt.execute([sessionId, fromDate]);

// ❌ 危険：文字列連結（SQL injection）
const query = `SELECT * FROM event_logs 
  WHERE session_id = '${sessionId}'`;  // 危険！
```

### TB6: Backend ↔ Storage

**特性**：
- 機密情報（マスク済画像）保存
- 暗号化が重要

**防御策**：
1. Private Endpoint（パブリック インターネット非公開）
2. Encryption at rest（AES-256）
3. Access control（SAS token, RBAC）
4. Immutable storage（上書き禁止）

**設定例**：
```yaml
# Azure Blob Storage
resources:
  - type: Microsoft.Storage/storageAccounts/blobServices/containers
    properties:
      publicAccess: None  # 非公開
      encryption:
        keySource: Microsoft.Storage
        keyvaultproperties:
          keyname: storage-key
          keyvaulturi: https://myvault.vault.azure.net/
      immutableStorageWithVersioning:
        enabled: true  # 上書き禁止
```

## データフロー分析

### フロー 1: 画像アップロード

```
User Browser
    ↓ 
[File selected]
    ↓
WebWorker (Frontend processing)
  - EXIF removal ✓
  - Resize ✓
  - Compression ✓
  - Hashing ✓
  - Original image deleted ✓
    ↓ [HTTPS POST: hash + preprocessed image]
TB2 → API Gateway (Direct Line)
  - CORS check ✓
  - Rate limit ✓
  - File size check ✓
  - MIME type validation ✓
    ↓ [Internal routing]
TB3 → Backend service
  - VPC isolated ✓
  - Signature check ✓
    ↓ [HTTPS to external API]
TB4 → Azure Computer Vision (OCR)
  - API key from Key Vault ✓
  - Request signing ✓
    ↓ [Process & return results]
    ↓ [Private endpoint]
TB5 → Database
  - Append-only insert ✓
  - Encryption at rest ✓
    ↓ [Private endpoint]
TB6 → Storage
  - Encrypted save ✓
  - Immutable flag ✓
```

### フロー 2: スコアリング

```
Backend (message received)
    ↓
LLM + Scoring Model
  - Input validation ✓
  - Prompt injection prevention ✓
    ↓
Decision: AUTO / ASK / ESCALATE
    ↓ [Encrypted response]
Frontend (Display)
  - Output encoding ✓
  - XSS prevention ✓
    ↓
User sees result
```

## TLS/HTTPS 要件

### 必須の通信経路

| 経路 | プロトコル | 証明書 | 最小バージョン |
|------|----------|--------|------------|
| TB2: Frontend → API | HTTPS | 有効な CA 証明書 | TLS 1.2 |
| TB4: Backend → 外部 API | HTTPS | 有効な CA 証明書 | TLS 1.2 |
| TB5: Backend → DB | HTTPS | ルート CA 証明書 | TLS 1.2 |
| TB6: Backend → Storage | HTTPS | Azure 証明書 | TLS 1.2 |

### 実装確認

```bash
# TLS バージョン確認
openssl s_client -connect api.example.com:443 -tls1_2

# 証明書確認
openssl x509 -in cert.pem -noout -dates
```

