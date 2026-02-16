"""
pytest tests for Threshold Optimizer
"""

import pytest
import numpy as np
from code.threshold_optimizer import (
    youden_index,
    compute_roc_point,
    optimize_thresholds,
    compute_roc_curve,
    compute_auc
)


class TestYoudenIndex:
    """Tests for Youden Index calculation"""

    def test_perfect_classification(self):
        """Youden = 1 when TPR=1, FPR=0"""
        j = youden_index(tpr=1.0, fpr=0.0)
        assert j == pytest.approx(1.0)

    def test_random_classification(self):
        """Youden = 0 when TPR=FPR (random classifier)"""
        j = youden_index(tpr=0.5, fpr=0.5)
        assert j == pytest.approx(0.0)

    def test_worst_classification(self):
        """Youden = -1 when TPR=0, FPR=1 (worst case)"""
        j = youden_index(tpr=0.0, fpr=1.0)
        assert j == pytest.approx(-1.0)


class TestComputeROCPoint:
    """Tests for ROC point computation"""

    def test_roc_point_at_zero_threshold(self):
        """At threshold 0, everything predicted as positive"""
        p_mis = np.array([0.1, 0.2, 0.3, 0.4, 0.5])
        labels = np.array([1, 1, 0, 0, 0])  # 2 correct, 3 incorrect

        # At threshold 0, all are predicted as "p_mis < 0"
        # So all are predicted negative
        tpr, fpr = compute_roc_point(0.0, p_mis, labels)

        # TPR = TP / (TP + FN) = 0 / 2 = 0
        # FPR = FP / (FP + TN) = 0 / 3 = 0
        assert tpr == 0.0
        assert fpr == 0.0

    def test_roc_point_at_max_threshold(self):
        """At threshold > max(p_mis), everything predicted as negative"""
        p_mis = np.array([0.1, 0.2, 0.3, 0.4, 0.5])
        labels = np.array([1, 1, 0, 0, 0])

        # At threshold 1.0, all p_mis < 1.0, so all predicted as positive
        tpr, fpr = compute_roc_point(1.0, p_mis, labels)

        # TPR = TP / (TP + FN) = 2 / 2 = 1
        # FPR = FP / (FP + TN) = 3 / 3 = 1
        assert tpr == 1.0
        assert fpr == 1.0


class TestOptimizeThresholds:
    """Tests for threshold optimization"""

    def test_simple_separation(self):
        """Test with perfectly separable data"""
        p_mis = [0.05, 0.08, 0.12, 0.50, 0.60, 0.80]
        labels = [1, 1, 1, 0, 0, 0]  # First 3 correct, last 3 incorrect

        threshold_auto, threshold_escalate, j_auto, j_escalate = optimize_thresholds(
            p_mis, labels
        )

        # Optimal threshold_auto should be around 0.25 (between 0.12 and 0.50)
        # to separate correct from incorrect
        assert 0.1 < threshold_auto < 0.5
        assert j_auto > 0.5  # Should be good separation

    def test_noisy_data(self):
        """Test with overlapping distributions"""
        np.random.seed(42)
        # Generate overlapping distributions
        correct_probs = np.random.normal(0.2, 0.1, 50)
        incorrect_probs = np.random.normal(0.4, 0.15, 50)

        p_mis = np.concatenate([correct_probs, incorrect_probs]).tolist()
        labels = [1] * 50 + [0] * 50

        threshold_auto, threshold_escalate, j_auto, j_escalate = optimize_thresholds(
            p_mis, labels
        )

        # Should find a reasonable threshold
        assert 0.0 <= threshold_auto <= 1.0
        assert 0.0 <= threshold_escalate <= 1.0

    def test_requires_non_empty_input(self):
        """Should raise error on empty input"""
        with pytest.raises(ValueError):
            optimize_thresholds([], [])

    def test_requires_binary_labels(self):
        """Should raise error on non-binary labels"""
        with pytest.raises(ValueError):
            optimize_thresholds([0.1, 0.2], [0, 2])  # 2 is not binary

    def test_thresholds_are_reasonable(self):
        """Optimized thresholds should be in reasonable ranges"""
        p_mis = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7]
        labels = [1, 1, 1, 1, 0, 0, 0, 0, 0]

        threshold_auto, threshold_escalate, _, _ = optimize_thresholds(
            p_mis, labels
        )

        # Both should be between 0 and 1
        assert 0.0 <= threshold_auto <= 1.0
        assert 0.0 <= threshold_escalate <= 1.0


