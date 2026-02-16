# Model Overview

## Purpose

The Scoring Model ranks multiple candidate answers (from clustering) and makes automated decisions about whether to resolve, ask for clarification, or escalate to a human expert. It separates the **classification task** (predicting error code) from the **selection task** (choosing the best candidate among multiple options).

## Input Specification

### Candidates List
- **Type**: Array of Candidate objects
- **Required Fields**:
  - `id`: Unique identifier (string)
  - `label`: Predicted error code (string)
  - `optional confidence`: Additional metadata from clustering model

### Features (Normalized)
- **ocr_confidence**: [0, 1] - Quality of OCR text extraction
- **error_code_match**: [0, 1] - How well candidate matches expected error code patterns
- **cluster_prior**: [0, 1] - Prior probability from clustering algorithm
- **rag_similarity**: [0, 1] - Semantic similarity to RAG knowledge base matches

All features must be provided for every scoring request.

## Output Specification

### ScoringResult Object
```typescript
{
  decision: Decision;           // AUTO_RESOLVE | ASK_CLARIFICATION | ESCALATE
  topCandidate: Candidate;      // Best-ranked candidate
  topScore: number;             // Raw score of top candidate
  topProbability: number;       // Softmax probability [0, 1]
  misclassificationProb: number; // 1 - max(P(C_k))
  allScores: {                  // Raw scores for all candidates
    [candidateId]: number;
  };
  allProbabilities: {           // Softmax probabilities for all candidates
    [candidateId]: number;
  };
  safetyFlags: {                // Triggered safety rules
    ragMiss?: boolean;          // rag_similarity ≈ 0
    unknownError?: boolean;     // UNKNOWN error code in top candidate
  };
}
```

## Classification vs Selection Separation

### Classification Task
- **What it does**: Predicts error code from OCR text
- **Who does it**: Clustering module (separate from scoring)
- **Input**: OCR text string
- **Output**: One or more candidate error codes

### Selection Task
- **What it does**: Ranks candidates and decides confidence level
- **Who does it**: Scoring model (this module)
- **Input**: Multiple candidates + features
- **Output**: Decision + ranked candidates

This separation allows:
1. Independent iteration on clustering algorithm
2. Consistent scoring across different clustering outputs
3. Clear audit trail of decision-making

## Positioning in System

```
OCR Text
    ↓
[Clustering Module] → Multiple Candidate Errors
    ↓
[Scoring Model] → Decision (AUTO/ASK/ESCALATE)
    ↓
[Decision Executor] → Action (resolve, clarify, escalate)
```

## Three-Level Decision Framework

### AUTO_RESOLVE
- **Condition**: High confidence in best candidate
- **Threshold**: misclassificationProb < threshold_auto
- **Action**: Automatically select top candidate and mark as resolved
- **Audit**: Logged for performance monitoring

### ASK_CLARIFICATION
- **Condition**: Medium confidence
- **Threshold**: threshold_auto ≤ misclassificationProb < threshold_escalate
- **Action**: Present top N candidates to user for confirmation
- **Audit**: Logged with user selection for model training

### ESCALATE
- **Condition**: Low confidence OR safety rule triggered
- **Threshold**: misclassificationProb ≥ threshold_escalate OR safety rule
- **Action**: Send to human expert
- **Audit**: Logged with expert resolution for model improvement

## Safety Rules

Safety rules can override the confidence-based decision:

1. **RAG Miss Rule**: If `rag_similarity ≈ 0` (< 0.1), escalate
   - Indicates no relevant knowledge base matches
   - Likely indicates completely novel error scenario
   - Requires expert judgment

2. **Unknown Error Rule**: If top candidate has label = 'UNKNOWN', escalate
   - Indicates clustering could not match error pattern
   - Suggests ambiguous or malformed error code
   - Requires expert classification

These rules ensure system doesn't over-rely on low-signal features.

## Feature Dependency

The scoring function is intentionally simple and linear to ensure:
- **Interpretability**: Stakeholders understand why decisions are made
- **Auditability**: Changes to weights are traceable and approvable
- **Maintainability**: Feature additions don't require retraining entire model
- **Stability**: Robust to small feature value variations
