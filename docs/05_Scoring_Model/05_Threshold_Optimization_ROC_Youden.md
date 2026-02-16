# Threshold Optimization: ROC and Youden Index

## Overview

Thresholds for decision boundaries (AUTO vs ASK vs ESCALATE) must be optimized monthly using historical data and ROC analysis. This document describes the process, metrics, and governance.

## Label Definition

To optimize thresholds, we need ground truth labels for each historical request:

### Label Types

```typescript
enum GroundTruth {
  CORRECT = "correct",           // Expert confirmed this was the right answer
  PARTIALLY_CORRECT = "partial", // Answer was helpful but not complete
  INCORRECT = "incorrect",       // Expert chose different answer
  NEEDS_DIFFERENT_APPROACH = "different"  // Different resolution needed
}
```

### Label Collection

**During AUTO_RESOLVE**:
- Log the decision
- Wait for user feedback or service ticket
- Mark as CORRECT if no follow-up complaint
- Mark as INCORRECT if user reported wrong resolution

**During ASK_CLARIFICATION**:
- Log candidates presented to user
- Record user's selection
- Mark as CORRECT if user selected top candidate
- Mark as INCORRECT if user selected different candidate
- This data is especially valuable for threshold tuning

**During ESCALATE**:
- Expert provides resolution
- Log expert's choice vs model's top choice
- Mark as CORRECT if expert agreed with model
- Mark as INCORRECT if expert chose different one
- Mark as NEEDS_DIFFERENT_APPROACH if entirely different resolution

### Data Requirements

For reliable threshold optimization:
- Minimum 1000 labeled samples per month
- At least 100 AUTO_RESOLVE decisions
- At least 100 ASK_CLARIFICATION decisions
- At least 100 ESCALATE decisions

## ROC Curve Analysis

### What is ROC?

ROC (Receiver Operating Characteristic) shows tradeoff between:
- **True Positive Rate (TPR)**: Correct answers selected
- **False Positive Rate (FPR)**: Incorrect answers selected

As we vary the threshold for AUTO_RESOLVE:
- Lower threshold → more AUTO_RESOLVE → higher TPR but also higher FPR
- Higher threshold → fewer AUTO_RESOLVE → lower FPR but also lower TPR

### Building ROC Curve

For each candidate classification:

```python
def compute_roc_point(threshold, p_mis_values, labels):
    predictions = [p_mis < threshold for p_mis in p_mis_values]
    tp = sum((pred == True) and (label == "correct") 
             for pred, label in zip(predictions, labels))
    fp = sum((pred == True) and (label == "incorrect") 
             for pred, label in zip(predictions, labels))
    tn = sum((pred == False) and (label == "incorrect") 
             for pred, label in zip(predictions, labels))
    fn = sum((pred == False) and (label == "correct") 
             for pred, label in zip(predictions, labels))
    
    tpr = tp / (tp + fn) if (tp + fn) > 0 else 0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
    
    return tpr, fpr
```

## Youden Index

### Formula

```
Youden Index (J) = TPR + TNR - 1
                 = TPR + (1 - FPR) - 1
                 = TPR - FPR
```

Where:
- **TPR** = True Positive Rate (sensitivity)
- **TNR** = True Negative Rate (specificity)
- **J ∈ [-1, 1]**
- **J = 1** means perfect classification
- **J = 0** means no better than random

### Interpretation

Youden Index maximizes:
- Correctly classified positives (true positives)
- Correctly classified negatives (true negatives)
- Minimizes both false positives and false negatives

For scoring model:
- Positives = INCORRECT predictions (want to catch)
- Negatives = CORRECT predictions (want to allow)

### Optimal Threshold

```python
def find_youden_optimal_threshold(p_mis_values, labels):
    thresholds = sorted(set(p_mis_values))
    best_j = -1
    best_threshold = 0.5
    
    for threshold in thresholds:
        tpr, fpr = compute_roc_point(threshold, p_mis_values, labels)
        j = tpr - fpr
        
        if j > best_j:
            best_j = j
            best_threshold = threshold
    
    return best_threshold, best_j
```

