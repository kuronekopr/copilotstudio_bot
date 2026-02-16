# 06_Identity_and_Access_Control

## 認証・認可設計

### 認証方式：匿名 + 短期トークン

```
┌─────────────────────────────────────────┐
│         ユーザー（匿名）                   │
├─────────────────────────────────────────┤
│ 1. チャットボタンクリック                │
│    ↓                                     │
│ 2. Backend: 短期トークン生成             │
│    {                                     │
│      jti: uuid(),                       │
│      iat: now(),                        │
│      exp: now() + 15min,                │
│      sub: session_id,                   │
│      scope: 'chat'                      │
│    }                                     │
│    署名: RS256（秘密鍵で署名）           │
│    ↓                                     │
│ 3. Frontend: トークン保管（sessionStorage）
│    ↓                                     │
│ 4. API 呼び出し時：Authorization header  │
│    Authorization: Bearer <token>        │
└─────────────────────────────────────────┘
```

### JWT ペイロード例
```json
{
  "jti": "a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p",
  "sub": "sess-xxxxx",
  "scope": "chat",
  "iat": 1676464200,
  "exp": 1676465100,
  "iss": "https://api.example.com",
  "aud": "https://example.com"
}
```

### トークン有効期限
```
Access Token: 15 分
Refresh Token: 廃止（セキュリティのため）
セッション全体: 24 時間

→ 24 時間後は新規セッション開始
```

### 署名方式: RS256（非対称署名）
```javascript
const jwt = require('jsonwebtoken');

// トークン生成（バックエンド）
const token = jwt.sign(
  {
    jti: uuid(),
    sub: sessionId,
    scope: 'chat'
  },
  fs.readFileSync('private_key.pem'),
  {
    algorithm: 'RS256',
    expiresIn: '15min',
    issuer: 'https://api.example.com'
  }
);

// トークン検証（バックエンド）
const decoded = jwt.verify(
  token,
  fs.readFileSync('public_key.pem'),
  {
    algorithms: ['RS256'],
    issuer: 'https://api.example.com'
  }
);
```

---

## Azure RBAC（ロールベースアクセス制御）

### ロール定義

#### 1. User Role（チャット利用者）
```
権限：
- チャット利用（read + write）
- 自分のセッション情報表示
- FAQ 閲覧

制限：
- 他ユーザーのセッション非表示
- 管理機能へのアクセス禁止
- ログ非閲覧

実装：
{
  "roleName": "ChatUser",
  "permissions": [
    "chat/send:read,write",
    "chat/session/own:read",
    "faq/read"
  ],
  "deniedActions": [
    "events/*",
    "admin/*",
    "threshold/*"
  ]
}
```

#### 2. Operator Role（運用スタッフ）
```
権限：
- ログ閲覧（週単位）
- メトリクス確認（ダッシュボード）
- インシデント対応

制限：
- 閾値変更不可（提案のみ）
- データ削除不可
- ユーザー操作操作不可

実装：
{
  "roleName": "ChatOperator",
  "permissions": [
    "events/read",
    "metrics/read",
    "incident/read,write",
    "logs/export:read"
  ],
  "deniedActions": [
    "threshold/*",
    "delete/*",
    "admin/*"
  ]
}
```

#### 3. Admin Role（管理者）
```
権限：
- すべてのリソース操作
- 閾値変更（2 名承認）
- モデル更新
- 緊急対応

制限：
- ユーザーデータ削除（GDPR 準拠）
- ログ改竄禁止（append-only）

実装：
{
  "roleName": "ChatAdmin",
  "permissions": [
    "*:read,write"
  ],
  "deniedActions": [
    "event_logs/update",
    "event_logs/delete",
    "user_data/hard_delete"  // GDPR soft delete のみ
  ]
}
```

### Azure ロール割り当て

```powershell
# Operator ロールを Jane Smith に割り当て
New-AzRoleAssignment `
  -ObjectId $janeid `
  -RoleDefinitionName "ChatOperator" `
  -Scope "/subscriptions/sub-id/resourcegroups/rg-name"

