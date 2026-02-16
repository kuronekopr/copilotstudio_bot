# PIIスコアリング

## 1. カテゴリ別閾値

email:
  strong: 0.90
  weak:   0.75

phone:
  strong: 0.90
  weak:   0.75

postal:
  strong: 0.85
  weak:   0.70

address:
  strong: 0.80
  weak:   0.65

## 2. 判定

if confidence >= strong → auto mask
if weak <= confidence < strong → UI要確認
else → ignore

## 3. 誤認識確率

misclassification_probability = 1 - max(probabilities)
