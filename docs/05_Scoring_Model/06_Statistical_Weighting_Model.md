# Statistical Weighting Model

## Overview

While the initial weights (0.3, 0.3, 0.2, 0.2) provide a reasonable starting point, statistical analysis of historical data can improve them. This document describes two complementary approaches:

1. **Logistic Regression**: Online/offline weight updates based on labeled data
2. **Calibration**: Temperature scaling to improve confidence estimates

## Weight Estimation via Logistic Regression

### Problem Formulation

Given labeled historical data, estimate optimal weights (w1, w2, w3, w4, biases).

**Input**: 
- Features: (ocr_confidence, error_code_match, cluster_prior, rag_similarity)
- Labels: CORRECT or INCORRECT

**Goal**: 
- Maximize likelihood of correct classification
- Weights that best separate CORRECT from INCORRECT

### Method: Logistic Regression

The logistic regression model predicts probability of CORRECT:

```
log_odds = w1*f1 + w2*f2 + w3*f3 + w4*f4 + b
P(CORRECT | features) = 1 / (1 + exp(-log_odds))
```

Equivalent to: finding weights that maximize likelihood of observed labels.

### Implementation (Python)

```python
from sklearn.linear_model import LogisticRegression
import numpy as np

def estimate_weights_logistic(features_array, labels):
    """
    features_array: shape (n_samples, 4) - normalized features
    labels: shape (n_samples,) - 1 for CORRECT, 0 for INCORRECT
    
    Returns:
      weights: [w1, w2, w3, w4]
      bias: b
    """
    model = LogisticRegression(fit_intercept=True, max_iter=1000)
    model.fit(features_array, labels)
    
    weights = model.coef_[0]  # [w1, w2, w3, w4]
    bias = model.intercept_[0]
    
    return weights, bias
```

### Interpreting Weights

After fitting, examine weight magnitudes:

```
Positive weight → feature positively correlated with CORRECT
Negative weight → feature negatively correlated with CORRECT
Magnitude → importance in decision
```

Example output:
```
w1 (ocr_confidence)   = 0.45  (strong positive)
w2 (error_code_match) = 0.38  (strong positive)
w3 (cluster_prior)    = 0.22  (moderate positive)
w4 (rag_similarity)   = 0.15  (weak positive)
bias                  = -0.1
```

Interpretation: 
- OCR confidence is more important than initially thought (0.45 vs 0.30)
- Error code match similar (0.38 vs 0.30)
- Cluster prior less important (0.22 vs 0.20)
- RAG similarity much less important (0.15 vs 0.20)

### Online vs Offline Updates

**Offline Updates** (monthly):
```
Run logistic regression on accumulated historical data
Replace weights if Youden index improves ≥ 2%
Requires approval before deployment
```

**Online Updates** (continuous):
```
Estimate weights from recent data
Use for monitoring/early warning
Do NOT deploy without approval
Alert if weights drift > 10% from production values
```

## Probability Calibration

### The Calibration Problem

The softmax probabilities may not be well-calibrated:

```
Claim: "This decision is 95% likely to be correct"
Reality: "Only 85% of decisions labeled 95% accurate are actually correct"
```

Solutions:
1. **Platt Scaling**: Fit logistic function to model outputs
2. **Temperature Scaling**: Single parameter T adjustment
3. **Histogram Binning**: Empirical calibration per probability range

### Temperature Scaling

Simplest approach: rescale logits by temperature T before softmax.

```
P_T(k) = softmax(S_k / T)
```

Where:
- **T < 1.0**: Makes probabilities sharper (model more confident)
- **T = 1.0**: Original model (no scaling)
- **T > 1.0**: Makes probabilities softer (model less confident)

#### Finding Optimal T

Use negative log-likelihood (NLL) on validation set:

