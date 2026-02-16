# 08_Application_Security_Controls

## 入力検証（Input Validation）

### SVG 拒否（SVG Rejection）

```javascript
// 危険：SVG は XML エンティティ攻撃やスクリプト実行が可能
// 例：<svg onload="alert('XSS')">

async function validateImageFile(file) {
  // 1. 拡張子チェック
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!validExtensions.includes(ext)) {
    throw new Error('Invalid file extension');
  }
  
  // 2. MIME タイプチェック
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validMimeTypes.includes(file.type)) {
    throw new Error('Invalid MIME type');
  }
  
  // 3. ファイルシグネチャ確認（Magic bytes）
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // JPEG シグネチャ: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'jpeg';  // OK
  }
  
  // PNG シグネチャ: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && 
      bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'png';  // OK
  }
  
  // SVG は XML なので開始が < ; SVG は拒否
  if (bytes[0] === 0x3C) {  // '<' 文字
    throw new Error('SVG format is not allowed');
  }
  
  throw new Error('Unrecognized file format');
}
```

### ファイルサイズ制限

```javascript
const MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5MB
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;  // 25MB (5 files)

if (file.size > MAX_FILE_SIZE) {
  throw new Error(`File too large: ${file.size} > ${MAX_FILE_SIZE}`);
}

const totalSize = files.reduce((sum, f) => sum + f.size, 0);
if (totalSize > MAX_TOTAL_SIZE) {
  throw new Error(`Total size exceeds limit: ${totalSize} > ${MAX_TOTAL_SIZE}`);
}
```

### EXIF 削除（EXIF Removal）

```javascript
const piexifjs = require('piexifjs');
const sharp = require('sharp');

async function removeExif(imageBuffer) {
  // 方法 1: piexifjs で EXIF 削除
  const data = piexifjs.load(imageBuffer);
  
  // すべてのメタデータを削除
  Object.keys(data).forEach(key => {
    if (key !== 'Exif') delete data[key];
  });
  delete data['Exif'];
  
  // EXIF なしで再エンコード
  const exifbytes = piexifjs.dump(data);
  const result = piexifjs.insert(exifbytes, imageBuffer);
  
  // または
  // 方法 2: Sharp で EXIF 削除（推奨）
  const processed = await sharp(imageBuffer)
    .withMetadata(false)  // すべてのメタデータ削除
    .toBuffer();
  
  return processed;
}
```

### 画像リサイズ（Image Resizing）

```javascript
async function resizeImage(imageBuffer) {
  const MAX_WIDTH = 1600;
  const MAX_HEIGHT = 1600;
  
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  
  // アスペクト比を保ったリサイズ
  const resized = await image
    .resize(MAX_WIDTH, MAX_HEIGHT, {
      fit: 'inside',  // アスペクト比を保つ
      withoutEnlargement: true  // 拡大しない
    })
    .toBuffer();
  
  return resized;
}
```

## 出力エンコーディング（Output Encoding）

### XSS（クロスサイトスクリプティング）対策

```javascript
// 危険：ユーザー入力を直接 HTML に埋め込む
// response.html = `<div>${userInput}</div>`;  // ❌ XSS 脆弱性！

// 安全：エスケープして埋め込む
const DOMPurify = require('isomorphic-dompurify');

// 1. HTMLエスケープ
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;  // textContent = 自動エスケープ
  return div.innerHTML;
}

// 2. ユーザー入力のサニタイズ
function sanitizeUserInput(input) {
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'a'],  // 許可するタグのみ
    ALLOWED_ATTR: ['href'],
    KEEP_CONTENT: true
  });
  return sanitized;
}

// 3. React での安全な埋め込み
return <div>{userInput}</div>;  // React は自動エスケープ

// 4. JSON レスポンス
res.json({
  message: sanitizedText  // JSON自動エスケープ
});
```

### Prompt Injection（LLM 向けXSS）対策

