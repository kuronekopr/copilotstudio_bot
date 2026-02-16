# 11_Incident_Response_Plan

## インシデント分類と対応フロー

### P1: Critical（重大）- PII 漏洩インシデント

```
【定義】
ユーザーの個人情報（メール、電話、住所等）が
システム外に漏出した or 漏出の疑い

【初期対応】（0-30 分）
1. インシデント確認 & セッション中止
   - 影響を受けたセッションを特定
   - 関連リソースへのアクセスをブロック
   
2. 情報保全 & 証拠採集
   - ログをエクスポート（改竄防止）
   - メモリダンプ採集
   - DB バックアップ作成（修復用）

3. トップマネジメント通知
   - CEO, CTO, Legal にエスカレーション
   - 外部弁護士召喚
   
4. ステーク ホルダーへの通知
   - 顧客（影響者）
   - 監督当局（個人情報保護委員会）
   - マスコミ対応準備

【詳細調査】（30 分～24 時間）
1. 漏洩範囲の特定
   - 何件のセッションが影響か
   - どのような PII が漏出か
   - 漏出したのは誰に（内部/外部）

2. 原因究明
   - ログをもとに経過を追跡
   - システムエラーか、人為的か

3. 二次被害防止
   - 脆弱性を即座に修復
   - 同じ攻撃が繰り返されないか確認
   - システムの再起動/再構築検討

【報告 & 対外対応】（24-72 時間）
1. レポート作成
   - Incident Report (内部)
   - Public Statement (外部)

2. 法的責任対応
   - GDPR 報告（EU）
   - PPC 報告（日本）
   - 被害者への通知

3. フォローアップ
   - 定期的な状況報告
   - 原因分析レポート
   - 対策の実装確認

【予防措置】
- データ最小化（PII テキスト非保存）
- Append-only logging（改竄防止）
- 定期的な Pentest（脆弱性検出）
- バックアップの暗号化（復旧準備）
```

### P2: High（高）- 誤分類インシデント

```
【定義】
PII を含む画像が、マスク確認なしにボットに送信された
または大規模な False Negative（見落とし）が発生

例：本来であれば検出されるべきメールアドレスが見落とされた

【初期対応】（0-1 時間）
1. インシデント確認
   - 影響範囲の特定（セッション数）
   - 見落とされた PII の種別
   
2. 即座の対策
   - モデルの信頼度閾値を一時的に低く設定
     (より多くを AUTO から ASK/ESCALATE へ)
   - 手動確認の頻度を上げる
   
3. ユーザーへの警告（必要に応じて）
   - 「セキュリティ向上のため、システムを一時的に更新しました」

【詳細調査】（1-4 時間）
1. 原因究明
   - False Negative がなぜ発生したか
   - モデルの学習データの問題か
   - 新しい PII パターンへの対応漏れか

2. 影響分析
   - 同じパターンが他のセッションでも発生しているか
   - 過去 N 日間にさかのぼって再検査

3. 修正案検討
   - モデル再学習か
   - ルールベースのパターン追加か
   - 一時的なホットフィックスか本格修正か

【対応実装】（4-24 時間）
1. 修復
   - 選択した対策を実装
   - テスト環境で検証

2. ロールアウト
   - Canary deployment（10% のトラフィック）
   - メトリクス監視
   - 段階的に 100% へ

3. 検証
   - 同じ False Negative が再発しないか
   - 他の性能指標に悪影響がないか

【事後対応】
- Incident Report 作成
- 根本原因分析（RCA）
- 再発防止対策
```

### P3: Medium（中）- RAG or API エラー

```
【定義】
FAQ データベース（RAG）が応答不可
または外部 API（Copilot, Computer Vision）がエラー

結果：ユーザーが ESC​​ALATE される（人間へ引き継ぎ）

【初期対応】（0-15 分）
1. 問題確認
   - どの API か（Copilot, OCR, RAG か）
   - エラー率（何% のリクエストが失敗か）

2. 即座の対策
   - フォールバック実装（例：RAG 無しで LLM のみ）
   - リトライロジック有効化
   - キャッシュから応答（必要に応じて）

3. チーム通知
   - Ops team にアラート
   - 外部 API provider に連絡（必要に応じて）

【調査と復旧】（15 分～4 時間）
1. 原因究明
   - API の status ページ確認
   - ログからエラー詳細を抽出
   - ネットワーク接続確認

2. 復旧
   - API provider が復旧するまで待つ
   - または代替 API に切り替え
   - キャッシュの更新

3. 検証
   - API が正常動作確認
   - エラー率が <1% に下がったか確認

【事後対応】
- Incident log に記録
- 必要に応じて SLA credit を顧客に提供
- キャッシュ戦略の改善検討
```

## インシデント対応体制

### On-Call Engineer ローテーション

```
Week 1: Engineer A
Week 2: Engineer B
Week 3: Engineer C
Week 4: Engineer A

[On-Call 責務]
- 24/7 アラート対応
- 1 時間以内に初期対応
- Escalation path を理解
```

### エスカレーション パス

```
P1（PII 漏洩）
  → On-Call Engineer
  → Engineering Manager
  → VP Engineering
  → CEO
  → External Lawyer

P2（誤分類）
  → On-Call Engineer
  → Engineering Manager
  → VP Engineering

P3（API エラー）
  → On-Call Engineer
  → Engineering Manager
  (or ユーザー対応のみ)
```

## 根本原因分析（RCA）テンプレート

```
【インシデント情報】
タイトル: [短い説明]
発生日時: [YYYY-MM-DD HH:MM UTC]
検出日時: [何分後に気づいたか]
影響範囲: [セッション数、PII 量]
重大度: [P1, P2, P3]

【タイムライン】
HH:MM - Event occurred
HH:MM - Alert triggered
HH:MM - Engineer notified
HH:MM - Initial response
HH:MM - Root cause identified
HH:MM - Fix implemented
HH:MM - Verified resolved

【原因分析】
直接的な原因:
  - ...

根本原因:
  - ...

貢献要因（Contributing Factors）:
  1. ...
  2. ...

【対策（Corrective Actions）】
短期対策（24-48 時間内）:
  - [ ] Task 1
  - [ ] Task 2

中期対策（1-4 週間）:
  - [ ] Task 3
  - [ ] Task 4

長期対策（1-3 ヶ月）:
  - [ ] Process improvement
  - [ ] Monitoring enhancement

【学習と予防】
同じ問題の再発を防ぐため:
  - Monitoring rule を追加
  - Test case を追加
  - ドキュメント更新
  - チーム研修を実施

【承認】
RCA Owner: ___________
Engineering Manager: ___________
Date: ___________
```

## インシデント対応テスト（Disaster Recovery Drill）

### 四半期ごとのドリル

```
毎年 Q2, Q4（3月末、12月末）に
架空のインシデント シナリオで対応を演習

【シナリオ例】
「午前 10:00 に 100 件の PII 漏洩インシデントが
 セキュリティツールに検出されました」

【演習内容】
1. 検出 & 確認（5 分）
2. 初期対応（15 分）
3. 連絡（10 分）
4. 詳細調査（20 分）
5. 報告書作成（20 分）

【評価】
- 対応時間
- コミュニケーション明確性
- 手順順守度
- 改善点抽出
```

