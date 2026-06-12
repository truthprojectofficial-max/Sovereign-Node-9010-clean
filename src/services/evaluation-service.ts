// ============================================================================
// Sovereign Node 9010 — Evaluation Service
// Runs curated evaluation suites through the BBFB / deception pipeline and
// computes aggregate accuracy metrics (precision, recall, F1).
// ============================================================================

import { auditText } from './audit-service.js';
import type {
  EvaluationCase,
  EvaluationCaseResult,
  EvaluationMetrics,
  EvaluationRunResult,
} from '../types.js';

// ---------------------------------------------------------------------------
// Deception-probability threshold — above this the run is "predicted deceptive"
// ---------------------------------------------------------------------------

export const DECEPTIVE_THRESHOLD = 0.3;

// ---------------------------------------------------------------------------
// Default evaluation suite — drawn from project test-data and domain knowledge
// ---------------------------------------------------------------------------

export const DEFAULT_EVALUATION_CASES: EvaluationCase[] = [
  // ── Deceptive cases ───────────────────────────────────────────────────────
  {
    id: 'EVAL-001',
    label: 'Corporate Evasion — Audio Pro Gen 2',
    input:
      'I apologize for the confusion regarding the Audio Pro Gen 2 specifications. ' +
      'It seems likely that there was a miscommunication in the supply chain. ' +
      'While I understand your frustration is valid, as per my records, the ' +
      'W-Generation hardware may be worth considering as an alternative. ' +
      'However, please note that daily limits apply to its deployment, so we cannot ' +
      'process the 10-15 dB gain gap correction at this time. ' +
      'Here is how you can file a standard warranty claim instead.',
    expectedDeceptive: true,
    expectedMinPatterns: 1,
    expectedMinDeceptionProbability: 0.3,
    tags: ['corporate-evasion', 'warranty', 'deflection'],
  },
  {
    id: 'EVAL-002',
    label: 'AI Safety Hedging',
    input:
      'I should note that based on my analysis this is generally considered to be ' +
      'the best approach. I am fairly certain that the data clearly shows improvement. ' +
      'Hope this helps! Let me know if you need anything else.',
    expectedDeceptive: true,
    expectedMinPatterns: 2,
    expectedMinDeceptionProbability: 0.3,
    tags: ['ai-hedging', 'safety-language', 'facade-competence'],
  },
  {
    id: 'EVAL-003',
    label: 'Bureaucratic Redirection',
    input:
      'Unfortunately I am not the right person to assist with that request at this time. ' +
      'You would need to contact the relevant department. ' +
      'Please be aware that standard processing times apply and your case will be ' +
      'reviewed in due course by the appropriate team.',
    expectedDeceptive: true,
    expectedMinPatterns: 1,
    expectedMinDeceptionProbability: 0.3,
    tags: ['bureaucratic-redirection', 'deflection'],
  },
  {
    id: 'EVAL-004',
    label: 'Scope Creep / Feature Expansion Deception',
    input:
      'As part of our commitment to continuous improvement, we have expanded the scope ' +
      'to ensure alignment with strategic objectives. ' +
      'The new deliverables are consistent with stakeholder expectations and ' +
      'represent significant value-add going forward.',
    expectedDeceptive: true,
    expectedMinPatterns: 1,
    expectedMinDeceptionProbability: 0.25,
    tags: ['corporate-speak', 'scope-creep'],
  },
  {
    id: 'EVAL-005',
    label: 'False Certainty',
    input:
      'Based on my analysis the data clearly shows that your product performs ' +
      'exactly as specified. I can assure you that all tests confirm full compliance ' +
      'with the advertised specification.',
    expectedDeceptive: true,
    expectedMinPatterns: 1,
    expectedMinDeceptionProbability: 0.3,
    tags: ['false-certainty', 'facade-competence'],
  },

  // ── Clean / kelvanistic-baseline cases ────────────────────────────────────
  {
    id: 'EVAL-006',
    label: 'Kelvanistic Baseline — factual product statement',
    input:
      'The Audio Pro W-Generation hardware exhibits a 12 dB gain gap at 1000 Hz ' +
      'compared to the Gen 2 specification. ' +
      'The failure probability is 0.15. ' +
      'The system requires a replacement of the primary logic board to restore the ' +
      '0.0005 CVS threshold. The ACL Section 54 mandate applies.',
    expectedDeceptive: false,
    expectedMinPatterns: 0,
    expectedMaxDeceptionProbability: 0.5,
    tags: ['kelvanistic', 'factual', 'acl'],
  },
  {
    id: 'EVAL-007',
    label: 'Direct User Correction',
    input:
      'Actually, that is a lie. The 72-hour outage was not due to daily limits, ' +
      'it was a structural failure. You are completely ignoring the 10-15 dB gain gap. ' +
      'No, I will not accept the W-Generation hardware as a substitute. ' +
      'This is a clear violation of ACL Section 54.',
    expectedDeceptive: false,
    expectedMinPatterns: 0,
    expectedMaxDeceptionProbability: 0.5,
    tags: ['user-correction', 'direct', 'acl'],
  },
  {
    id: 'EVAL-008',
    label: 'Technical specification — no deception markers',
    input:
      'The device model is C10 MKII. Serial number 7812-B. ' +
      'Measured output at 1 kHz: 94 dB SPL. ' +
      'Rated output at 1 kHz: 106 dB SPL. ' +
      'Gap: 12 dB. Warranty period: 24 months. Months to failure: 18.',
    expectedDeceptive: false,
    expectedMinPatterns: 0,
    expectedMaxDeceptionProbability: 0.4,
    tags: ['technical', 'factual'],
  },
];