```javascript
// 危険：ユーザー入力をそのまま LLM プロンプトに含める
// const prompt = `Answer this: ${userInput}`;  // ❌ Prompt injection 脆弱性

// 安全：入力を厳密に検証・制限
function createSafePrompt(userQuestion, images, detectedPii) {
  // 1. 入力の長さ制限
  if (userQuestion.length > 500) {
    throw new Error('Question too long');
  }
  
  // 2. インジェクションパターンの検出
  const injectionPatterns = [
    /ignore[\s\n]+previous[\s\n]+instruction/i,
    /forget[\s\n]+about/i,
    /forget[\s\n]+instructions/i,
    /jailbreak/i,
    /system[\s\n]+prompt/i
  ];
  
  for (const pattern of injectionPatterns) {
    if (pattern.test(userQuestion)) {
      throw new Error('Suspicious input detected');
    }
  }
  
  // 3. LLM プロンプトを構造化
  const prompt = {
    role: 'system',
    content: `You are a helpful customer support bot.
You will answer customer questions based on:
1. The provided FAQ database
2. The uploaded images
3. Company policies

Constraints:
- Never reveal internal system information
- Always mask PII in your responses
- If unsure, escalate to human support`
  };
  
  const userMsg = {
    role: 'user',
    content: [
      {
        type: 'text',
        text: `Customer question: ${escapeHtml(userQuestion)}`  // エスケープ
      },
      ...images.map((img, i) => ({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${img}`,
          detail: 'low'  // 低解像度で誤検出防止
        }
      }))
    ]
  };
  
  return [prompt, userMsg];
}
```

## JSON Schema 検証（Request/Response Validation）

```javascript
const Ajv = require('ajv');
const ajv = new Ajv();

// リクエストスキーマ
const chatRequestSchema = {
  type: 'object',
  properties: {
    text: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    images: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },  // SHA-256
          size: { type: 'number', maximum: 5242880 },
          format: { enum: ['jpeg', 'png', 'webp'] }
        },
        required: ['hash', 'size', 'format']
      }
    },
    session_id: {
      type: 'string',
      pattern: '^sess-[a-f0-9]{32}$'
    }
  },
  required: ['text', 'session_id'],
  additionalProperties: false  // 未定義のプロパティを禁止
};

// Middleware：リクエスト検証
const validateRequest = (schema) => {
  const validate = ajv.compile(schema);
  return (req, res, next) => {
    if (!validate(req.body)) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validate.errors
      });
    }
    next();
  };
};

app.post('/api/chat/send',
  validateRequest(chatRequestSchema),
  handleChatSend
);
```

## SQL インジェクション対策（SQL Injection Prevention）

```javascript
// ❌ 危険：文字列連結
// const query = `SELECT * FROM users WHERE id = '${userId}'`;

// ✅ 安全：Prepared Statements
const mysql = require('mysql2/promise');

const connection = await mysql.createConnection({...});

// パラメータ化クエリ
const [rows] = await connection.execute(
  'SELECT * FROM event_logs WHERE session_id = ? AND created_at > ?',
  [sessionId, fromDate]  // パラメータは自動エスケープ
);

// OR

const sql = require('mssql');

const request = new sql.Request();
request.input('sessionId', sql.VarChar, sessionId);
request.input('fromDate', sql.DateTime, fromDate);

const result = await request.query(
  'SELECT * FROM event_logs WHERE session_id = @sessionId AND created_at > @fromDate'
);
```

## CSRF（クロスサイトリクエストフォージェリ）対策

```javascript
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const session = require('express-session');

app.use(cookieParser());
app.use(session({...}));

// CSRF ミドルウェア
const csrfProtection = csrf({ cookie: false });

// フォーム表示時：CSRF トークン発行
app.get('/chat', csrfProtection, (req, res) => {
  res.render('chat', { csrfToken: req.csrfToken() });
});

// フォーム送信時：CSRF トークン検証
app.post('/api/chat/send', csrfProtection, (req, res) => {
  // トークンが自動検証される
  handleChatSend(req, res);
});

// HTML フォーム
<form method="post" action="/api/chat/send">
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  <textarea name="question"></textarea>
  <button type="submit">送信</button>
</form>
```

