# 信頼境界（Trust Boundaries）

## TB-01: Internet境界
- Browser ↔ Web Hosting：Public（TLS必須）

## TB-02: Botチャネル境界
- Web Hosting / Browser ↔ Direct Line ↔ Copilot Studio：Service-to-Service（TLS）
- Direct Lineトークン期限・発行頻度制限（Web側でも補完）

## TB-03: Data境界
- ログ／KPIストア（Log Analytics / SQL/Dataverse）：管理者限定アクセス

## TB-04: 生成AI固有境界
- Prompt Injection対策：JSON中間層で「事実抽出」と「最終回答」を分離、制約固定、回帰テストで劣化検知

## TB-05: 画像境界
- マスク済画像のみアップロード／保存（原本非保存）
- BlobはPrivate、SASは短期限（Readのみ）、Upload URL（Write）も短期限＆1回限り
