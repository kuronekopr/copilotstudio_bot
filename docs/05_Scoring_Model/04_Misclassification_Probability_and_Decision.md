# Misclassification Probability and Decision

## Misclassification Probability

### Definition

Misclassification probability is the likelihood that the selected candidate is NOT the correct answer:

```
p_mis = 1 - max_k P(C_k)
```

Where:
- **max_k P(C_k)** is the highest softmax probability
- **p_mis ∈ [0, 1]**
- **p_mis = 0** means perfect confidence
- **p_mis = 1** means completely uncertain

### Interpretation

```
p_mis       Interpretation                    Suggested Action
------      ----------------                 -----------------
0.0 - 0.10  Extremely high confidence        AUTO_RESOLVE
0.10 - 0.25 Very high confidence             AUTO_RESOLVE
0.25 - 0.40 High confidence                  AUTO_RESOLVE (risky)
0.40 - 0.60 Moderate confidence              ASK_CLARIFICATION
0.60 - 0.80 Low confidence                   ASK_CLARIFICATION (risky)
0.80 - 1.00 Very low confidence              ESCALATE
```

## Three-Level Decision Framework

### 1. AUTO_RESOLVE

**Condition**: p_mis < threshold_auto

**Action**:
- Automatically resolve with top candidate
- No user interaction needed
- Record in audit log

**Safety Checks**:
- Even with high confidence, apply safety rules
- If rag_miss or unknown_error: escalate regardless

**Typical threshold_auto**: 0.15 (85% confidence in top candidate)

**Benefits**:
- Reduces MTTR (mean time to resolution)
- Improves user experience (instant resolution)
- Cost efficient (no user engagement needed)

**Risks**:
- Wrong answer selected (may need correction later)
- Mitigation: Continuous monitoring of auto-resolve accuracy

**Example**:
```
Best candidate: error_001
Probability: 0.92
p_mis: 0.08
→ AUTO_RESOLVE (0.08 < 0.15)
```

### 2. ASK_CLARIFICATION

**Condition**: threshold_auto ≤ p_mis < threshold_escalate

**Action**:
- Present top N candidates to user
- User selects the correct one
- Record user selection for model training
- Execute resolution with user-selected candidate

**User Experience**:
- Brief menu: "Is this your error? [Yes] [No, show others]"
- Second menu: "Select from these: [option 1] [option 2] [option 3]"
- Confirmation: "You selected [error]. This has been resolved."

**Typical thresholds**:
- threshold_auto = 0.15
- threshold_escalate = 0.50
- So ASK_CLARIFICATION for p_mis ∈ [0.15, 0.50)

**Benefits**:
- Better accuracy than pure auto-resolve
- User still engaged (engaged users trust system)
- Provides training data for model improvement

**Risks**:
- Requires user interaction (may not be available)
- Mitigation: Fall back to escalation if no user response

**Example**:
```
Top 3 candidates:
  1. error_001 (P=0.48, p_mis=0.52)
  2. error_002 (P=0.32, p_mis=0.68)
  3. error_999 (P=0.20, p_mis=0.80)

p_mis = 0.52, threshold_escalate = 0.50
→ ESCALATE (0.52 ≥ 0.50) - just over threshold
```

### 3. ESCALATE

**Condition**: p_mis ≥ threshold_escalate OR safety rule triggered

**Action**:
- Send to human expert queue
- Include all candidates with probabilities
- Include feature values for expert context
- Wait for expert resolution
- Record expert decision for model training

**Safety Rules Override**:
Even if p_mis < threshold_auto, escalate if:
1. RAG miss: rag_similarity < 0.1
2. Unknown error: top_candidate.label == 'UNKNOWN'

**Expert Receives**:
```json
{
  "request_id": "req_123",
  "ocr_text": "Error: DEVICE_NOT_FOUND (0x80004005)",
  "candidates": [
    { "id": "c1", "label": "error_001", "probability": 0.38 },
    { "id": "c2", "label": "error_002", "probability": 0.35 },
    { "id": "c3", "label": "UNKNOWN", "probability": 0.27 }
  ],
  "features": {
    "ocr_confidence": 0.92,
    "error_code_match": 0.45,
    "cluster_prior": 0.40,
    "rag_similarity": 0.05
  },
  "reason": "Low confidence (p_mis=0.62) and RAG miss"
}
```

**Typical threshold_escalate**: 0.50 (uncertain when top candidate only 50% likely)

**Benefits**:
- Ensures complex cases get expert review
- Captures edge cases for model improvement
- Provides safety net

**Risks**:
- Expensive (human time)
- Slower (expert review latency)
- Mitigation: Prioritize common escalation patterns for investigation

## Safety Rules Detail

### Rule 1: RAG Miss

```typescript
if (features.rag_similarity < 0.1) {
  decision = Decision.ESCALATE;
  safetyFlags.ragMiss = true;
  reason = "RAG semantic similarity < 0.1 (no knowledge base match)";
}
```

**Why**: 
- rag_similarity ≈ 0 means error is not documented in knowledge base
- Indicates novel/rare error requiring expert analysis
- Cannot rely on pattern recognition alone

**Threshold rationale**: 
- 0.1 = approximately 10% semantic overlap with KB
- Below this, consider as "miss" / no match

### Rule 2: Unknown Error Code

```typescript
if (topCandidate.label === 'UNKNOWN') {
  decision = Decision.ESCALATE;
  safetyFlags.unknownError = true;
  reason = "Top candidate is UNKNOWN error code";
}
```

**Why**:
- UNKNOWN indicates clustering couldn't match error pattern
- Suggests error format is non-standard or corrupted
- Cannot auto-resolve without identified error code

**Exception**:
- If all candidates are UNKNOWN, select the best one anyway
- But still escalate with flag for expert review

## Decision Logic Flow

```
Input: candidates, features, thresholds

1. Compute raw scores for all candidates
2. Apply softmax to get probabilities
3. Select top candidate (highest probability)
4. Compute p_mis = 1 - max_probability

5. Check safety rules:
   if rag_similarity < 0.1:
     → ESCALATE (RAG miss)
   if topCandidate.label == 'UNKNOWN':
     → ESCALATE (unknown error)

6. Check confidence thresholds:
   if p_mis < threshold_auto:
     → AUTO_RESOLVE
   else if p_mis < threshold_escalate:
     → ASK_CLARIFICATION
   else:
     → ESCALATE

Output: ScoringResult
```

## Implementation Notes

- All decisions must be logged with timestamp and request_id
- Use decision logs for monthly threshold optimization
- Track decision accuracy: did user accept/reject?
- Track expert decisions: what did expert choose vs model?
- Update thresholds monthly based on accuracy metrics
