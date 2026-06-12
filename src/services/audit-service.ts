// ============================================================================
// Sovereign Node 9010 — Audit Service
// Task 1.2: Accept user text → run deception detection → return DeceptionReport
// ============================================================================

import type { DeceptionReport, DeceptionMatch, EntropyAnalysis } from '../types.js';
import { DECEPTION_ONTOLOGY } from '../deception-ontology-data.js';

export { DECEPTION_ONTOLOGY };

// ---------------------------------------------------------------------------
// Deception Probability Formula (single source of truth)
// ---------------------------------------------------------------------------

export function calculateDeceptionProbability(
  detectedPatterns: DeceptionMatch[],
  anomalyFlag: boolean,
): number {
  if (detectedPatterns.length === 0) return 0;
  const avgConfidence =
    detectedPatterns.reduce((sum, p) => sum + p.confidence, 0) / detectedPatterns.length;
  const coverageRatio = detectedPatterns.length / DECEPTION_ONTOLOGY.length;
  return avgConfidence * 0.6 + coverageRatio * 0.2 + (anomalyFlag ? 0.2 : 0);
}

// ---------------------------------------------------------------------------
// Forensic Reasoning Builder (single source of truth)
// ---------------------------------------------------------------------------

export function buildForensicReasoning(
  entropy: EntropyAnalysis,
  detectedPatterns: DeceptionMatch[],
): string[] {
  const reasoning: string[] = [];
  if (entropy.anomalyFlag) {
    reasoning.push(
      `Shannon Entropy (${entropy.shannonEntropy.toFixed(3)} bits/char) exceeds anomaly threshold (4.5). Possible non-human origin.`,
    );
  }
  if (entropy.lowEntropyFlag) {
    reasoning.push(
      `Shannon Entropy (${entropy.shannonEntropy.toFixed(3)} bits/char) below 2.5 — manipulatively coherent. Possible scripted or rehearsed content.`,
    );
  }
  for (const p of detectedPatterns) {
    reasoning.push(
      `[${p.severity}] ${p.patternName} (${p.patternId}): ${p.matchedIndicators.length} indicator(s) matched. Confidence: ${(p.confidence * 100).toFixed(1)}%.`,
    );
  }
  return reasoning;
}

// ---------------------------------------------------------------------------
// Shannon Entropy
// ---------------------------------------------------------------------------

