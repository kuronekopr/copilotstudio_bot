# 保持期間・パーティション・インデックス

## 1. 保存期間
- 6〜12ヶ月

## 2. 推奨：日付軸での運用
- inquiry_event.created_at を主キーに近い検索軸として最適化
- 月次レポート作成が要件

## 3. Azure SQLでの現実解
- テーブルパーティションは運用複雑になりやすいので、まずはインデックス + 月次削除ジョブ（created_at基準）を推奨
- ログを長期保管したい場合はLog Analytics → Export → Data Lake（別途）も選択肢

## 4. 削除ジョブ（例）
- created_at < now - 365days を削除（保持12ヶ月の場合）
- 監査要件が強い場合は「アーカイブ（別ストア）」→「削除」

## 5. インデックス推奨（既にDDL反映）
- created_at
- cluster_id + created_at（クラスタ偏り分析）
- escalated + created_at（運用監視）
