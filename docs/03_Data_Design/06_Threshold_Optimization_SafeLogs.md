# 閾値自動最適化のための安全ログ設計（PII非保持）

## 1. 方針
PII文字列・bbox位置・中身をログしなくても、最適化が回せる形にする。

## 2. 必須信号（画像/ブロック単位の集計）
- strong_count_by_category
- weak_count_by_category
- auto_mask_applied（Y/N）
- manual_additional_mask（Y/N）= 見逃し代理
- removed_auto_mask（Y/N）= 過検知代理
- pii_auto_detect_used（Y/N）

## 3. 目的関数（例）
Loss = α * manual_rate + β * removed_rate - γ * auto_applied_rate

## 4. オフライン最適化のための追加ログ（安全）
- score_histogram_by_category（10ビン程度の件数配列）

## 5. カテゴリ別閾値の初期値
email/phone/postal/address/id の strong/weak をカテゴリ別に持つ
