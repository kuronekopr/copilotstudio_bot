# 07_Network_and_Infrastructure_Security

## ネットワークセキュリティ

### HTTPS / TLS 1.2+（転送中暗号化）

```
すべての通信は HTTPS/TLS 1.2 以上で暗号化必須
```

**設定例（Node.js）**：
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert'),
  minVersion: 'TLSv1.2',
  ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384'
};

https.createServer(options, app).listen(443);
```

**設定例（Azure App Service）**：
```powershell
# TLS 最小バージョン設定
Set-AzAppServicePlan -Name myAppServicePlan -ResourceGroupName myResourceGroup `
  -Tier Standard -TlsMinimumVersion 1.2
```

---

## WAF（Web Application Firewall）

### Azure WAF ルール

```yaml
# 攻撃パターン検出
rules:
  - name: block_sql_injection
    description: SQL Injection patterns
    action: Block
    priority: 1
    ruleGroupName: OWASP_CRS
    rules:
      - SQLi.4.200
      - SQLi.4.201

  - name: block_xss
    description: XSS patterns
    action: Block
    priority: 2
    ruleGroupName: OWASP_CRS
    rules:
      - XSS.1.400
      - XSS.1.401

  - name: rate_limit
    description: Rate limiting
    action: Block
    priority: 3
    rateLimit:
      duration: 5m
      requests: 100  # IP あたり 5 分間に 100 リクエスト

  - name: block_svg
    description: SVG MIME type
    action: Block
    priority: 4
    condition:
      content_type: 'image/svg\+xml'
```

---

## VPC / Private Endpoint

### Virtual Private Cloud 構成

```
┌─────────────────────────────────────────────────┐
│         Azure VPC (10.0.0.0/16)                 │
│                                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ Frontend Subnet (10.0.1.0/24)           │   │
│  │  - App Service (ポップアップ静的ホスト)  │   │
│  └─────────────────────────────────────────┘   │
│                        ↓                         │
│  ┌─────────────────────────────────────────┐   │
│  │ Backend Subnet (10.0.2.0/24)            │   │
│  │  - API Gateway                          │   │
│  │  - Bot Framework                        │   │
│  └─────────────────────────────────────────┘   │
│                        ↓                         │
│  ┌─────────────────────────────────────────┐   │
│  │ Data Subnet (10.0.3.0/24)               │   │
│  │  - Azure SQL Database                   │   │
│  │  - Azure Blob Storage (Private Link)    │   │
│  └─────────────────────────────────────────┘   │
│                                                   │
└─────────────────────────────────────────────────┘
     ↕ (APIを通じてのみ、直接アクセス不可)
   インターネット
```

### Network Security Groups (NSG)

```yaml
# Frontend NSG
inbound_rules:
  - name: allow-https-world
    description: Allow HTTPS from internet
    protocol: TCP
    source_port_range: '*'
    destination_port_range: 443
    source_address_prefix: 'Internet'
    destination_address_prefix: '10.0.1.0/24'
    access: Allow
    priority: 100

# Backend NSG
inbound_rules:
  - name: allow-api-from-frontend
    description: Allow API from frontend
    protocol: TCP
    source_port_range: '*'
    destination_port_range: 8080
    source_address_prefix: '10.0.1.0/24'
    destination_address_prefix: '10.0.2.0/24'
    access: Allow
    priority: 100

  - name: deny-internet
    description: Deny direct internet access
    protocol: '*'
    source_port_range: '*'
    destination_port_range: '*'
    source_address_prefix: 'Internet'
    destination_address_prefix: '10.0.2.0/24'
    access: Deny
    priority: 200

# Data NSG
inbound_rules:
  - name: allow-sql-from-backend
    description: Allow SQL from backend
    protocol: TCP
    source_port_range: '*'
    destination_port_range: 1433
    source_address_prefix: '10.0.2.0/24'
    destination_address_prefix: '10.0.3.0/24'
    access: Allow
    priority: 100

  - name: deny-all
    description: Deny all other access
    protocol: '*'
    source_port_range: '*'
    destination_port_range: '*'
    source_address_prefix: '*'
    destination_address_prefix: '10.0.3.0/24'
    access: Deny
    priority: 200
```

---

## データベース暗号化

### Transparent Data Encryption (TDE)

