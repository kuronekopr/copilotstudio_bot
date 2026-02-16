# Features and Normalization

## Overview

All features are normalized to the range [0, 1] before being passed to the scoring model. This ensures features with different scales contribute equally and allows for simple weight interpretation.

## Feature Definitions

### 1. OCR Confidence (ocr_confidence)
- **Source**: OCR engine confidence score
- **Range**: [0, 1]
- **Interpretation**:
  - 1.0 = Perfect OCR, complete confidence in text extraction
  - 0.5 = Moderate confidence, some character ambiguity
  - 0.0 = Failed OCR, text unreliable
- **Normalization**: Direct score from OCR engine (assumed already [0, 1])
- **Business Logic**:
  - Low OCR confidence may indicate blurry/damaged error message
  - But doesn't mean error code itself is wrong, just extraction quality
  - Combined with other features to assess overall confidence

### 2. Error Code Match (error_code_match)
- **Source**: Pattern matching against known error code formats
- **Range**: [0, 1]
- **Interpretation**:
  - 1.0 = Extracted text perfectly matches known error code pattern
  - 0.5 = Partial match, some fields present
  - 0.0 = No match to known patterns (likely UNKNOWN)
- **Normalization**: Computed as fraction of required fields present
- **Business Logic**:
  - Indicates extracted text conforms to expected format
  - High values suggest clustering has reliable error code to work with
  - Low values suggest either extraction failed or truly novel error

### 3. Cluster Prior (cluster_prior)
- **Source**: Clustering algorithm confidence / prior probability
- **Range**: [0, 1]
- **Interpretation**:
  - 1.0 = Clustering highly confident in this candidate
  - 0.5 = Moderate confidence, could be other candidates
  - 0.0 = Clustering uncertain, random candidate
- **Normalization**: Direct output from clustering model softmax
- **Business Logic**:
  - Represents probability assigned by upstream clustering
  - Should be weighted heavily if clustering is well-calibrated
  - May need recalibration if clustering over/under-confident

### 4. RAG Similarity (rag_similarity)
- **Source**: Semantic similarity between error message and RAG knowledge base
- **Range**: [0, 1]
- **Interpretation**:
  - 1.0 = Error message very similar to RAG knowledge base entries
  - 0.5 = Some semantic overlap
  - 0.0 = No similar entries in knowledge base (novel error)
- **Normalization**: Cosine similarity between embeddings [0, 1]
- **Business Logic**:
  - High values indicate well-understood error (documented in KB)
  - Low values suggest novel/rare error, increase caution
  - Triggers safety escalation if ≈ 0 (no knowledge base match)

## Missing Data Handling

### Strategy: Conservative Imputation

When a feature is missing:

1. **ocr_confidence**: Default to 0.5 (moderate uncertainty)
   - Reason: Don't assume quality, but don't penalize too harshly
   - Effect: Reduces raw score moderately
   - Review: Flag for investigation

2. **error_code_match**: Default to 0.3 (conservative)
   - Reason: Missing match data suggests pattern matching failed
   - Effect: Moderately reduces score
   - Review: Likely indicates formatting issue

3. **cluster_prior**: Default to uniform distribution (0.5)
   - Reason: If clustering doesn't provide prior, assume equal likelihood
   - Effect: Neutral contribution
   - Review: Check clustering pipeline for errors

4. **rag_similarity**: Default to 0.0 (trigger safety rule)
   - Reason: Missing RAG data = no knowledge base confirmation
   - Effect: Triggers escalation safety rule
   - Review: Check RAG indexing pipeline

### Implementation

```typescript
function handleMissingFeatures(features: Partial<Features01>): Features01 {
  return {
    ocr_confidence: features.ocr_confidence ?? 0.5,
    error_code_match: features.error_code_match ?? 0.3,
    cluster_prior: features.cluster_prior ?? 0.5,
    rag_similarity: features.rag_similarity ?? 0.0
  };
}
```

### Logging

All imputed features should be logged:
```json
{
  "timestamp": "2024-02-16T10:30:00Z",
  "request_id": "req_123",
  "imputed_features": {
    "ocr_confidence": 0.5,
    "reason": "missing"
  },
  "decision": "ESCALATE",
  "note": "Safety rule triggered due to missing feature"
}
```

## Feature Correlation Analysis

### Expected Correlations
- **ocr_confidence ↔ error_code_match**: Moderate positive
  - Better OCR → better pattern matching
- **cluster_prior ↔ rag_similarity**: Weak to moderate positive
  - Well-documented errors cluster better
- **rag_similarity ↔ error_code_match**: Weak positive
  - Known errors in KB usually follow patterns

### Action if Unexpected
- If features show zero correlation: may indicate feature is not useful
- If features show perfect correlation: may indicate redundancy
- Monthly review should flag anomalies

## Bounds Checking

All features must pass validation:
```typescript
function validateFeatures(features: Features01): boolean {
  return (
    features.ocr_confidence >= 0 && features.ocr_confidence <= 1 &&
    features.error_code_match >= 0 && features.error_code_match <= 1 &&
    features.cluster_prior >= 0 && features.cluster_prior <= 1 &&
    features.rag_similarity >= 0 && features.rag_similarity <= 1
  );
}
```

Violations should:
1. Log error with context
2. Clamp values to [0, 1] range
3. Trigger escalation for safety
