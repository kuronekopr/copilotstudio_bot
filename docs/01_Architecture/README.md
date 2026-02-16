# /01_Architecture

本フォルダは、AI画像対応チャットボットのアーキテクチャ（物理構成・DFD・信頼境界・主要データフロー）をまとめたもの。

前提：
- 実装案：B案（Direct Line + カスタムWeb Chat）
- 匿名利用・画像最大5枚
- Copilot Studio（Dev/Stg/Prod環境分離）
- Event Source（ログ必須）
- 画像はPIIマスク後のみ保存（原本は保存しない）
- 閾値自動最適化 / 誤認識確率モデル（別フォルダ仕様に従う）

構成：
- 01_Physical_Architecture.md
- 02_Deployment_and_Environments.md
- 03_DFD_Level0_Level1.md
- 04_Trust_Boundaries.md
- 05_Component_Responsibilities.md
- 06_Network_Security_Profile.md
- 07_NFR_Summary.md
