# モデル・閾値運用

## 月次サイクル
1. ラベル生成（自動解決成功/失敗）
2. ROC分析
3. Youden最適値算出
4. 承認会議
5. threshold_version更新

## 緊急対応
- 誤自動解決急増時 → θ_autoを引き下げ → AUTO_RESOLVE抑制

## バージョン管理
- model_version
- threshold_version
- mask_version
は必ずイベントログに保存
