# Scoring Formula and Softmax

## Weighted Linear Scoring

### Formula

For each candidate k, compute the raw score:

```
S_k = w1 * ocr_confidence + w2 * error_code_match + w3 * cluster_prior + w4 * rag_similarity + b_k
```

Where:
- **w1, w2, w3, w4** are feature weights (learnable, shared across all candidates)
- **b_k** is a bias term specific to each candidate k (also learnable)
- **S_k** is the raw score (unbounded, can be negative or > 1)

### Initial Weight Values

Default weights (Version 1.0.0):
```
w1 (ocr_confidence)   = 0.30
w2 (error_code_match) = 0.30
w3 (cluster_prior)    = 0.20
w4 (rag_similarity)   = 0.20
```

Rationale:
- ocr_confidence: High weight because extraction quality is fundamental
- error_code_match: High weight because pattern matching indicates well-formed error
- cluster_prior: Moderate weight because clustering is good but not perfect
- rag_similarity: Moderate weight because not all errors are documented in KB

### Bias Terms

Each candidate has a candidate-specific bias (b_k):

```json
{
  "default_bias": 0.0,
  "per_candidate_biases": {
    "error_001": 0.05,
    "error_002": -0.02,
    "UNKNOWN": -0.5
  }
}
```

Rationale:
- UNKNOWN error gets negative bias (discourage selection)
- Frequent/reliable errors get small positive bias
- Default is neutral

## Softmax Normalization

### Purpose

Convert raw scores to probabilities:
- Scores S_k ∈ (-∞, +∞) → Probabilities P_k ∈ [0, 1]
- Ensures Σ P_k = 1.0 across all candidates
- Creates interpretable confidence measure

### Formula

Standard softmax:
```
P_k = exp(S_k) / Σ_j exp(S_j)
```

### Numerical Stability: Max Trick

To prevent overflow/underflow:

```
P_k = exp(S_k - max(S)) / Σ_j exp(S_j - max(S))
```

Steps:
1. Compute max_score = max(S_k for all k)
2. For each candidate: adjusted = S_k - max_score
3. Compute exp(adjusted) for each
4. Sum all exponentials
5. Divide each exp(adjusted) by sum

### Example Implementation

```typescript
function softmax(scores: number[]): number[] {
  const maxScore = Math.max(...scores);
  const exponentials = scores.map(s => Math.exp(s - maxScore));
  const sum = exponentials.reduce((a, b) => a + b, 0);
  return exponentials.map(e => e / sum);
}
```

### Example Calculation

Raw scores: [0.5, 1.2, 0.1]
Max score: 1.2

Adjusted: [0.5 - 1.2, 1.2 - 1.2, 0.1 - 1.2] = [-0.7, 0, -1.1]

Exponentials:
- exp(-0.7) ≈ 0.497
- exp(0) = 1.0
- exp(-1.1) ≈ 0.333

Sum ≈ 1.830

Probabilities:
- P_0 ≈ 0.497 / 1.830 ≈ 0.272
- P_1 ≈ 1.0 / 1.830 ≈ 0.546
- P_2 ≈ 0.333 / 1.830 ≈ 0.182

Check: 0.272 + 0.546 + 0.182 = 1.0 ✓

## Decision Function

### Selecting Top Candidate

```
best_candidate = argmax_k P_k
best_probability = max_k P_k
misclassification_probability = 1 - best_probability
```

### Confidence Interpretation

- **P_best > 0.9** (p_mis < 0.1): Very high confidence
- **P_best > 0.75** (p_mis < 0.25): High confidence
- **P_best > 0.6** (p_mis < 0.4): Moderate confidence
- **P_best < 0.6** (p_mis > 0.4): Low confidence, consider escalation

## Temperature Scaling (Optional)

For additional calibration, use temperature parameter T:

```
P_k(T) = softmax(S_k / T)
```

Where:
- **T < 1.0**: Makes distribution sharper (higher confidence)
- **T = 1.0**: Original softmax
- **T > 1.0**: Makes distribution softer (lower confidence)

Default: T = 1.0 (no temperature scaling)

See `06_Statistical_Weighting_Model.md` for calibration procedures.

## Implementation Checklist

- [ ] Validate all features are in [0, 1] range
- [ ] Clamp out-of-range values before scoring
- [ ] Use max-trick in softmax for numerical stability
- [ ] Verify probabilities sum to 1.0 (within floating point tolerance)
- [ ] Log raw scores for audit trail
- [ ] Log probabilities for performance analysis
- [ ] Apply temperature scaling if calibrated
