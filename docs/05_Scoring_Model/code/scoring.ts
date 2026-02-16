/**
 * Scoring Model Implementation
 * Combines normalized features using weighted linear formula and softmax
 */

import {
  Decision,
  Features01,
  Candidate,
  Weights,
  Thresholds,
  ClusterScore,
  SafetyFlags,
  ScoringResult,
  TemperatureScaling
} from "./types";

const DEFAULT_WEIGHTS: Weights = {
  w1: 0.3, // ocr_confidence
  w2: 0.3, // error_code_match
  w3: 0.2, // cluster_prior
  w4: 0.2, // rag_similarity
  default_bias: 0.0
};

const DEFAULT_THRESHOLDS: Thresholds = {
  auto: 0.15,
  escalate: 0.50
};

/**
 * Clamp value to [0, 1] range
 */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Validate that all features are in [0, 1] range
 * Logs warning and clamps if out of range
 */
function validateAndClampFeatures(features: Features01): Features01 {
  return {
    ocr_confidence: clamp01(features.ocr_confidence),
    error_code_match: clamp01(features.error_code_match),
    cluster_prior: clamp01(features.cluster_prior),
    rag_similarity: clamp01(features.rag_similarity)
  };
}

/**
 * Compute raw score for a candidate using weighted linear formula
 * S_k = w1*ocr + w2*error + w3*prior + w4*rag + b_k
 */
function computeRawScore(
  features: Features01,
  weights: Weights,
  candidateLabel: string
): number {
  const linearScore =
    weights.w1 * features.ocr_confidence +
    weights.w2 * features.error_code_match +
    weights.w3 * features.cluster_prior +
    weights.w4 * features.rag_similarity;

  const bias =
    weights.per_candidate_biases?.[candidateLabel] ?? weights.default_bias;

  return linearScore + bias;
}

/**
 * Apply softmax with numerical stability (max-trick)
 * P_k = exp(S_k - max(S)) / sum(exp(S_j - max(S)))
 */
function softmax(scores: number[]): number[] {
  if (scores.length === 0) {
    return [];
  }

  // Max-trick for numerical stability
  const maxScore = Math.max(...scores);
  const exponentials = scores.map(s => Math.exp(s - maxScore));
  const sum = exponentials.reduce((a, b) => a + b, 0);

  // Handle edge case of all zeros
  if (sum === 0) {
    return scores.map(() => 1 / scores.length);
  }

  return exponentials.map(e => e / sum);
}

/**
 * Apply temperature scaling to softmax
 * P_T(k) = softmax(S_k / T)
 */
function softmaxWithTemperature(
  scores: number[],
  temperature: number
): number[] {
  const scaledScores = scores.map(s => s / temperature);
  return softmax(scaledScores);
}

/**
 * Compute misclassification probability
 * p_mis = 1 - max(P_k)
 */
function misclassificationProbability(probabilities: number[]): number {
  if (probabilities.length === 0) {
    return 1.0;
  }
  const maxProb = Math.max(...probabilities);
  return 1 - maxProb;
}

/**
 * Make a decision based on misclassification probability and safety rules
 */
function decide(
  misclassProb: number,
  thresholds: Thresholds,
  safetyFlags: SafetyFlags
): Decision {
  // Safety rules take precedence
  if (safetyFlags.rag_miss || safetyFlags.unknown_error) {
    return Decision.ESCALATE;
  }

  // Confidence-based decision
  if (misclassProb < thresholds.auto) {
    return Decision.AUTO_RESOLVE;
  } else if (misclassProb < thresholds.escalate) {
    return Decision.ASK_CLARIFICATION;
  } else {
    return Decision.ESCALATE;
  }
}

/**
 * Check safety rules that may override confidence-based decisions
 */
function checkSafetyRules(
  features: Features01,
  topCandidate: Candidate
): SafetyFlags {
  const flags: SafetyFlags = {};

  // Rule 1: RAG miss - no knowledge base match
  if (features.rag_similarity < 0.1) {
    flags.rag_miss = true;
  }

  // Rule 2: Unknown error - clustering couldn't identify
  if (topCandidate.label === "UNKNOWN") {
    flags.unknown_error = true;
  }

  return flags;
}

/**
 * Main entry point: Score all candidates and make decision
 */
function scoreClusters(
  candidates: Candidate[],
  features: Features01,
  weights: Weights = DEFAULT_WEIGHTS,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
  temperatureScaling?: TemperatureScaling
): ScoringResult {
  // Validate and clamp features
  const validatedFeatures = validateAndClampFeatures(features);

  // Compute raw scores for all candidates
  const rawScores: Record<string, number> = {};
  const scoreArray: number[] = [];

  for (const candidate of candidates) {
    const score = computeRawScore(validatedFeatures, weights, candidate.label);
    rawScores[candidate.id] = score;
    scoreArray.push(score);
  }

  // Compute probabilities (with optional temperature scaling)
  let probabilities: number[];
  if (temperatureScaling?.enabled && temperatureScaling.temperature) {
    probabilities = softmaxWithTemperature(
      scoreArray,
      temperatureScaling.temperature
    );
  } else {
    probabilities = softmax(scoreArray);
  }

  // Map probabilities back to candidate IDs
  const allProbabilities: Record<string, number> = {};
  candidates.forEach((candidate, index) => {
    allProbabilities[candidate.id] = probabilities[index];
  });

  // Find top candidate
  const topIndex = probabilities.indexOf(Math.max(...probabilities));
  const topCandidate = candidates[topIndex];
  const topProbability = probabilities[topIndex];
  const topScore = rawScores[topCandidate.id];

  // Compute misclassification probability
  const misclassProb = misclassificationProbability(probabilities);

  // Check safety rules
  const safetyFlags = checkSafetyRules(validatedFeatures, topCandidate);

  // Make decision
  const decision = decide(misclassProb, thresholds, safetyFlags);

  return {
    decision,
    topCandidate,
    topScore,
    topProbability,
    misclassificationProb: misclassProb,
    allScores: rawScores,
    allProbabilities,
    safetyFlags
  };
}

// Exports for testing and use
export {
  clamp01,
  computeRawScore,
  softmax,
  softmaxWithTemperature,
  misclassificationProbability,
  decide,
  checkSafetyRules,
  scoreClusters,
  validateAndClampFeatures
};

export default scoreClusters;
