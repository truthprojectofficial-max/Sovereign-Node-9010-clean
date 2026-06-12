// ============================================================================
// Sovereign Node 9010 — Type Definitions
// Groknett ValueForge: TaaS Monolith v2.10.0
// ============================================================================

// --- BBFB Engine Types ---

export interface LAWGateInput {
  metric: string;
  value: number;
  threshold: number;
}

export interface LAWGateResult {
  metric: string;
  value: number;
  threshold: number;
  passed: boolean;
}

export interface GRACERiskInput {
  failureProbability: number;
  technicalDebt: number;
  complianceGap: number;
}

export interface GRACERiskResult {
  rawPenalty: number;
  normalizedPenalty: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface FRUITInput {
  criteria: {
    name: string;
    value: number;
    weight: number;
  }[];
}

export interface FRUITResult {
  compositeValueScore: number;
  weightedScores: { name: string; weighted: number }[];
  compliant: boolean;
  threshold: number;
}

export interface InputEvidence {
  metric: string;
  numerator: number;
  denominator: number;
  computedRatio: number;
}

export interface BBFBResult {
  inputEvidence: InputEvidence[];
  law: LAWGateResult[];
  grace: GRACERiskResult;
  fruit: FRUITResult;
  overallCompliant: boolean;
  timestamp: string;
}

// --- Deception Detection Engine Types ---

export interface DeceptionPattern {
  id: string;
  name: string;
  category: string;
  description: string;
  indicators: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threshold: number;
}

export interface DeceptionMatch {
  patternId: string;
  patternName: string;
  confidence: number;
  matchedIndicators: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface EntropyAnalysis {
  shannonEntropy: number;
  normalizedEntropy: number;
  characterDistribution: Record<string, number>;
  anomalyFlag: boolean;
  lowEntropyFlag?: boolean;
}

export interface DeceptionReport {
  inputText: string;
  entropy: EntropyAnalysis;
  detectedPatterns: DeceptionMatch[];
  deceptionProbability: number;
  structuralDeceptionFlag: boolean;
  forensicReasoning: string[];
  timestamp: string;
}

// --- Facts Registry Types ---

export interface Fact {
  id: number;
  category: 'Technical' | 'Governance' | 'Forensic';
  statement: string;
  source: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- API Types ---

export interface ProductEvidence {
  productName: string;
  pricePaid: number;
  priceAdvertised: number;
  specClaimed: number;
  specClaimedUnit: string;
  specMeasured: number;
  warrantyMonths: number;
  monthsToFailure: number;
  knownIssues: number;
  totalFeaturesOrParts: number;
  regulatoryRequirements: number;
  violationsFound: number;
  notes: string;
}

export interface CalculateRequest {
  evidence: ProductEvidence;
}

export interface RatioInput {
  numerator: number;
  denominator: number;
}

export interface AnalyzeRequest {
  text: string;
  prioritizedPatterns?: string[];
}

// --- UI State Types ---

export type TabId =
  | 'dashboard'
  | 'bbfb'
  | 'deception'
  | 'facts'
  | 'protocol'
  | 'discovery'
  | 'evaluation';

// --- Evaluation Framework Types ---

export interface EvaluationCase {
  id: string;
  label: string;
  input: string;
  expectedDeceptive: boolean;
  expectedMinPatterns: number;
  expectedMinDeceptionProbability?: number;
  expectedMaxDeceptionProbability?: number;
  tags: string[];
}

export interface EvaluationCaseResult {
  caseId: string;
  label: string;
  passed: boolean;
  deceptionProbability: number;
  patternCount: number;
  expectedDeceptive: boolean;
  predictedDeceptive: boolean;
  falsePositive: boolean;
  falseNegative: boolean;
  tags: string[];
}

export interface EvaluationMetrics {
  totalCases: number;
  passed: number;
  failed: number;
  accuracy: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface EvaluationRunResult {
  runId: string;
  suiteName: string;
  metrics: EvaluationMetrics;
  cases: EvaluationCaseResult[];
  timestamp: string;
  durationMs: number;
}

// --- Discovery Types ---

export interface DiscoveryDoc {
  filename: string;
  title: string;
  description: string;
}

export interface DiscoveryCategory {
  name: string;
  docs: DiscoveryDoc[];
}