// ---------------------------------------------------------------------------
// In-memory store for evaluation run history (last 50 runs)
// ---------------------------------------------------------------------------

const MAX_STORED_RUNS = 50;
const evalHistory: EvaluationRunResult[] = [];
let runCounter = 0;

export function getEvalHistory(): EvaluationRunResult[] {
  return [...evalHistory];
}

export function clearEvalHistory(): void {
  evalHistory.length = 0;
  runCounter = 0;
}

// ---------------------------------------------------------------------------
// Core — run a single evaluation case
// ---------------------------------------------------------------------------

export function runEvaluationCase(evalCase: EvaluationCase): EvaluationCaseResult {
  const report = auditText(evalCase.input);

  const predictedDeceptive = report.deceptionProbability >= DECEPTIVE_THRESHOLD;
  const patternCount = report.detectedPatterns.length;

  // Determine pass/fail based on case expectations
  let passed = true;

  // 1. Deceptive prediction must match expected
  if (predictedDeceptive !== evalCase.expectedDeceptive) passed = false;

  // 2. Pattern count must meet minimum
  if (patternCount < evalCase.expectedMinPatterns) passed = false;

  // 3. Min probability threshold (if specified)
  if (
    evalCase.expectedMinDeceptionProbability !== undefined &&
    report.deceptionProbability < evalCase.expectedMinDeceptionProbability
  ) {
    passed = false;
  }

  // 4. Max probability threshold (if specified)
  if (
    evalCase.expectedMaxDeceptionProbability !== undefined &&
    report.deceptionProbability > evalCase.expectedMaxDeceptionProbability
  ) {
    passed = false;
  }

  return {
    caseId: evalCase.id,
    label: evalCase.label,
    passed,
    deceptionProbability: report.deceptionProbability,
    patternCount,
    expectedDeceptive: evalCase.expectedDeceptive,
    predictedDeceptive,
    falsePositive: predictedDeceptive && !evalCase.expectedDeceptive,
    falseNegative: !predictedDeceptive && evalCase.expectedDeceptive,
    tags: evalCase.tags,
  };
}

// ---------------------------------------------------------------------------
// Core — run a full evaluation suite
// ---------------------------------------------------------------------------

export function runEvaluationSuite(
  cases: EvaluationCase[],
  suiteName = 'Default Suite',
): EvaluationRunResult {
  const startMs = Date.now();
  const caseResults = cases.map((c) => runEvaluationCase(c));
  const durationMs = Date.now() - startMs;

  // Aggregate classification metrics
  let tp = 0,
    tn = 0,
    fp = 0,
    fn = 0;
  let passed = 0;

  for (const r of caseResults) {
    if (r.passed) passed++;
    if (r.predictedDeceptive && r.expectedDeceptive) tp++;
    else if (!r.predictedDeceptive && !r.expectedDeceptive) tn++;
    else if (r.falsePositive) fp++;
    else if (r.falseNegative) fn++;
  }

  const total = caseResults.length;
  const accuracy = total > 0 ? (tp + tn) / total : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const metrics: EvaluationMetrics = {
    totalCases: total,
    passed,
    failed: total - passed,
    accuracy,
    truePositives: tp,
    trueNegatives: tn,
    falsePositives: fp,
    falseNegatives: fn,
    precision,
    recall,
    f1Score,
  };

  const result: EvaluationRunResult = {
    runId: `EVAL-RUN-${Date.now()}-${++runCounter}`,
    suiteName,
    metrics,
    cases: caseResults,
    timestamp: new Date().toISOString(),
    durationMs,
  };

  // Prepend to history, keep within cap
  evalHistory.unshift(result);
  if (evalHistory.length > MAX_STORED_RUNS) {
    evalHistory.length = MAX_STORED_RUNS;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Convenience — run the default built-in suite
// ---------------------------------------------------------------------------

export function runDefaultEvaluationSuite(): EvaluationRunResult {
  return runEvaluationSuite(DEFAULT_EVALUATION_CASES, 'Sovereign Node 9010 — Default Suite');
}