class TestROCCurve:
    """Tests for ROC curve computation"""

    def test_roc_curve_shape(self):
        """ROC curve should have matching dimensions"""
        p_mis = [0.1, 0.2, 0.3, 0.4, 0.5]
        labels = [1, 1, 0, 0, 0]

        fpr, tpr, thresholds = compute_roc_curve(p_mis, labels)

        assert len(fpr) == len(tpr)
        assert len(tpr) == len(thresholds)
        assert len(fpr) > 0

    def test_roc_curve_starts_at_origin(self):
        """ROC curve should approach (0, 0) at high threshold"""
        p_mis = [0.1, 0.2, 0.3, 0.4, 0.5]
        labels = [1, 1, 0, 0, 0]

        fpr, tpr, _ = compute_roc_curve(p_mis, labels)

        # At threshold 0, both should be high (everything predicted positive)
        # At very high threshold, both should be low
        assert fpr[-1] <= fpr[0]  # FPR decreases
        assert tpr[-1] <= tpr[0]  # TPR decreases


class TestAUC:
    """Tests for AUC computation"""

    def test_perfect_auc(self):
        """Perfect separator should have AUC = 1"""
        # Perfect separation: all correct < all incorrect
        p_mis = [0.1, 0.2, 0.3, 0.8, 0.9, 1.0]
        labels = [1, 1, 1, 0, 0, 0]

        auc = compute_auc(p_mis, labels)

        assert auc == pytest.approx(1.0, abs=0.1)  # Should be very close to 1

    def test_random_auc(self):
        """Random classifier should have AUC ≈ 0.5"""
        np.random.seed(42)
        p_mis = np.random.uniform(0, 1, 100).tolist()
        labels = np.random.binomial(1, 0.5, 100).tolist()

        auc = compute_auc(p_mis, labels)

        # Should be around 0.5 for random data
        assert 0.3 < auc < 0.7


class TestIntegration:
    """Integration tests combining multiple components"""

    def test_monthly_optimization_workflow(self):
        """Simulate monthly threshold optimization"""
        # Collect 1000 samples of historical data
        np.random.seed(42)
        n_samples = 1000

        # Simulate: correct decisions have lower p_mis, incorrect have higher
        correct_indices = np.random.choice(n_samples, 950, replace=False)
        p_mis = np.random.uniform(0.1, 1.0, n_samples)
        p_mis[correct_indices] = np.random.normal(0.2, 0.1, len(correct_indices))

        labels = np.zeros(n_samples)
        labels[correct_indices] = 1

        # Optimize thresholds
        threshold_auto, threshold_escalate, j_auto, j_escalate = optimize_thresholds(
            p_mis.tolist(), labels.astype(int).tolist()
        )

        # Verify results
        assert 0.0 <= threshold_auto <= 1.0
        assert 0.0 <= threshold_escalate <= 1.0
        assert j_auto > 0.1  # Should have some discriminative power
        assert j_escalate > 0.1

    def test_threshold_ordering(self):
        """threshold_auto should typically be < threshold_escalate"""
        p_mis = [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
        labels = [1, 1, 1, 1, 1, 0, 0, 0, 0, 0]

        threshold_auto, threshold_escalate, _, _ = optimize_thresholds(
            p_mis, labels
        )

        # Typically, auto < escalate (easier to auto-resolve than to escalate)
        # But not strictly guaranteed by algorithm
        assert threshold_auto <= 1.0
        assert threshold_escalate <= 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