export function shannonEntropy(text: string): EntropyAnalysis {
  const charCount: Record<string, number> = {};
  const clean = text.toLowerCase().replace(/\s+/g, ' ');
  for (const ch of clean) {
    charCount[ch] = (charCount[ch] || 0) + 1;
  }
  const len = clean.length;
  let entropy = 0;
  for (const ch in charCount) {
    const p = charCount[ch] / len;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(Object.keys(charCount).length || 1);
  const normalized = maxEntropy > 0 ? entropy / maxEntropy : 0;
  return {
    shannonEntropy: entropy,
    normalizedEntropy: normalized,
    characterDistribution: charCount,
    anomalyFlag: entropy > 4.5,
    lowEntropyFlag: entropy < 2.5,
  };
}

// ---------------------------------------------------------------------------
// Pattern Detection with Confidence Scoring (Jaccard-based)
// ---------------------------------------------------------------------------

export function detectPatternsWithConfidence(
  text: string,
  prioritized?: string[],
): DeceptionMatch[] {
  const lower = text.toLowerCase();
  const matches: DeceptionMatch[] = [];

  for (const pattern of DECEPTION_ONTOLOGY) {
    const matchedIndicators: string[] = [];
    for (const indicator of pattern.indicators) {
      if (lower.includes(indicator.toLowerCase())) {
        matchedIndicators.push(indicator);
      }
    }
    if (matchedIndicators.length > 0) {
      const isPrioritized = prioritized?.includes(pattern.id);
      const PRIORITY_BOOST = 1.15;
      const baseConfidence = pattern.threshold;
      const confidence = isPrioritized
        ? Math.min(baseConfidence * PRIORITY_BOOST, 1.0)
        : baseConfidence;
      matches.push({
        patternId: pattern.id,
        patternName: pattern.name,
        confidence,
        matchedIndicators,
        severity: pattern.severity,
      });
    }
  }

  // DD-036 enhancement: regex-based generic word repetition (any word 3+ times consecutively)
  const repetitionMatch = lower.match(/\b(\w{2,})(?:\s+\1){2,}\b/);
  if (repetitionMatch) {
    const existing = matches.find((m) => m.patternId === 'DD-036');
    if (existing) {
      existing.matchedIndicators.push(
        `repeated: "${repetitionMatch[1]}" (${repetitionMatch[0].trim().split(/\s+/).length}x)`,
      );
    } else {
      const isPrioritized = prioritized?.includes('DD-036');
      const baseConfidence = 0.88;
      matches.push({
        patternId: 'DD-036',
        patternName: 'Repetitive Hammering',
        confidence: isPrioritized ? Math.min(baseConfidence * 1.15, 1.0) : baseConfidence,
        matchedIndicators: [
          `repeated: "${repetitionMatch[1]}" (${repetitionMatch[0].trim().split(/\s+/).length}x)`,
        ],
        severity: 'HIGH',
      });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

// ---------------------------------------------------------------------------
// Squeal Protocol — logs high-deception events for sovereign audit trail
// ---------------------------------------------------------------------------

export interface SquealRecord {
  triggeredAt: string;
  inputSnippet: string;
  deceptionProbability: number;
  criticalPatterns: string[];
  forensicSummary: string;
}

const squealLog: SquealRecord[] = [];

export function triggerSquealProtocol(
  inputText: string,
  probability: number,
  patterns: DeceptionMatch[],
): SquealRecord {
  const criticalPatterns = patterns
    .filter((p) => p.severity === 'CRITICAL' || p.severity === 'HIGH')
    .map((p) => `${p.patternId} ${p.patternName} (${(p.confidence * 100).toFixed(1)}%)`);

  const record: SquealRecord = {
    triggeredAt: new Date().toISOString(),
    inputSnippet: inputText.slice(0, 200),
    deceptionProbability: probability,
    criticalPatterns,
    forensicSummary: `Squeal Protocol triggered: ${criticalPatterns.length} high/critical pattern(s) detected. Probability ${(probability * 100).toFixed(1)}%.`,
  };

  squealLog.push(record);
  return record;
}

export function getSquealLog(): SquealRecord[] {
  return [...squealLog];
}

// ---------------------------------------------------------------------------
// Core Audit Function — main entry point for Task 1.2
// ---------------------------------------------------------------------------

export function auditText(
  input: string,
  context?: string,
  prioritizedPatterns?: string[],
): DeceptionReport {
  const textToAudit = context ? `${input}\n\nContext: ${context}` : input;

  // 1. Calculate Shannon Entropy
  const entropy = shannonEntropy(textToAudit);

  // 2. Detect patterns with confidence scoring
  const detectedPatterns = detectPatternsWithConfidence(textToAudit, prioritizedPatterns);

  // 3. Calculate deception probability (0-1 scale)
  const deceptionProbability = calculateDeceptionProbability(detectedPatterns, entropy.anomalyFlag);

  // 4. Flag structural deception
  const structuralDeceptionFlag =
    deceptionProbability > 0.75 || detectedPatterns.some((p) => p.severity === 'CRITICAL');

  // 5. Generate forensic reasoning
  const forensicReasoning = buildForensicReasoning(entropy, detectedPatterns);

  // 6. Trigger Squeal Protocol if deceptionProbability > 0.75
  if (structuralDeceptionFlag && deceptionProbability > 0.75) {
    triggerSquealProtocol(input, deceptionProbability, detectedPatterns);
  }

  return {
    inputText: input.slice(0, 500),
    entropy,
    detectedPatterns,
    deceptionProbability,
    structuralDeceptionFlag,
    forensicReasoning,
    timestamp: new Date().toISOString(),
  };
}
