# Model Versioning and Governance

## Version Scheme

Semantic versioning: **MAJOR.MINOR.PATCH**

```
MAJOR.MINOR.PATCH
```

### MAJOR Version
Increments when:
- Architecture changes
- Incompatible API changes
- Feature removal
- Major process changes

Example: 1.0.0 → 2.0.0

### MINOR Version
Increments when:
- New features added (backward compatible)
- Significant improvements (weight updates with approval)
- New decision rules

Example: 1.0.0 → 1.1.0

### PATCH Version
Increments when:
- Bug fixes
- Threshold updates (from monthly optimization)
- Calibration updates
- Small improvements

Example: 1.0.0 → 1.0.1

## Change Types

Each change is categorized:

```typescript
enum ChangeType {
  WEIGHTS_UPDATE = "weights_update",           // Feature weights w1-w4
  THRESHOLD_CHANGE = "threshold_change",       // Decision thresholds
  BIAS_UPDATE = "bias_update",                 // Per-candidate biases
  FEATURE_ADDITION = "feature_addition",       // New feature added
  FEATURE_REMOVAL = "feature_removal",         // Feature removed
  FEATURE_MODIFICATION = "feature_modification", // Feature logic changed
  CALIBRATION_UPDATE = "calibration_update",   // Temperature/Platt scaling
  SAFETY_RULE_CHANGE = "safety_rule_change",   // Safety rule thresholds
  BUG_FIX = "bug_fix",                         // Correctness fix
  PERFORMANCE_FIX = "performance_fix"          // Speed/efficiency fix
}
```

## Change Process

### 1. Propose Change

```json
{
  "proposal_id": "PROP_202402_001",
  "date": "2024-02-16",
  "proposer": "alice@company.com",
  "change_type": "weights_update",
  "description": "Monthly optimization using logistic regression on Feb data",
  "old_values": {
    "weights": [0.30, 0.30, 0.20, 0.20],
    "threshold_auto": 0.15,
    "threshold_escalate": 0.50
  },
  "new_values": {
    "weights": [0.45, 0.38, 0.22, 0.15],
    "threshold_auto": 0.15,
    "threshold_escalate": 0.50
  },
  "impact_analysis": {
    "expected_auto_resolve_rate": 0.12,
    "expected_escalate_rate": 0.08,
    "youden_improvement": 0.032
  }
}
```

### 2. Analysis Phase

Independent review by 2+ team members:

Checklist:
- [ ] Changes align with business goals
- [ ] Data quality sufficient (N > 1000)
- [ ] Impact analysis completed
- [ ] No regressions observed
- [ ] Rollback plan documented
- [ ] Monitoring plan documented

### 3. Approval

Requires consensus from model committee:
- Model science lead
- Product manager
- Engineering lead
- (Optional) Customer success lead

Record in audit log:

```json
{
  "proposal_id": "PROP_202402_001",
  "status": "approved",
  "approved_by": [
    "charlie@company.com",
    "diana@company.com",
    "eve@company.com"
  ],
  "approved_at": "2024-02-29T14:30:00Z",
  "scheduled_deployment": "2024-03-01T00:00:00Z"
}
```

### 4. Deployment

```bash
# Tag the deployment
git tag -a "v1.0.1" -m "Monthly threshold optimization"

# Deploy to staging
deploy-to-staging.sh v1.0.1

# Run smoke tests
pytest tests/ -v

# Deploy to production
deploy-to-production.sh v1.0.1

# Monitor for 7 days
watch-metrics.sh v1.0.1
```

### 5. Monitoring & Validation

First 7 days after deployment:

Daily checks:
- [ ] Decision distribution (AUTO/ASK/ESCALATE) within range
- [ ] Error rate < 5%
- [ ] No spikes in escalations
- [ ] Feature availability > 99%
- [ ] Latency < 100ms p99

If any alert triggered:
- Option A: Investigate and fix
- Option B: Rollback to previous version

### 6. Rollback Procedure