```sql
-- Azure SQL Database での暗号化（自動有効）
ALTER DATABASE [myDatabase]
SET ENCRYPTION ON;

-- 暗号化キーの確認
SELECT name, key_store_provider_name 
FROM sys.dm_database_encryption_keys;
```

### Encryption at Rest（保存時暗号化）

```yaml
# Azure SQL Database
encryption_at_rest:
  enabled: true
  key_type: AES-256
  managed_by: Microsoft  # または Customer-managed keys

# Azure Blob Storage
encryption_at_rest:
  enabled: true
  encryption_type: AES-256
  key_vault: https://myvault.vault.azure.net
  key_name: storage-encryption-key
```

---

## ストレージセキュリティ

### Azure Blob Storage - Private Endpoint

```powershell
# Private Endpoint を作成
$pe = New-AzPrivateEndpoint `
  -ResourceGroupName "myResourceGroup" `
  -Name "pe-blob" `
  -ServiceConnection $serviceConnection `
  -Subnet $subnet `
  -PrivateIpAddress "10.0.3.10"

# Blob へのパブリックアクセスを無効化
Set-AzStorageAccount `
  -ResourceGroupName "myResourceGroup" `
  -Name "mystorageaccount" `
  -AllowBlobPublicAccess $false
```

### SAS (Shared Access Signature) トークン

```javascript
const azure = require('@azure/storage-blob');
const { generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = azure;

// 読取専用 SAS トークン（1 時間有効）
function generateReadOnlySAS(containerName, blobName) {
  const sharedKeyCredential = new StorageSharedKeyCredential(
    accountName,
    accountKey
  );
  
  const sasUrl = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'),  // read only
      expiresOn: new Date(new Date().valueOf() + 3600 * 1000)  // 1h
    },
    sharedKeyCredential
  ).toString();
  
  return `${blobClient.url}?${sasUrl}`;
}
```

---

## DDoS Protection

### Azure DDoS Protection Standard

```powershell
# DDoS Protection Standard を有効化
$ddosProtectionPlan = New-AzDdosProtectionPlan `
  -ResourceGroupName "myResourceGroup" `
  -Name "myDdosProtectionPlan" `
  -Location "japaneast"

# VNet に関連付け
$virtualNetwork = Get-AzVirtualNetwork `
  -ResourceGroupName "myResourceGroup" `
  -Name "myVNet"

Set-AzVirtualNetwork `
  -VirtualNetwork $virtualNetwork `
  -DdosProtectionPlan $ddosProtectionPlan `
  -DdosProtectionEnabled $true
```

### Rate Limiting（API レベル）

```javascript
const rateLimit = require('express-rate-limit');

// IP 単位のレート制限
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分
  max: 100,  // 最大 100 リクエスト
  message: 'Too many requests from this IP'
});

// セッション単位のレート制限（より厳しい）
const sessionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 分
  max: 10,  // 最大 10 リクエスト
  keyGenerator: (req) => req.sessionId,
  message: 'Too many requests from this session'
});

app.use('/api/', limiter);
app.post('/api/chat/send', sessionLimiter, handleChatSend);
```

---

## モニタリング & ロギング

### Azure Monitor

```yaml
# メトリクス収集
metrics:
  - HTTP requests (status code 分布)
  - API latency (P50, P95)
  - Error rates
  - Database connection pool
  - Storage operations

# ログ収集
logs:
  - Application logs (app.log)
  - Access logs (access.log)
  - Error logs (error.log)
  - Security events (auth, api calls)

# Alert ルール
alerts:
  - name: High Error Rate
    condition: error_rate > 5%
    severity: critical
    action: page on-call engineer

  - name: P95 Latency
    condition: p95_latency > 20s
    severity: warning
    action: notify ops team

  - name: DDoS Attack Detected
    condition: request_rate > 100000 req/s
    severity: critical
    action: trigger incident response
```

---

## パッチ & 脆弱性管理

### Automated Updates

```yaml
# Azure SQL Database - 自動パッチ
maintenance_window:
  day: Sunday
  start_time: "02:00"
  duration: 2 hours

# Azure VMs - 自動パッチ
update_management:
  schedule: "Every Sunday 02:00 UTC"
  update_classification:
    - Critical
    - Security
```

### 脆弱性スキャン

```bash
# Microsoft Defender for Cloud
az security assessment list \
  --resource-group myResourceGroup

# CVE データベース確認
# https://cve.mitre.org
# https://nvd.nist.gov
```

