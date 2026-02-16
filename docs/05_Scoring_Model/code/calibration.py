"""
Temperature Scaling and Probability Calibration

This module implements temperature scaling to calibrate model confidence.
Used to ensure that predicted probabilities match actual accuracy rates.
"""

from dataclasses import dataclass
from typing import Tuple
import numpy as np


@dataclass
class TempFit:
    """Result of temperature scaling calibration"""
    temperature: float
    nll_before: float
    nll_after: float
    improvement: float


def softmax(scores: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    """
    Compute softmax with optional temperature scaling
    
    Args:
        scores: Raw scores, shape (n_candidates,) or (n_samples, n_candidates)
        temperature: Temperature for scaling (T=1.0 means no scaling)
    
    Returns:
        Probabilities after softmax, same shape as input
    """
    # Handle 1D and 2D arrays
    is_1d = scores.ndim == 1
    if is_1d:
        scores = scores.reshape(1, -1)
    
    # Scale scores by temperature
    scaled = scores / temperature
    
    # Softmax with max-trick for numerical stability
    max_scores = np.max(scaled, axis=1, keepdims=True)
    exponentials = np.exp(scaled - max_scores)
    sums = np.sum(exponentials, axis=1, keepdims=True)
    
    probs = exponentials / sums
    
    if is_1d:
        probs = probs.reshape(-1)
    
    return probs


def nll(predictions: np.ndarray, labels: np.ndarray) -> float:
    """
    Compute Negative Log-Likelihood (NLL)
    
    Args:
        predictions: Predicted probabilities for correct class
        labels: Ground truth labels (0 or 1)
    
    Returns:
        NLL loss (lower is better)
    """
    eps = 1e-15
    clipped = np.clip(predictions, eps, 1 - eps)
    return -np.mean(np.log(clipped))


def fit_temperature(
    raw_scores: np.ndarray,
    labels: np.ndarray,
    search_range: Tuple[float, float] = (0.1, 5.0),
    n_steps: int = 100
) -> TempFit:
    """
    Find optimal temperature for calibration
    
    Args:
        raw_scores: Shape (n_samples, n_candidates) - raw model scores
        labels: Shape (n_samples,) - correct candidate index for each sample
        search_range: Temperature search range (min, max)
        n_steps: Number of temperature values to test
    
    Returns:
        TempFit with optimal temperature and NLL improvement
    """
    raw_scores = np.array(raw_scores)
    labels = np.array(labels, dtype=int)
    
    # Compute baseline NLL with T=1.0
    base_probs = softmax(raw_scores, temperature=1.0)
    correct_probs = base_probs[np.arange(len(labels)), labels]
    nll_base = nll(correct_probs, np.ones_like(correct_probs))
    
    best_temp = 1.0
    best_nll = nll_base
    
    # Search for optimal temperature
    temperatures = np.linspace(search_range[0], search_range[1], n_steps)
    
    for temp in temperatures:
        probs = softmax(raw_scores, temperature=temp)
        correct_probs = probs[np.arange(len(labels)), labels]
        loss = nll(correct_probs, np.ones_like(correct_probs))
        
        if loss < best_nll:
            best_nll = loss
            best_temp = temp
    
    improvement = nll_base - best_nll
    
    return TempFit(
        temperature=best_temp,
        nll_before=nll_base,
        nll_after=best_nll,
        improvement=improvement
    )


def expected_calibration_error(
    predicted_probs: np.ndarray,
    labels: np.ndarray,
    n_bins: int = 10
) -> float:
    """
    Compute Expected Calibration Error (ECE)
    
    Measures how well predicted probabilities match actual accuracy.
    Lower is better. ECE < 0.05 is well-calibrated.
    
    Args:
        predicted_probs: Predicted probabilities for correct class
        labels: Ground truth labels (0 or 1, or correct=1)
        n_bins: Number of bins for calibration curve
    
    Returns:
        ECE value in [0, 1]
    """
    predicted_probs = np.array(predicted_probs)
    labels = np.array(labels)
    
    bins = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    
    for i in range(n_bins):
        mask = (predicted_probs >= bins[i]) & (predicted_probs < bins[i+1])
        
        if np.sum(mask) > 0:
            bin_accuracy = np.mean(labels[mask])
            bin_confidence = np.mean(predicted_probs[mask])
            bin_size = np.sum(mask) / len(labels)
            
            ece += np.abs(bin_accuracy - bin_confidence) * bin_size
    
    return ece


def apply_temperature_scaling(
    raw_scores: np.ndarray,
    temperature: float
) -> np.ndarray:
    """
    Apply temperature scaling to raw scores
    
    Args:
        raw_scores: Raw model scores
        temperature: Temperature parameter
    
    Returns:
        Calibrated probabilities
    """
    return softmax(raw_scores, temperature=temperature)


def platt_scaling_coefficients(
    raw_scores: np.ndarray,
    labels: np.ndarray
) -> Tuple[float, float]:
    """
    Fit Platt scaling: P = 1 / (1 + exp(-a*score - b))
    
    Uses logistic regression to find coefficients a, b.
    
    Args:
        raw_scores: Raw model scores (1D array)
        labels: Ground truth labels (0 or 1)
    
    Returns:
        (a, b) coefficients
    """
    from scipy.optimize import minimize
    
    raw_scores = np.array(raw_scores).flatten()
    labels = np.array(labels)
    
    def platt_loss(params):
        a, b = params
        logits = a * raw_scores + b
        probs = 1.0 / (1.0 + np.exp(-logits))
        eps = 1e-15
        probs = np.clip(probs, eps, 1 - eps)
        return -np.mean(labels * np.log(probs) + (1 - labels) * np.log(1 - probs))
    
    result = minimize(platt_loss, [1.0, 0.0], method='Nelder-Mead')
    
    return tuple(result.x)


if __name__ == "__main__":
    # Example usage
    np.random.seed(42)
    
    # Simulate raw scores and labels
    n_samples = 100
    raw_scores = np.random.randn(n_samples, 5)  # 5 candidates per sample
    labels = np.argmax(raw_scores, axis=1)  # True labels
    
    # Fit temperature
    result = fit_temperature(raw_scores, labels)
    
    print("Temperature Calibration Results:")
    print(f"  Optimal Temperature: {result.temperature:.4f}")
    print(f"  NLL Before: {result.nll_before:.6f}")
    print(f"  NLL After: {result.nll_after:.6f}")
    print(f"  Improvement: {result.improvement:.6f}")
    
    # Check ECE
    probs_before = softmax(raw_scores, temperature=1.0)
    correct_probs_before = probs_before[np.arange(len(labels)), labels]
    ece_before = expected_calibration_error(correct_probs_before, np.ones_like(correct_probs_before))
    
    probs_after = softmax(raw_scores, temperature=result.temperature)
    correct_probs_after = probs_after[np.arange(len(labels)), labels]
    ece_after = expected_calibration_error(correct_probs_after, np.ones_like(correct_probs_after))
    
    print(f"\n  ECE Before: {ece_before:.6f}")
    print(f"  ECE After: {ece_after:.6f}")