```
Trigger: Quality metric > 2σ from historical mean

1. Alert: Automatic alert to on-call engineer
2. Review: Last 24 hours of decisions and outcomes
3. Decision: Quick assessment
   - Fixable by config change? → Fix and monitor
   - Requires code change? → Proceed to rollback
4. Execute:
   git checkout <previous-tag>
   deploy-to-production.sh <previous-tag>
5. Notify: Inform model committee, schedule root cause analysis
6. Document: Record in audit log with reason
```

## Audit Log

Every change must be recorded in a centralized audit log:

```json
[
  {
    "timestamp": "2024-03-01T00:00:00Z",
    "event_type": "deployment",
    "version": "1.0.1",
    "change_type": "threshold_change",
    "proposal_id": "PROP_202402_001",
    "old_values": {
      "threshold_auto": 0.15,
      "threshold_escalate": 0.50
    },
    "new_values": {
      "threshold_auto": 0.18,
      "threshold_escalate": 0.48
    },
    "approved_by": ["charlie@company.com"],
    "deployed_by": "automation",
    "reason": "Monthly ROC/Youden optimization",
    "metrics_before": {
      "correct_auto": 0.953,
      "auto_rate": 0.125,
      "escalate_rate": 0.082
    },
    "status": "active"
  },
  {
    "timestamp": "2024-03-08T06:45:00Z",
    "event_type": "rollback",
    "from_version": "1.0.1",
    "to_version": "1.0.0",
    "reason": "Escalate rate increased to 15% (expected 8%)",
    "rolled_back_by": "automation",
    "root_cause": "TBD - scheduled analysis",
    "status": "completed"
  }
]
```

## Version Release Checklist

Before marking version as RELEASED:

- [ ] All tests pass (unit, integration, end-to-end)
- [ ] Code reviewed by 2+ engineers
- [ ] Documentation updated
- [ ] Changelog updated with clear description
- [ ] Breaking changes (if any) clearly marked
- [ ] Migration guide provided (if needed)
- [ ] Performance benchmarks run
- [ ] Approved by model committee
- [ ] Tagged in version control
- [ ] Audit log entry created
- [ ] Release notes published

## Documentation Updates

When version changes:

1. **Update CHANGELOG.md**
   ```
   ## [1.0.1] - 2024-03-01
   ### Changed
   - Monthly threshold optimization (ROC/Youden)
   - threshold_auto: 0.15 → 0.18
   - threshold_escalate: 0.50 → 0.48
   
   ### Metrics
   - Youden index improved by 0.032
   - Auto-resolve accuracy: 95.3%
   ```

2. **Update model configuration file**
   ```json
   {
     "version": "1.0.1",
     "released_at": "2024-03-01T00:00:00Z",
     "weights": [0.30, 0.30, 0.20, 0.20],
     "biases": { "default": 0.0 },
     "thresholds": {
       "auto": 0.18,
       "escalate": 0.48
     }
   }
   ```

3. **Update README.md** if major changes

## Backward Compatibility

- **MAJOR** versions: No backward compatibility guarantee
- **MINOR** versions: Input backward compatible (may have new optional fields)
- **PATCH** versions: Fully backward compatible

## Version Deprecation

After new MINOR or MAJOR release:

- Previous version: Supported for 4 weeks
- Older versions: Unsupported
- Migration path provided for 8 weeks

Example:
```
v1.0.1 (current) - Full support
v1.0.0 (previous) - Maintenance support until 2024-03-28
v0.9.x (older) - Unsupported as of 2024-03-01
```

## Historical Record

Keep complete history of all versions:

```json
{
  "version": "1.0.0",
  "released_at": "2024-01-15T00:00:00Z",
  "weights": [0.30, 0.30, 0.20, 0.20],
  "threshold_auto": 0.15,
  "threshold_escalate": 0.50,
  "performance": {
    "correct_auto": 0.948,
    "auto_rate": 0.10,
    "escalate_rate": 0.10
  },
  "status": "superseded",
  "superseded_by": "1.0.1"
}
```

This allows:
- Rollback to any historical version with known performance
- Analysis of how model evolved
- Learning from past decisions
- Compliance/audit trail
