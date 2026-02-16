# Scoring Model

## Overview

This directory contains the Scoring Model, a critical component for ranking and selecting the best candidate answer from multiple clustering options. The model combines multiple normalized features using a weighted linear combination, applies softmax normalization, and makes decisions based on misclassification probability thresholds.

## Key Features

### 1. Weighted Scoring
- Combines 4 normalized features (0..1 range):
  - `ocr_confidence`: Quality of OCR text extraction
  - `error_code_match`: Agreement with error code expectations
  - `cluster_prior`: Prior probability from clustering model
  - `rag_similarity`: Semantic similarity to RAG document matches
- Linear scoring formula with learnable weights and bias terms per candidate

### 2. Softmax Normalization
- Converts raw scores to probability distribution across candidates
- Uses max-trick for numerical stability
- Ensures probabilities sum to 1.0

### 3. Misclassification Probability
- Computed as: `p_mis = 1 - max(P(C_k))`
- Represents confidence in selecting the best candidate
- Used to drive decision-making

### 4. Three-Level Decisions
- **AUTO_RESOLVE**: High confidence, automatically select best candidate
- **ASK_CLARIFICATION**: Medium confidence, ask user for clarification
- **ESCALATE**: Low confidence or safety rule triggered, escalate to expert

### 5. Safety Rules
- RAG semantic miss (rag_similarity ≈ 0) triggers escalation
- UNKNOWN error code triggers escalation for certain candidates

### 6. Threshold Optimization
- Monthly batch retraining using ROC curves and Youden Index
- Governance: data collection, analysis, approval, rollback capability
- Maintains audit log of all threshold changes

### 7. Statistical Weight Updates
- Online and offline weight estimation using logistic regression
- Platt scaling for post-hoc probability calibration
- Temperature scaling for model confidence adjustment

### 8. Model Versioning
- Semantic versioning: MAJOR.MINOR.PATCH
- Change types: WEIGHTS_UPDATE, THRESHOLD_CHANGE, FEATURE_ADDITION, FEATURE_REMOVAL
- Complete audit trail with timestamps and approval records

## Directory Structure

```
05_Scoring_Model/
├── README.md                          (This file)
├── 01_Model_Overview.md               (Input/output specification)
├── 02_Features_and_Normalization.md   (Feature definitions)
├── 03_Scoring_Formula_and_Softmax.md  (Core math)
├── 04_Misclassification_Probability_and_Decision.md
├── 05_Threshold_Optimization_ROC_Youden.md
├── 06_Statistical_Weighting_Model.md
├── 07_Model_Versioning_and_Governance.md
├── code/
│   ├── types.ts                       (TypeScript types)
│   ├── scoring.ts                     (Implementation)
│   └── threshold_optimizer.py         (Python optimization)
│   └── calibration.py                 (Python calibration)
└── tests/
    ├── scoring.test.ts                (Jest tests)
    └── optimizer.test.py              (pytest tests)
```

## Quick Start

### TypeScript (Node.js)
```typescript
import { scoreClusters } from './code/scoring';

const features = {
  ocr_confidence: 0.95,
  error_code_match: 0.8,
  cluster_prior: 0.7,
  rag_similarity: 0.85
};

const candidates = [
  { id: 'c1', label: 'error_001' },
  { id: 'c2', label: 'error_002' }
];

const result = scoreClusters(candidates, features);
// Returns: { decision, topCandidate, scores, probabilities, misclassificationProb }
```

### Python (Threshold Optimization)
```python
from code.threshold_optimizer import optimize_thresholds

thresholds = optimize_thresholds(
    misclass_probs=all_probs,
    labels=all_labels,
    method='youden'
)
# Returns: ThresholdResult with optimal thresholds
```

## Testing

```bash
# TypeScript tests
npm test tests/scoring.test.ts

# Python tests
pytest tests/optimizer.test.py -v
```

## Governance & Maintenance

- **Monthly Threshold Review**: Analyze performance metrics and recompute optimal thresholds
- **Weight Updates**: Submit for approval before deployment
- **Version Control**: Each change increments version and creates audit entry
- **Rollback Capability**: All versions must be deployable with known performance metrics

See `07_Model_Versioning_and_Governance.md` for detailed procedures.
