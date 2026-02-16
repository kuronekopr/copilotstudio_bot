"""
Threshold Optimization using ROC and Youden Index

This module implements threshold optimization for the scoring model.
Monthly batch job to recompute decision boundaries (threshold_auto and threshold_escalate)
using historical data and ROC analysis.
"""

from dataclasses import dataclass
from typing import List, Tuple
import numpy as np


@dataclass
class ThresholdResult:
    """Result of threshold optimization"""
    threshold_auto: float
    threshold_escalate: float
    youden_auto: float
    youden_escalate: float
    n_samples: int
    timestamp: str


def youden_index(tpr: float, fpr: float) -> float:
    """
    Compute Youden Index: J = TPR + TNR - 1 = TPR - FPR
    
    Args:
        tpr: True Positive Rate
        fpr: False Positive Rate
    
    Returns:
        Youden Index in [-1, 1]
    """
    return tpr - fpr


def compute_roc_point(
    threshold: float,
    p_mis_values: np.ndarray,
    labels: np.ndarray
) -> Tuple[float, float]:
    """
    Compute ROC point (TPR, FPR) at given threshold
    
    Args:
        threshold: Decision threshold
        p_mis_values: Misclassification probabilities
        labels: Ground truth labels (1 for CORRECT, 0 for INCORRECT)
    
    Returns:
        (tpr, fpr) at this threshold
    """
    predictions = p_mis_values < threshold
    
    tp = np.sum((predictions == True) & (labels == 1))
    fp = np.sum((predictions == True) & (labels == 0))
    tn = np.sum((predictions == False) & (labels == 0))
    fn = np.sum((predictions == False) & (labels == 1))
    
    tpr = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    
    return tpr, fpr


def optimize_thresholds(
    misclass_probs: List[float],
    labels: List[int],
    method: str = 'youden'
) -> Tuple[float, float, float, float]:
    """
    Optimize thresholds using ROC analysis and Youden Index
    
    Args:
        misclass_probs: List of misclassification probabilities
        labels: List of ground truth labels (1=CORRECT, 0=INCORRECT)
        method: Optimization method ('youden' or 'roc_analysis')
    
    Returns:
        (threshold_auto, threshold_escalate, youden_auto, youden_escalate)
    """
    p_mis = np.array(misclass_probs)
    y = np.array(labels)
    
    if len(p_mis) == 0:
        raise ValueError("Empty input arrays")
    
    if not np.all((y == 0) | (y == 1)):
        raise ValueError("Labels must be binary (0 or 1)")
    
    # Get unique thresholds to test
    # Include 0, 1, and all p_mis values
    thresholds = sorted(set([0.0, 1.0] + list(p_mis)))
    
    best_j_auto = -1.0
    best_threshold_auto = 0.5
    
    best_j_escalate = -1.0
    best_threshold_escalate = 0.5
    
    # For AUTO threshold: optimize on all data
    # We want to maximize TPR-FPR (correctly identify CORRECT answers)
    for threshold in thresholds:
        tpr, fpr = compute_roc_point(threshold, p_mis, y)
        j = youden_index(tpr, fpr)
        
        if j > best_j_auto:
            best_j_auto = j
            best_threshold_auto = threshold
    
    # For ESCALATE threshold: optimize using different perspective
    # We want to identify cases that NEED escalation (incorrect decisions)
    # So we're looking at False Negative Rate (missed escalations)
    # Flip perspective: escalate_needed = NOT(label)
    escalate_needed = 1 - y
    
    for threshold in thresholds:
        tpr, fpr = compute_roc_point(threshold, p_mis, escalate_needed)
        j = youden_index(tpr, fpr)
        
        if j > best_j_escalate:
            best_j_escalate = j
            best_threshold_escalate = threshold
    
    return best_threshold_auto, best_threshold_escalate, best_j_auto, best_j_escalate


def optimize_thresholds_with_metadata(
    misclass_probs: List[float],
    labels: List[int],
    method: str = 'youden'
) -> ThresholdResult:
    """
    Optimize thresholds and return detailed result with metadata
    
    Args:
        misclass_probs: List of misclassification probabilities
        labels: List of ground truth labels
        method: Optimization method
    
    Returns:
        ThresholdResult with optimization results and metadata
    """
    from datetime import datetime
    
    threshold_auto, threshold_escalate, j_auto, j_escalate = optimize_thresholds(
        misclass_probs, labels, method
    )
    
    return ThresholdResult(
        threshold_auto=threshold_auto,
        threshold_escalate=threshold_escalate,
        youden_auto=j_auto,
        youden_escalate=j_escalate,
        n_samples=len(misclass_probs),
        timestamp=datetime.utcnow().isoformat()
    )


def compute_roc_curve(
    misclass_probs: List[float],
    labels: List[int]
) -> Tuple[List[float], List[float], List[float]]:
    """
    Compute complete ROC curve
    
    Args:
        misclass_probs: List of misclassification probabilities
        labels: List of ground truth labels
    
    Returns:
        (fpr_list, tpr_list, thresholds_list)
    """
    p_mis = np.array(misclass_probs)
    y = np.array(labels)
    
    thresholds = sorted(set([0.0, 1.0] + list(p_mis)))
    
    fpr_list = []
    tpr_list = []
    
    for threshold in thresholds:
        tpr, fpr = compute_roc_point(threshold, p_mis, y)
        fpr_list.append(fpr)
        tpr_list.append(tpr)
    
    return fpr_list, tpr_list, thresholds


def compute_auc(
    misclass_probs: List[float],
    labels: List[int]
) -> float:
    """
    Compute Area Under the ROC Curve (AUC)
    
    Args:
        misclass_probs: List of misclassification probabilities
        labels: List of ground truth labels
    
    Returns:
        AUC score in [0, 1]
    """
    fpr_list, tpr_list, _ = compute_roc_curve(misclass_probs, labels)
    
    # Trapezoid rule for AUC
    auc = 0.0
    for i in range(1, len(fpr_list)):
        width = fpr_list[i] - fpr_list[i-1]
        height = (tpr_list[i] + tpr_list[i-1]) / 2
        auc += width * height
    
    return auc


if __name__ == "__main__":
    # Example usage
    import json
    
    # Example data
    p_mis_vals = [0.08, 0.12, 0.25, 0.35, 0.45, 0.55, 0.65, 0.72, 0.85, 0.92]
    true_labels = [1, 1, 1, 1, 0, 0, 0, 0, 0, 0]  # 1=CORRECT, 0=INCORRECT
    
    result = optimize_thresholds_with_metadata(p_mis_vals, true_labels)
    
    print("Optimization Results:")
    print(json.dumps({
        "threshold_auto": result.threshold_auto,
        "threshold_escalate": result.threshold_escalate,
        "youden_auto": result.youden_auto,
        "youden_escalate": result.youden_escalate,
        "n_samples": result.n_samples,
        "timestamp": result.timestamp
    }, indent=2))