```python
def softmax_t(scores, temperature):
    """Softmax with temperature scaling."""
    adjusted = scores / temperature
    max_s = np.max(adjusted)
    exp_s = np.exp(adjusted - max_s)
    return exp_s / np.sum(exp_s)

def nll_loss(predictions, labels):
    """Negative log-likelihood."""
    eps = 1e-15
    return -np.mean(np.log(np.clip(predictions, eps, 1 - eps)))

def fit_temperature(scores, labels):
    """
    scores: shape (n, n_candidates) - raw scores
    labels: shape (n,) - correct candidate index for each sample
    
    Returns: optimal temperature T
    """
    best_t = 1.0
    best_nll = float('inf')
    
    for t in np.linspace(0.5, 2.0, 100):
        nll_total = 0
        for score_row, label in zip(scores, labels):
            probs = softmax_t(score_row, t)
            nll_total += nll_loss(probs[label], 1)  # label is correct answer
        
        if nll_total < best_nll:
            best_nll = nll_total
            best_t = t
    
    return best_t
```

#### Example

Raw scores: [1.0, 0.5, -0.5]
Original softmax: [0.61, 0.28, 0.10]

With T=0.7 (sharper):
softmax([1.43, 0.71, -0.71]) = [0.76, 0.20, 0.04]
(more confident in top choice)

With T=1.5 (softer):
softmax([0.67, 0.33, -0.33]) = [0.52, 0.36, 0.12]
(less confident in top choice)

### Platt Scaling

More sophisticated: fit logistic function to calibrate probabilities.

```
P_calibrated = 1 / (1 + exp(-a*logits - b))
```

Where a, b are learned from held-out validation data.

```python
def fit_platt_scaling(raw_scores, labels):
    """
    raw_scores: Model's raw output scores
    labels: 1 if correct, 0 if incorrect
    """
    from sklearn.linear_model import LogisticRegression
    
    # Fit logistic regression on raw scores → binary label
    model = LogisticRegression()
    model.fit(raw_scores.reshape(-1, 1), labels)
    
    a = model.coef_[0][0]
    b = model.intercept_[0]
    
    return a, b

def apply_platt_scaling(raw_scores, a, b):
    """Apply learned Platt scaling."""
    return 1.0 / (1.0 + np.exp(-a * raw_scores - b))
```

## Implementation Strategy

### Phase 1: Baseline (Week 1-4)
- Deploy initial weights (0.3, 0.3, 0.2, 0.2)
- Collect labeled historical data
- Monitor calibration

### Phase 2: First Optimization (Month 2)
- Estimate weights via logistic regression
- If improvement ≥ 2%: deploy with approval
- Fit temperature scaling on validation data

### Phase 3: Ongoing (Monthly)
- Monthly weight re-estimation
- Compare to production weights
- Alert if drift > 10%
- Deploy if approved and improvement ≥ 2%

### Phase 4: Advanced (When data allows)
- Switch from temperature to Platt scaling
- Consider candidate-specific calibration
- Experiment with feature engineering

## Monitoring Calibration

Track calibration metrics monthly:

```
Expected Calibration Error (ECE):
ECE = Σ_bin |confidence - accuracy|

For each probability bin [0-10%, 10-20%, ..., 90-100%]:
  - Count samples in bin
  - Compute average confidence
  - Compute actual accuracy
  - Weight by bin size

Good model: ECE < 0.05 (5%)
Poorly calibrated: ECE > 0.15 (15%)
```

## Audit Requirements

All weight changes must be logged:

```json
{
  "timestamp": "2024-03-01T00:00:00Z",
  "event_type": "weight_update",
  "version": "1.1.0",
  "reason": "Monthly optimization",
  "old_weights": [0.30, 0.30, 0.20, 0.20],
  "new_weights": [0.45, 0.38, 0.22, 0.15],
  "method": "logistic_regression",
  "improvement_youden": 0.032,
  "approval": "model-committee",
  "approved_by": ["alice@company.com", "bob@company.com"],
  "approved_at": "2024-03-01T08:00:00Z",
  "deployed_at": "2024-03-01T10:00:00Z"
}
```
