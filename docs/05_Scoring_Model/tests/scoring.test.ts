/**
 * Jest tests for Scoring Model
 */

import {
  Decision,
  Features01,
  Candidate,
  Weights,
  Thresholds
} from "../code/types";

import {
  clamp01,
  computeRawScore,
  softmax,
  misclassificationProbability,
  decide,
  checkSafetyRules,
  scoreClusters
} from "../code/scoring";

describe("Scoring Model", () => {
  const defaultWeights: Weights = {
    w1: 0.3,
    w2: 0.3,
    w3: 0.2,
    w4: 0.2,
    default_bias: 0.0
  };

  const defaultThresholds: Thresholds = {
    auto: 0.15,
    escalate: 0.50
  };

  const mockCandidates: Candidate[] = [
    { id: "c1", label: "error_001" },
    { id: "c2", label: "error_002" }
  ];

  // Test 1: AUTO_RESOLVE with high confidence
  describe("AUTO_RESOLVE Decision", () => {
    it("should resolve when confidence is very high", () => {
      const features: Features01 = {
        ocr_confidence: 0.95,
        error_code_match: 0.90,
        cluster_prior: 0.85,
        rag_similarity: 0.88
      };

      const result = scoreClusters(
        mockCandidates,
        features,
        defaultWeights,
        defaultThresholds
      );

      expect(result.decision).toBe(Decision.AUTO_RESOLVE);
      expect(result.topProbability).toBeGreaterThan(0.75);
      expect(result.misclassificationProb).toBeLessThan(0.15);
      expect(result.topCandidate).toBeDefined();
    });

    it("should log all scores and probabilities for audit", () => {
      const features: Features01 = {
        ocr_confidence: 0.95,
        error_code_match: 0.90,
        cluster_prior: 0.85,
        rag_similarity: 0.88
      };

      const result = scoreClusters(
        mockCandidates,
        features,
        defaultWeights,
        defaultThresholds
      );

      expect(Object.keys(result.allScores)).toHaveLength(2);
      expect(Object.keys(result.allProbabilities)).toHaveLength(2);
      expect(mockCandidates.every(c => result.allScores[c.id] !== undefined)).toBe(
        true
      );
      expect(
        mockCandidates.every(c => result.allProbabilities[c.id] !== undefined)
      ).toBe(true);
    });
  });

  // Test 2: Safety rule - RAG miss
  describe("RAG Miss Safety Rule", () => {
    it("should escalate when rag_similarity is very low (≈ 0)", () => {
      const features: Features01 = {
        ocr_confidence: 0.95,
        error_code_match: 0.90,
        cluster_prior: 0.85,
        rag_similarity: 0.05 // RAG miss!
      };

      const result = scoreClusters(
        mockCandidates,
        features,
        defaultWeights,
        defaultThresholds
      );

      // Should escalate despite high confidence in other features
      expect(result.decision).toBe(Decision.ESCALATE);
      expect(result.safetyFlags.rag_miss).toBe(true);
    });

    it("should not escalate when rag_similarity >= 0.1", () => {
      const features: Features01 = {
        ocr_confidence: 0.95,
        error_code_match: 0.90,
        cluster_prior: 0.85,
        rag_similarity: 0.15 // Barely above threshold
      };

      const result = scoreClusters(
        mockCandidates,
        features,
        defaultWeights,
        defaultThresholds
      );

      expect(result.safetyFlags.rag_miss).toBeUndefined();
    });
  });

  // Test 3: Safety rule - UNKNOWN error code
  describe("Unknown Error Safety Rule", () => {
    it("should escalate when top candidate is UNKNOWN", () => {
      const candidates: Candidate[] = [
        { id: "c1", label: "UNKNOWN" },
        { id: "c2", label: "error_002" }
      ];

      const features: Features01 = {
        ocr_confidence: 0.95,
        error_code_match: 0.05, // Low because it's UNKNOWN
        cluster_prior: 0.50,
        rag_similarity: 0.50
      };

      const result = scoreClusters(
        candidates,
        features,
        defaultWeights,
        defaultThresholds
      );

      expect(result.decision).toBe(Decision.ESCALATE);
      expect(result.safetyFlags.unknown_error).toBe(true);
    });
  });

  // Test 4: ASK_CLARIFICATION for medium confidence
  describe("ASK_CLARIFICATION Decision", () => {
    it("should ask for clarification at medium confidence", () => {
      const features: Features01 = {
        ocr_confidence: 0.70,
        error_code_match: 0.65,
        cluster_prior: 0.60,
        rag_similarity: 0.55
      };

      const result = scoreClusters(
        mockCandidates,
        features,
        defaultWeights,
        defaultThresholds
      );

      expect(result.decision).toBe(Decision.ASK_CLARIFICATION);
      expect(result.misclassificationProb).toBeGreaterThanOrEqual(0.15);
      expect(result.misclassificationProb).toBeLessThan(0.50);
    });
  });

  // Test 5: Feature clamping
  describe("Feature Validation and Clamping", () => {
    it("should clamp out-of-range features to [0, 1]", () => {
      const features: Features01 = {
        ocr_confidence: 1.5, // Out of range
        error_code_match: -0.1, // Out of range
        cluster_prior: 0.5,
        rag_similarity: 0.8
      };

      const result = scoreClusters(
        mockCandidates,
        features,
        defaultWeights,
        defaultThresholds
      );

      // Should still produce a valid result
      expect(result.decision).toBeDefined();
      expect(result.topProbability).toBeGreaterThanOrEqual(0);
      expect(result.topProbability).toBeLessThanOrEqual(1);
    });
  });

  // Test 6: Softmax verification
  describe("Softmax", () => {
    it("should produce probabilities that sum to 1.0", () => {
      const scores = [0.5, 1.2, 0.1];
      const probs = softmax(scores);

      const sum = probs.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it("should produce probabilities in [0, 1] range", () => {
      const scores = [-10, 0, 10];
      const probs = softmax(scores);

      probs.forEach(p => {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      });
    });

    it("should handle single candidate", () => {
      const scores = [0.5];
      const probs = softmax(scores);

      expect(probs).toHaveLength(1);
      expect(probs[0]).toBeCloseTo(1.0);
    });
  });

  // Test 7: Misclassification probability
  describe("Misclassification Probability", () => {
    it("should compute as 1 - max(P_k)", () => {
      const probs = [0.7, 0.2, 0.1];
      const p_mis = misclassificationProbability(probs);

      expect(p_mis).toBeCloseTo(0.3); // 1 - 0.7
    });

    it("should be 0 when one probability is 1.0", () => {
      const probs = [1.0, 0.0, 0.0];
      const p_mis = misclassificationProbability(probs);

      expect(p_mis).toBeCloseTo(0.0);
    });

    it("should be 0.5 when all probabilities are 0.5", () => {
      const probs = [0.5, 0.5];
      const p_mis = misclassificationProbability(probs);

      expect(p_mis).toBeCloseTo(0.5);
    });
  });

  // Test 8: Raw score computation
  describe("computeRawScore", () => {
    it("should apply weights correctly", () => {
      const features: Features01 = {
        ocr_confidence: 1.0,
        error_code_match: 0.0,
        cluster_prior: 0.0,
        rag_similarity: 0.0
      };

      const weights: Weights = {
        w1: 0.3,
        w2: 0.2,
        w3: 0.1,
        w4: 0.4,
        default_bias: 0.0
      };

      const score = computeRawScore(features, weights, "test_label");

      // Should be 1.0 * 0.3 + 0 = 0.3
      expect(score).toBeCloseTo(0.3);
    });

    it("should apply candidate-specific bias", () => {
      const features: Features01 = {
        ocr_confidence: 0.5,
        error_code_match: 0.5,
        cluster_prior: 0.5,
        rag_similarity: 0.5
      };

      const weights: Weights = {
        w1: 0.25,
        w2: 0.25,
        w3: 0.25,
        w4: 0.25,
        default_bias: 0.0,
        per_candidate_biases: {
          error_001: 0.1,
          error_002: -0.1
        }
      };

      const score1 = computeRawScore(features, weights, "error_001");
      const score2 = computeRawScore(features, weights, "error_002");

      // score1 should be 0.5 + 0.1
      expect(score1).toBeCloseTo(0.6);
      // score2 should be 0.5 - 0.1
      expect(score2).toBeCloseTo(0.4);
    });
  });

  // Test 9: Clamp function
  describe("clamp01", () => {
    it("should clamp values to [0, 1]", () => {
      expect(clamp01(-0.5)).toBe(0);
      expect(clamp01(0.5)).toBe(0.5);
      expect(clamp01(1.5)).toBe(1);
    });
  });

  // Test 10: Decision logic
  describe("decide", () => {
    const thresholds: Thresholds = {
      auto: 0.15,
      escalate: 0.50
    };

    it("should return AUTO_RESOLVE when p_mis < threshold_auto", () => {
      const decision = decide(0.10, thresholds, {});
      expect(decision).toBe(Decision.AUTO_RESOLVE);
    });

    it("should return ASK_CLARIFICATION when threshold_auto <= p_mis < threshold_escalate", () => {
      const decision = decide(0.30, thresholds, {});
      expect(decision).toBe(Decision.ASK_CLARIFICATION);
    });

    it("should return ESCALATE when p_mis >= threshold_escalate", () => {
      const decision = decide(0.60, thresholds, {});
      expect(decision).toBe(Decision.ESCALATE);
    });

    it("should return ESCALATE if rag_miss flag is set", () => {
      const decision = decide(0.05, thresholds, { rag_miss: true });
      expect(decision).toBe(Decision.ESCALATE);
    });

    it("should return ESCALATE if unknown_error flag is set", () => {
      const decision = decide(0.05, thresholds, { unknown_error: true });
      expect(decision).toBe(Decision.ESCALATE);
    });
  });

  // Test 11: Safety rules
  describe("checkSafetyRules", () => {
    it("should flag RAG miss when rag_similarity < 0.1", () => {
      const features: Features01 = {
        ocr_confidence: 0.9,
        error_code_match: 0.9,
        cluster_prior: 0.9,
        rag_similarity: 0.05
      };

      const candidate: Candidate = { id: "c1", label: "error_001" };
      const flags = checkSafetyRules(features, candidate);

      expect(flags.rag_miss).toBe(true);
    });

    it("should flag unknown error when label is UNKNOWN", () => {
      const features: Features01 = {
        ocr_confidence: 0.9,
        error_code_match: 0.9,
        cluster_prior: 0.9,
        rag_similarity: 0.9
      };

      const candidate: Candidate = { id: "c1", label: "UNKNOWN" };
      const flags = checkSafetyRules(features, candidate);

      expect(flags.unknown_error).toBe(true);
    });

    it("should not flag safety issues when all conditions pass", () => {
      const features: Features01 = {
        ocr_confidence: 0.9,
        error_code_match: 0.9,
        cluster_prior: 0.9,
        rag_similarity: 0.5
      };

      const candidate: Candidate = { id: "c1", label: "error_001" };
      const flags = checkSafetyRules(features, candidate);

      expect(flags.rag_miss).toBeUndefined();
      expect(flags.unknown_error).toBeUndefined();
    });
  });

  // Test 12: Multiple candidates
  describe("Multiple Candidates", () => {
    it("should score all candidates independently", () => {
      const candidates: Candidate[] = [
        { id: "c1", label: "error_001" },
        { id: "c2", label: "error_002" },
        { id: "c3", label: "error_003" }
      ];

      const features: Features01 = {
        ocr_confidence: 0.8,
        error_code_match: 0.7,
        cluster_prior: 0.6,
        rag_similarity: 0.5
      };

      const result = scoreClusters(
        candidates,
        features,
        defaultWeights,
        defaultThresholds
      );

      expect(Object.keys(result.allScores)).toHaveLength(3);
      expect(Object.keys(result.allProbabilities)).toHaveLength(3);
    });
  });
});
