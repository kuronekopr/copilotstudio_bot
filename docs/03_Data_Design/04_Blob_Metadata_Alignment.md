# Blobメタデータ整合（SQL ↔ Blob）

## 1. 原則
- 画像は原則保存しない（メタ情報のみ）
- 例外で保存する場合は「マスク済画像のみ」

## 2. Blob命名（推奨）
container: masked-images
path: {env}/{yyyy}/{mm}/{dd}/{event_id}/img_{index}_masked_v{mask_version}.jpg

## 3. Blob Metadata（キー一覧）
- event_id
- image_index
- mask_version
- pii_auto_detect_used
- threshold_version
- cluster_id
- sha256 (optional)

## 4. SQLとの対応
- dbo.image_asset.masked_blob_uri にBlob URIを保持（例外運用）
- dbo.pii_mask_session.mask_version と一致させる
- dbo.inquiry_event.threshold_version と一致させる
