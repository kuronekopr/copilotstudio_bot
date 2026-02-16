/**
 * TypeScript type definitions for the Scoring Model
 */

/**
 * Decision outcome from the scoring model
 */
export enum Decision {
  /** High confidence - automatically resolve with top candidate */
  AUTO_RESOLVE = "AUTO_RESOLVE",
  /** Medium confidence - ask user for clarification */
  ASK_CLARIFICATION = "ASK_CLARIFICATION",
  /** Low confidence or safety rule triggered - escalate to expert */
  ESCALATE = "ESCALATE"
}

/**
 * Normalized input features for scoring
 * All values must be in range [0, 1]
 */
export interface Features01 {
  /** OCR text extraction quality [0, 1] */
  ocr_confidence: number;
  /** Pattern match with known error codes [0, 1] */
  error_code_match: number;
  /** Prior probability from clustering [0, 1] */
  cluster_prior: number;
  /** Semantic similarity to RAG knowledge base [0, 1] */
  rag_similarity: number;
}

/**
 * A candidate answer from the clustering module
 */
export interface Candidate {
  /** Unique identifier for this candidate */
  id: string;
  /** Predicted error code (e.g., "error_001", "UNKNOWN") */
  label: string;
  /** Optional metadata from clustering */
  metadata?: Record<string, unknown>;
}

/**
 * Learnable weights for the scoring formula
 * S_k = w1*ocr + w2*error + w3*prior + w4*rag + b_k
 */
export interface Weights {
  /** Weight for ocr_confidence */
  w1: number;
  /** Weight for error_code_match */
  w2: number;
  /** Weight for cluster_prior */
  w3: number;
  /** Weight for rag_similarity */
  w4: number;
  /** Default bias (used when no candidate-specific bias available) */
  default_bias: number;
  /** Per-candidate biases */
  per_candidate_biases?: Record<string, number>;
}

/**
 * Decision thresholds for three-level framework
 */
export interface Thresholds {
  /** Threshold between AUTO_RESOLVE and ASK_CLARIFICATION
   * p_mis < threshold_auto → AUTO_RESOLVE
   */
  auto: number;
  /** Threshold between ASK_CLARIFICATION and ESCALATE
   * p_mis >= threshold_escalate → ESCALATE
   */
  escalate: number;
}

/**
 * Raw score and probability for a single candidate
 */
export interface ClusterScore {
  candidate_id: string;
  candidate_label: string;
  raw_score: number;
  probability: number;
}

/**
 * Safety flags that may override decision logic
 */
export interface SafetyFlags {
  /** RAG semantic similarity too low (< 0.1) */
  rag_miss?: boolean;
  /** Top candidate is UNKNOWN error code */
  unknown_error?: boolean;
}

/**
 * Complete result from scoring model
 */
export interface ScoringResult {
  /** Final decision from three-level framework */
  decision: Decision;
  /** Best-ranked candidate */
  topCandidate: Candidate;
  /** Raw score for top candidate (unbounded) */
  topScore: number;
  /** Softmax probability for top candidate [0, 1] */
  topProbability: number;
  /** Misclassification probability = 1 - max(P_k) */
  misclassificationProb: number;
  /** Raw scores for all candidates */
  allScores: Record<string, number>;
  /** Softmax probabilities for all candidates */
  allProbabilities: Record<string, number>;
  /** Triggered safety rules */
  safetyFlags: SafetyFlags;
}

/**
 * Temperature scaling configuration
 */
export interface TemperatureScaling {
  /** Temperature parameter T for softmax(S/T) */
  temperature: number;
  /** Whether scaling is enabled */
  enabled: boolean;
  /** Last calibration date */
  last_calibrated?: string;
}

/**
 * Complete model configuration
 */
export interface ModelConfig {
  /** Semantic version MAJOR.MINOR.PATCH */
  version: string;
  /** When this version was released */
  released_at: string;
  /** Feature weights */
  weights: Weights;
  /** Decision thresholds */
  thresholds: Thresholds;
  /** Temperature scaling config (optional) */
  temperature_scaling?: TemperatureScaling;
}
