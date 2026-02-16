# /02_API_Contracts

フロント／バック／AI層のインターフェース契約（API＋データ契約）を定義する。

設計方針：
- APIは「契約」であり、実装が変わっても破ってはいけない。
- PII関連は必須（pii_auto_detect_used 等）。
- Event Sourceは必須（1問い合わせ=1イベント、構造化JSON）。

含有：
- OpenAPI 3.0 定義（openapi.yaml）
- JSON Schema（schemas/）
- 実データ例（examples/）