## Multi-Threshold Optimization

### Two Thresholds to Optimize

1. **threshold_auto**: Decision boundary between AUTO_RESOLVE and ASK_CLARIFICATION
   - Optimize for: maximizing correct auto-resolves, minimizing wrong auto-resolves
   - Use Youden on AUTO vs NOT_AUTO classification

2. **threshold_escalate**: Decision boundary between ASK_CLARIFICATION and ESCALATE
   - Optimize for: correctly identifying cases needing escalation
   - Use ROC/Youden on SHOULD_ESCALATE vs NOT_ESCALATE classification

### Optimization Process

```python
def optimize_both_thresholds(historical_data):
    # Filter data for AUTO threshold optimization
    auto_data = filter(historical_data, 
                       lambda x: x.decision != ESCALATE)  # Only non-escalated
    threshold_auto, j_auto = find_youden_optimal_threshold(
        auto_data.p_mis, auto_data.label)
    
    # Filter data for ESCALATE threshold optimization
    escalate_data = historical_data
    threshold_escalate, j_escalate = find_youden_optimal_threshold(
        escalate_data.p_mis, 
        escalate_data.needs_escalation)  # Boolean: was escalation needed?
    
    return ThresholdResult(
        threshold_auto=threshold_auto,
        threshold_escalate=threshold_escalate,
        youden_auto=j_auto,
        youden_escalate=j_escalate,
        date=today()
    )
```

## Governance Process

### Monthly Retraining Cycle

```
Step 1: Data Collection (Days 1-27 of month)
  - Collect all scoring decisions and outcomes
  - Label as CORRECT/INCORRECT/PARTIAL
  - Minimum 1000 samples required

Step 2: Analysis (Day 28)
  - Compute ROC curves for both thresholds
  - Calculate Youden indices
  - Identify optimal thresholds
  - Compare to current thresholds
  - Generate analysis report

Step 3: Approval (Day 29)
  - Model committee reviews analysis
  - Checks for anomalies
  - Reviews impact on resolution rates
  - Approves or rejects changes

Step 4: Deployment (Day 30)
  - Deploy new thresholds
  - Document in version control
  - Create audit log entry
  - Monitor for first week

Step 5: Rollback Capability (Days 31+)
  - Keep previous thresholds active
  - Monitor quality metrics
  - If 5% increase in incorrect resolves: rollback
  - Document reason and findings
```

### Approval Checklist

Before deploying new thresholds, verify:

- [ ] At least 1000 labeled samples analyzed
- [ ] Youden index improvement ≥ 0.02 (2% improvement)
- [ ] No increase in high-confidence wrong answers
- [ ] Escalation rate remains within expected range (5-15%)
- [ ] ROC curve shows improvement across FPR range
- [ ] No regression in any customer segment
- [ ] Model committee consensus achieved

### Rollback Procedure

If new thresholds cause issues within 7 days:

```
1. Alert: Detection of quality degradation
2. Review: Last 24 hours of decisions
3. Decision: Can be fixed by threshold adjustment?
   - Yes: Emergency adjustment (requires 2 approvals)
   - No: Rollback to previous thresholds
4. Documentation: Record reason in audit log
5. Follow-up: Root cause analysis at next review
```

## Metrics Dashboard

Monthly monitoring should track:

```
Metric                      Target    Alert
------                      ------    -----
Correct AUTO_RESOLVE rate   > 95%     < 93%
Incorrect AUTO_RESOLVE rate < 5%      > 7%
ASK_CLARIFICATION rate      8-15%     < 5% or > 20%
ESCALATE rate               5-15%     < 3% or > 20%
Avg decision latency        < 100ms   > 200ms
Feature availability        > 99%     < 98%
RAG miss rate               < 2%      > 3%
```

## Version Updates

Each threshold update increments the PATCH version:

```
Version 1.0.0 (initial)
  → 1.0.1 (first threshold update)
  → 1.0.2 (second threshold update)
  → 1.1.0 (weight update)
  → 2.0.0 (major change)
```

See `07_Model_Versioning_and_Governance.md` for version scheme details.
