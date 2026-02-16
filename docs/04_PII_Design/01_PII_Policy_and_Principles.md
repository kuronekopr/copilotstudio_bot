# PIIポリシー

## 1. データ最小化
- 文字列は保存しない
- bbox位置も保存しない（統計のみ）
- strong/weak件数のみ保持

## 2. 自動検出前提
- pii_auto_detect_used = true を原則
- 例外はログに理由記録

## 3. 解除禁止
- UIで自動検出マスクは原則解除不可
- 解除は removed_auto_mask として記録

## 4. 監査可能性
- mask_version
- threshold_version
- model_version
を必須保存