# Admin ロール（サブスクリプション全体）
New-AzRoleAssignment `
  -ObjectId $adminid `
  -RoleDefinitionName "ChatAdmin" `
  -Scope "/subscriptions/sub-id"
```

---

## セッションライフサイクル

```
1. セッション作成（チャットボタンクリック）
   ↓
   - session_id: uuid()
   - created_at: now()
   - expires_at: now() + 24h
   - status: ACTIVE
   - ip_country: GeoIP lookup
   - user_agent: browser info

2. セッション利用（チャット送受信）
   ↓
   - token 検証（毎回）
   - last_activity_at 更新
   - rate limit チェック

3. セッション終了
   ↓
   a. ユーザー明示的クローズ（チャット×ボタン）
      → status: CLOSED, closed_by: USER
   
   b. 自動有効期限切れ（24 時間）
      → status: EXPIRED, closed_by: SYSTEM
   
   c. トークン有効期限切れ（15 分）
      → 新しいトークンを発行（同一 session_id）

4. セッション削除（GDPR 削除要求）
   ↓
   - 関連ログを削除（soft delete）
   - session_id を削除
   - マスク済画像を削除
```

---

## API 認可の実装例

```javascript
// Middleware: トークン検証
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    const decoded = jwt.verify(token, PUBLIC_KEY);
    req.sessionId = decoded.sub;
    req.userRole = 'user';  // API は常に user role
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// Middleware: 権限チェック
function authorize(requiredRole) {
  return (req, res, next) => {
    const roleHierarchy = { user: 1, operator: 2, admin: 3 };
    
    if (roleHierarchy[req.userRole] < roleHierarchy[requiredRole]) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// ルート例
app.post('/api/chat/send',
  authenticateToken,  // トークン検証
  (req, res) => {
    // user role で OK
    const { text, images } = req.body;
    // 処理...
  }
);

app.post('/api/admin/threshold/update',
  authenticateToken,
  authorize('admin'),  // admin role のみ
  (req, res) => {
    const { newThreshold } = req.body;
    // 管理者のみ実行可能
  }
);
```

---

## セッションセキュリティ対策

### Session Fixation 攻撃防止
```javascript
// 認証後に新しい session_id を生成
req.session.regenerate((err) => {
  if (err) return next(err);
  
  // 古い session_id は無効化
  req.session.userId = decoded.sub;
  res.json({ token: newToken });
});
```

### Cross-Site Request Forgery (CSRF) 防止
```javascript
// CSRF トークン（フォーム送信用）
app.use(csrf());

// ミドルウェア：CSRF トークンチェック
app.post('/api/chat/send',
  csrf(),
  authenticateToken,
  (req, res) => {
    // CSRF トークン自動検証済み
  }
);
```

### Session Timeout
```javascript
// セッション最後活動から 30 分で自動ログアウト
const SESSION_TIMEOUT = 30 * 60 * 1000;

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: SESSION_TIMEOUT,
    httpOnly: true,  // JavaScript からアクセス不可
    secure: true,    // HTTPS のみ
    sameSite: 'Strict'  // CSRF 対策
  }
}));
```

### 地理的異常検出
```javascript
async function checkGeographicAnomaly(sessionId, currentIp) {
  const session = await db.getSession(sessionId);
  const lastIp = session.lastIp;
  
  if (!lastIp) return;  // 初回は OK
  
  const lastLocation = await geoipLookup(lastIp);
  const currentLocation = await geoipLookup(currentIp);
  
  // 物理的に不可能な移動距離（例：日本 → USA in 1 分）
  const distance = calculateDistance(lastLocation, currentLocation);
  const timeElapsed = Date.now() - session.lastActivityAt;
  const maxSpeed = 900;  // km/h (飛行機速度)
  
  if (distance / (timeElapsed / 3600000) > maxSpeed) {
    // 疑わしい移動 → チャレンジまたはセッション無効化
    await escalateSecurityEvent(sessionId);
  }
}
```

