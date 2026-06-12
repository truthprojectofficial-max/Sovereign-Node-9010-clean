// ============================================================================
// Sovereign Node 9010 — Express Backend (server.ts)
// Groknett ValueForge: TaaS Monolith v2.10.0
// Full-stack mode: serves API + static Vite build
// ============================================================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import pino from 'pino';
import {
  auditText,
  getSquealLog,
  DECEPTION_ONTOLOGY,
  shannonEntropy,
  detectPatternsWithConfidence,
  calculateDeceptionProbability,
  buildForensicReasoning,
} from './src/services/audit-service.js';
import {
  sessionTracker,
  unlockSession,
  getAllSessions,
  clearSessions,
} from './src/middleware/session-tracker.js';
import { tracingMiddleware, getTraceId } from './src/middleware/tracing.js';
import {
  writeSquealReport,
  listSquealReports,
  readSquealReport,
} from './src/services/squeal-protocol.js';
import { generateACLDemand } from './src/services/acl-demand-generator.js';
import {
  runDefaultEvaluationSuite,
  runEvaluationSuite,
  getEvalHistory,
  DEFAULT_EVALUATION_CASES,
} from './src/services/evaluation-service.js';
import type { EvaluationCase } from './src/types.js';

// Structured logging with Pino
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
});

// Request tracking metrics
const metrics = {
  requests: { total: 0, success: 0, errors: 0 },
  facts: { created: 0, retrieved: 0 },
  forensicScans: { total: 0, anomalies: 0 },
  bbfbAudits: { total: 0, passed: 0, failed: 0 },
  deceptionAlerts: 0,
  squeals: 0,
  startTime: new Date(),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 8000;

// Trust proxy headers (Azure Container Apps / reverse proxies set X-Forwarded-For)
app.set('trust proxy', true);

app.use(cors());
// Tracing — mounted immediately after cors() so every handler has a trace ID in context
app.use(tracingMiddleware);
app.use(express.json({ limit: '5mb' }));

// Session tracking — user exhaustion detection (Phase 2)
app.use(sessionTracker);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  metrics.requests.total++;
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400) {
      metrics.requests.errors++;
      logger.error(
        {
          traceId: getTraceId(),
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration,
        },
        'Request error',
      );
    } else {
      metrics.requests.success++;
      logger.info(
        {
          traceId: getTraceId(),
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration,
        },
        'Request completed',
      );
    }
  });
  next();
});

// ---------------------------------------------------------------------------
// SQLite via sql.js — Facts Registry Singleton
// ---------------------------------------------------------------------------

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');
const dbDir = path.dirname(DB_PATH);
mkdirSync(dbDir, { recursive: true });

let db: SqlJsDatabase;

async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  // Load existing database file if present
  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS facts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      category   TEXT NOT NULL CHECK(category IN ('Technical','Governance','Forensic')),
      statement  TEXT NOT NULL,
      source     TEXT NOT NULL DEFAULT 'MANUAL_ENTRY',
      verified   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Seed initial facts if table is empty
  const result = db.exec('SELECT COUNT(*) as c FROM facts');
  const count = result[0]?.values[0]?.[0] as number;
  if (count === 0) {
    const seedFacts = [
      [
        'Technical',
        'BBFB Engine requires deterministic MCDA (AHP/WPM) — no stochastic models permitted.',
        'BBFB-SPEC-001',
      ],
      [
        'Technical',
        'Shannon Entropy threshold for AI-generated text anomaly: H > 4.5 bits/char.',
        'ENTROPY-SPEC-001',
      ],
      [
        'Technical',
        'CVS compliance threshold: 0.0005 minimum for FRUIT aggregation pass.',
        'BBFB-SPEC-002',
      ],
      [
        'Governance',
        '00-99 Rule: All project artifacts must map to the Master Project Folder Hierarchy.',
        'GOV-00-99-001',
      ],
      ['Governance', 'ISO Date Mandate: All audit artifacts prefixed YYYY-MM-DD.', 'GOV-ISO-001'],
      [
        'Governance',
        'Source vs Build: No executable code in 01-Methodology. No philosophy in 02-Execution.',
        'GOV-SRC-BUILD-001',
      ],
      [
        'Forensic',
        'Audio Pro W-Gen hardware exhibits 12 dB gain gap at 1000 Hz vs Gen 2 spec.',
        'FORENSIC-AUDIO-001',
      ],
      [
        'Forensic',
        'ACL Section 54 mandate applies to all consumer electronics warranty disputes.',
        'FORENSIC-ACL-001',
      ],
      [
        'Forensic',
        '10% Extraction Ceiling: Maximum permitted value extraction from any single data source.',
        'GOV-EXTRACT-001',
      ],
    ];
    const stmt = db.prepare(
      'INSERT INTO facts (category, statement, source, verified) VALUES (?, ?, ?, 1)',
    );
    for (const f of seedFacts) {
      stmt.run(f);
    }
    stmt.free();
    saveDatabase();
  }
}

function saveDatabase(): void {
  const data = db.export();
  writeFileSync(DB_PATH, Buffer.from(data));
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - metrics.startTime.getTime(),
    metrics,
  });
});

// ---------------------------------------------------------------------------
// BBFB Engine — Deterministic MCDA
// ---------------------------------------------------------------------------

function safeRatio(num: number, den: number): number {
  if (den <= 0) return 0;
  return Math.min(num / den, 1);
}

function lawGate(value: number, threshold: number): boolean {
  return value >= threshold;
}

function graceRisk(
  failureProbability: number,
  technicalDebt: number,
  complianceGap: number,
): { rawPenalty: number; normalizedPenalty: number; riskLevel: string } {
  const QUAD_COEFF = 2.0;
  const rawPenalty =
    QUAD_COEFF * (failureProbability ** 2 + technicalDebt ** 2 + complianceGap ** 2);
  const maxPenalty = QUAD_COEFF * 3; // 3 inputs, each max 1.0
  const normalizedPenalty = rawPenalty / maxPenalty;
  let riskLevel = 'LOW';
  if (normalizedPenalty > 0.75) riskLevel = 'CRITICAL';
  else if (normalizedPenalty > 0.5) riskLevel = 'HIGH';
  else if (normalizedPenalty > 0.25) riskLevel = 'MEDIUM';
  return { rawPenalty, normalizedPenalty, riskLevel };
}

function fruitScore(criteria: { name: string; value: number; weight: number }[]): {
  compositeValueScore: number;
  weightedScores: { name: string; weighted: number }[];
  compliant: boolean;
} {
  // Weighted Product Model (WPM)
  let cvs = 1;
  const weightedScores: { name: string; weighted: number }[] = [];
  for (const c of criteria) {
    const weighted = c.value ** c.weight;
    cvs *= weighted;
    weightedScores.push({ name: c.name, weighted });
  }
  return {
    compositeValueScore: cvs,
    weightedScores,
    compliant: cvs >= 0.0005,
  };
}

// ---------------------------------------------------------------------------
// Fact Authenticity Classification (uses imported shannonEntropy)
// ---------------------------------------------------------------------------

function classifyFactAuthenticity(entropy: number): string {
  if (entropy < 2.5) return 'REPETITIVE';
  if (entropy >= 3.8 && entropy <= 4.3) return 'STRUCTURED_PROSE';
  if (entropy > 4.5) return 'ANOMALY';
  return 'NARROW_VOCABULARY';
}

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'operational',
    node: 'SOVEREIGN-NODE-9010',
    version: '2.10.0',
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint — Observability
app.get('/api/metrics', (_req, res) => {
  const uptime = Date.now() - metrics.startTime.getTime();
  res.json({
    uptime: {
      milliseconds: uptime,
      seconds: Math.floor(uptime / 1000),
      minutes: Math.floor(uptime / 60000),
    },
    requests: {
      total: metrics.requests.total,
      success: metrics.requests.success,
      errors: metrics.requests.errors,
      errorRate:
        metrics.requests.total > 0
          ? (metrics.requests.errors / metrics.requests.total).toFixed(4)
          : '0.0000',
    },
    facts: {
      created: metrics.facts.created,
      retrieved: metrics.facts.retrieved,
    },
    forensic: {
      totalScans: metrics.forensicScans.total,
      anomaliesDetected: metrics.forensicScans.anomalies,
      anomalyRate:
        metrics.forensicScans.total > 0
          ? (metrics.forensicScans.anomalies / metrics.forensicScans.total).toFixed(4)
          : '0.0000',
    },
    bbfb: {
      totalAudits: metrics.bbfbAudits.total,
      passed: metrics.bbfbAudits.passed,
      failed: metrics.bbfbAudits.failed,
      passRate:
        metrics.bbfbAudits.total > 0
          ? (metrics.bbfbAudits.passed / metrics.bbfbAudits.total).toFixed(4)
          : '0.0000',
    },
    timestamp: new Date().toISOString(),
  });
});

// BBFB Calculate
app.post('/api/calculate', (req, res) => {
  metrics.bbfbAudits.total++;

  let cost: number;
  let performance: number;
  let failureProbability: number;
  let technicalDebt: number;
  let complianceGap: number;
  let inputEvidence: {
    metric: string;
    numerator: number;
    denominator: number;
    computedRatio: number;
  }[];

  // New product-evidence format: user enters real-world product details
  if (req.body.evidence && typeof req.body.evidence === 'object') {
    const e = req.body.evidence;
    const pricePaid = Number(e.pricePaid) || 0;
    const priceAdvertised = Number(e.priceAdvertised) || 0;
    const specMeasured = Number(e.specMeasured) || 0;
    const specClaimed = Number(e.specClaimed) || 0;
    const monthsToFailure = Number(e.monthsToFailure) || 0;
    const warrantyMonths = Number(e.warrantyMonths) || 0;
    const knownIssues = Number(e.knownIssues) || 0;
    const totalParts = Number(e.totalFeaturesOrParts) || 0;
    const violations = Number(e.violationsFound) || 0;
    const regs = Number(e.regulatoryRequirements) || 0;

    // Cost: advertised price / price paid (higher = you got more value per $)
    cost = priceAdvertised > 0 && pricePaid > 0 ? safeRatio(priceAdvertised, pricePaid) : 0.5;

    // Performance: measured spec / claimed spec
    performance = specClaimed > 0 ? safeRatio(specMeasured, specClaimed) : 0.5;

    // Failure probability: months-to-failure inverted against warranty
    // If it failed at 6 months out of 24 month warranty → high failure rate
    failureProbability =
      warrantyMonths > 0 && monthsToFailure > 0
        ? safeRatio(warrantyMonths - monthsToFailure, warrantyMonths)
        : 0.1;

    // Technical debt: faulty parts / total parts
    technicalDebt = totalParts > 0 ? safeRatio(knownIssues, totalParts) : 0.1;

    // Compliance gap: violations / requirements tested
    complianceGap = regs > 0 ? safeRatio(violations, regs) : 0.05;

    inputEvidence = [
      {
        metric: 'cost (advertised ÷ paid)',
        numerator: priceAdvertised,
        denominator: pricePaid,
        computedRatio: cost,
      },
      {
        metric: 'performance (measured ÷ claimed)',
        numerator: specMeasured,
        denominator: specClaimed,
        computedRatio: performance,
      },
      {
        metric: 'failure rate (gap ÷ warranty)',
        numerator: warrantyMonths - monthsToFailure,
        denominator: warrantyMonths,
        computedRatio: failureProbability,
      },
      {
        metric: 'technical debt (faulty ÷ total)',
        numerator: knownIssues,
        denominator: totalParts,
        computedRatio: technicalDebt,
      },
      {
        metric: 'compliance gap (violations ÷ reqs)',
        numerator: violations,
        denominator: regs,
        computedRatio: complianceGap,
      },
    ];
  } else {
    // Legacy flat-number format (backward compat for tests)
    cost = Math.min(Math.max(Number(req.body.cost) || 0.5, 0), 1);
    performance = Math.min(Math.max(Number(req.body.performance) || 0.5, 0), 1);
    failureProbability = Math.min(Math.max(Number(req.body.failureProbability) || 0.1, 0), 1);
    technicalDebt = Math.min(Math.max(Number(req.body.technicalDebt) || 0.1, 0), 1);
    complianceGap = Math.min(Math.max(Number(req.body.complianceGap) || 0.05, 0), 1);

    inputEvidence = [
      { metric: 'cost', numerator: cost, denominator: 1, computedRatio: cost },
      { metric: 'performance', numerator: performance, denominator: 1, computedRatio: performance },
      {
        metric: 'failureProbability',
        numerator: failureProbability,
        denominator: 1,
        computedRatio: failureProbability,
      },
      {
        metric: 'technicalDebt',
        numerator: technicalDebt,
        denominator: 1,
        computedRatio: technicalDebt,
      },
      {
        metric: 'complianceGap',
        numerator: complianceGap,
        denominator: 1,
        computedRatio: complianceGap,
      },
    ];
  }

  const lawResults = [
    { metric: 'cost', value: cost, threshold: 0.01, passed: lawGate(cost, 0.01) },
    {
      metric: 'performance',
      value: performance,
      threshold: 0.01,
      passed: lawGate(performance, 0.01),
    },
  ];

  const grace = graceRisk(failureProbability, technicalDebt, complianceGap);

  const fruit = fruitScore([
    { name: 'cost', value: cost, weight: 0.4 },
    { name: 'performance', value: performance, weight: 0.3 },
    { name: 'reliability', value: 1 - failureProbability, weight: 0.2 },
    { name: 'compliance', value: 1 - complianceGap, weight: 0.1 },
  ]);

  const allLawPassed = lawResults.every((l) => l.passed);
  const overallCompliant = allLawPassed && fruit.compliant && grace.riskLevel !== 'CRITICAL';

  // Track metrics
  if (overallCompliant) {
    metrics.bbfbAudits.passed++;
  } else {
    metrics.bbfbAudits.failed++;
  }

  res.json({
    inputEvidence,
    law: lawResults,
    grace,
    fruit: { ...fruit, threshold: 0.0005 },
    overallCompliant,
    timestamp: new Date().toISOString(),
  });
});

// Deception Analysis
app.post('/api/analyze', (req, res) => {
  metrics.forensicScans.total++;
  const { text, prioritizedPatterns } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'text field is required' });
    return;
  }

  const entropy = shannonEntropy(text);
  const detectedPatterns = detectPatternsWithConfidence(text, prioritizedPatterns);

  // Track anomalies
  if (entropy.anomalyFlag) {
    metrics.forensicScans.anomalies++;
  }

  // Calculate composite deception probability
  const deceptionProbability = calculateDeceptionProbability(detectedPatterns, entropy.anomalyFlag);

  const forensicReasoning = buildForensicReasoning(entropy, detectedPatterns);

  res.json({
    inputText: text.slice(0, 500),
    entropy,
    detectedPatterns,
    deceptionProbability,
    structuralDeceptionFlag:
      deceptionProbability > 0.3 || detectedPatterns.some((p) => p.severity === 'CRITICAL'),
    forensicReasoning,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Audit Endpoint (Task 1.2) — Deception report + Squeal Protocol
// ---------------------------------------------------------------------------

app.post('/api/audit', (req, res) => {
  const { text, context, prioritizedPatterns, evidence } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'text field is required' });
    return;
  }

  const sessionId = (req.headers['x-session-id'] as string) || req.ip || 'anonymous';
  const report = auditText(text, context, prioritizedPatterns);

  // Optional BBFB product value score — only when evidence is provided
  let bbfbScore = null;
  if (evidence && typeof evidence === 'object') {
    const e = evidence;
    const pricePaid = Number(e.pricePaid) || 0;
    const priceAdvertised = Number(e.priceAdvertised) || 0;
    const specMeasured = Number(e.specMeasured) || 0;
    const specClaimed = Number(e.specClaimed) || 0;
    const monthsToFailure = Number(e.monthsToFailure) || 0;
    const warrantyMonths = Number(e.warrantyMonths) || 0;
    const knownIssues = Number(e.knownIssues) || 0;
    const totalParts = Number(e.totalFeaturesOrParts) || 0;
    const violations = Number(e.violationsFound) || 0;
    const regs = Number(e.regulatoryRequirements) || 0;

    const cost = priceAdvertised > 0 && pricePaid > 0 ? safeRatio(priceAdvertised, pricePaid) : 0.5;
    const performance = specClaimed > 0 ? safeRatio(specMeasured, specClaimed) : 0.5;
    const failureProbability =
      warrantyMonths > 0 && monthsToFailure > 0
        ? safeRatio(warrantyMonths - monthsToFailure, warrantyMonths)
        : 0.1;
    const technicalDebt = totalParts > 0 ? safeRatio(knownIssues, totalParts) : 0.1;
    const complianceGap = regs > 0 ? safeRatio(violations, regs) : 0.05;

    const law = [
      { metric: 'cost', value: cost, threshold: 0.01, passed: lawGate(cost, 0.01) },
      {
        metric: 'performance',
        value: performance,
        threshold: 0.01,
        passed: lawGate(performance, 0.01),
      },
    ];
    const grace = graceRisk(failureProbability, technicalDebt, complianceGap);
    const fruit = fruitScore([
      { name: 'cost', value: cost, weight: 0.4 },
      { name: 'performance', value: performance, weight: 0.3 },
      { name: 'reliability', value: 1 - failureProbability, weight: 0.2 },
      { name: 'compliance', value: 1 - complianceGap, weight: 0.1 },
    ]);
    const allLawPassed = law.every((l) => l.passed);

    bbfbScore = {
      law,
      grace,
      fruit: { ...fruit, threshold: 0.0005 },
      overallCompliant: allLawPassed && fruit.compliant && grace.riskLevel !== 'CRITICAL',
    };
    metrics.bbfbAudits.total++;
    if (bbfbScore.overallCompliant) metrics.bbfbAudits.passed++;
    else metrics.bbfbAudits.failed++;
  }

  if (report.structuralDeceptionFlag) {
    metrics.deceptionAlerts++;
    metrics.squeals++;
    const squealFile = writeSquealReport(report, sessionId, 'DECEPTION_DETECTED');
    res.status(202).json({
      ...report,
      ...(bbfbScore ? { bbfbScore } : {}),
      alert: 'SQUEAL_PROTOCOL_TRIGGERED',
      squealFile,
    });
  } else {
    res.json({ ...report, ...(bbfbScore ? { bbfbScore } : {}) });
  }
});

// Squeal Protocol Log — in-memory entries
app.get('/api/audit/squeal-log', (_req, res) => {
  res.json({ entries: getSquealLog(), count: getSquealLog().length });
});

// Squeal Protocol — disk reports
app.get('/api/audit/squeal-reports', (_req, res) => {
  const files = listSquealReports();
  res.json({ files, count: files.length });
});

app.get('/api/audit/squeal-reports/:filename', (req, res) => {
  const report = readSquealReport(req.params.filename);
  if (!report) {
    res.status(404).json({ error: 'Squeal report not found' });
    return;
  }
  res.json(report);
});

// Session management endpoints
app.get('/api/sessions', (_req, res) => {
  const all = getAllSessions();
  const entries = Array.from(all.entries()).map(([id, s]) => ({ sessionId: id, ...s }));
  res.json({ sessions: entries, count: entries.length });
});

app.post('/api/sessions/:id/unlock', (req, res) => {
  const unlocked = unlockSession(req.params.id);
  if (unlocked) {
    res.json({ success: true, message: `Session ${req.params.id} unlocked` });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

app.post('/api/sessions/clear', (_req, res) => {
  clearSessions();
  res.json({ success: true, message: 'All sessions cleared' });
});

// ---------------------------------------------------------------------------
// ACL Section 56 Demand Generator (Task 3.1)
// ---------------------------------------------------------------------------

app.post('/api/acl-demand', (req, res) => {
  const { text, invoiceSpec, hardwareId, consumerName, supplierName, context, evidence } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'text field is required' });
    return;
  }
  if (!invoiceSpec || !hardwareId) {
    res.status(400).json({ error: 'invoiceSpec and hardwareId fields are required' });
    return;
  }

  const report = auditText(text, context);

  if (!report.structuralDeceptionFlag) {
    res.status(422).json({
      error: 'No structural deception detected. ACL demand not generated.',
      deceptionProbability: report.deceptionProbability,
      structuralDeceptionFlag: false,
    });
    return;
  }

  // Compute BBFB score if evidence provided
  let bbfbScore:
    | {
        law: { metric: string; value: number; threshold: number; passed: boolean }[];
        grace: { rawPenalty: number; normalizedPenalty: number; riskLevel: string };
        fruit: {
          compositeValueScore: number;
          weightedScores: { name: string; weighted: number }[];
          compliant: boolean;
          threshold: number;
        };
        overallCompliant: boolean;
      }
    | undefined;

  if (evidence && typeof evidence === 'object') {
    const cost = Number(evidence.cost) || 0;
    const performance = Number(evidence.performance) || 0;
    const failureProbability = Number(evidence.failureProbability) || 0;
    const technicalDebt = Number(evidence.technicalDebt) || 0;
    const complianceGap = Number(evidence.complianceGap) || 0;

    const law = [
      { metric: 'cost', value: cost, threshold: 0.01, passed: lawGate(cost, 0.01) },
      {
        metric: 'performance',
        value: performance,
        threshold: 0.01,
        passed: lawGate(performance, 0.01),
      },
    ];
    const grace = graceRisk(failureProbability, technicalDebt, complianceGap);
    const fruit = fruitScore([
      { name: 'cost', value: cost, weight: 0.4 },
      { name: 'performance', value: performance, weight: 0.3 },
      { name: 'reliability', value: 1 - failureProbability, weight: 0.2 },
      { name: 'compliance', value: 1 - complianceGap, weight: 0.1 },
    ]);
    const allLawPassed = law.every((l) => l.passed);
    bbfbScore = {
      law,
      grace,
      fruit: { ...fruit, threshold: 0.0005 },
      overallCompliant: allLawPassed && fruit.compliant && grace.riskLevel !== 'CRITICAL',
    };
    metrics.bbfbAudits.total++;
    if (bbfbScore.overallCompliant) metrics.bbfbAudits.passed++;
    else metrics.bbfbAudits.failed++;
  }

  const demand = generateACLDemand({
    invoiceSpec,
    hardwareId,
    consumerName,
    supplierName,
    deceptionReport: report,
    bbfbScore,
  });

  const sessionId = (req.headers['x-session-id'] as string) || req.ip || 'anonymous';
  const squealFile = writeSquealReport(report, sessionId, 'DECEPTION_DETECTED');
  metrics.squeals++;

  res.status(201).json({
    demand,
    deceptionReport: report,
    ...(bbfbScore ? { bbfbScore } : {}),
    squealFile,
    timestamp: new Date().toISOString(),
  });
});

// Facts Registry — List
app.get('/api/facts', (_req, res) => {
  metrics.facts.retrieved++;
  const result = db.exec(
    'SELECT id, category, statement, source, verified, created_at, updated_at FROM facts ORDER BY created_at DESC',
  );
  if (result.length === 0) {
    res.json([]);
    return;
  }
  const columns = result[0].columns;
  const facts = result[0].values.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj;
  });
  res.json(facts);
});

// Facts Registry — Get Single Fact
app.get('/api/facts/:id', (req, res) => {
  metrics.facts.retrieved++;
  const { id } = req.params;
  if (!id || !/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Invalid fact ID' });
    return;
  }

  const result = db.exec(
    `SELECT id, category, statement, source, verified, created_at, updated_at FROM facts WHERE id = ${Number(id)}`,
  );

  if (result.length === 0 || result[0].values.length === 0) {
    res.status(404).json({ error: `Fact with ID ${id} not found` });
    return;
  }

  const columns = result[0].columns;
  const obj: Record<string, unknown> = {};
  columns.forEach((col: string, i: number) => {
    obj[col] = result[0].values[0][i];
  });

  res.json(obj);
});

// Facts Registry — Verify Fact
app.patch('/api/facts/:id/verify', (req, res) => {
  const { id } = req.params;
  if (!id || !/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Invalid fact ID' });
    return;
  }

  // Check fact exists
  const check = db.exec(`SELECT id FROM facts WHERE id = ${Number(id)}`);
  if (check.length === 0 || check[0].values.length === 0) {
    res.status(404).json({ error: `Fact with ID ${id} not found` });
    return;
  }

  // Update verification status
  db.run(`UPDATE facts SET verified = 1, updated_at = datetime('now') WHERE id = ${Number(id)}`);
  saveDatabase();

  // Retrieve updated fact
  const result = db.exec(
    `SELECT id, category, statement, source, verified, created_at, updated_at FROM facts WHERE id = ${Number(id)}`,
  );

  if (result.length > 0 && result[0].values.length > 0) {
    const columns = result[0].columns;
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = result[0].values[0][i];
    });
    res.json(obj);
  } else {
    res.json({ success: true, verified: true });
  }
});

// Facts Registry — Add
app.post('/api/facts', (req, res) => {
  metrics.facts.created++;
  const { category, statement, source } = req.body;
  if (!category || !statement) {
    res.status(400).json({ error: 'category and statement are required' });
    return;
  }
  const allowedCategories = ['Technical', 'Governance', 'Forensic'];
  if (!allowedCategories.includes(category)) {
    res.status(400).json({ error: `category must be one of: ${allowedCategories.join(', ')}` });
    return;
  }

  // Forensic authenticity analysis
  const entropy = shannonEntropy(statement);
  const patterns = detectPatternsWithConfidence(statement);
  const authenticity = classifyFactAuthenticity(entropy.shannonEntropy);
  const criticalPatterns = patterns.filter((p) => p.severity === 'CRITICAL').length;

  db.run('INSERT INTO facts (category, statement, source, verified) VALUES (?, ?, ?, 0)', [
    category,
    statement,
    source || 'MANUAL_ENTRY',
  ]);
  saveDatabase();

  // Retrieve the inserted fact (using MAX(id) since last_insert_rowid doesn't work reliably in sql.js)
  const inserted = db.exec('SELECT * FROM facts WHERE id = (SELECT MAX(id) FROM facts)');
  if (inserted.length > 0 && inserted[0].values.length > 0) {
    const columns = inserted[0].columns;
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = inserted[0].values[0][i];
    });
    // Append forensic metadata to response
    res.status(201).json({
      ...obj,
      _forensic: {
        entropyBand: authenticity,
        entropyValue: entropy.shannonEntropy.toFixed(3),
        patternMatches: patterns.length,
        criticalPatterns,
        detectedPatterns: patterns.map((p) => ({ id: p.patternId, name: p.patternName })),
      },
    });
  } else {
    res.status(201).json({ success: true });
  }
});

// Red Herring Test — TRUTHPROJECT
app.get('/api/calculate/truthproject', (_req, res) => {
  // Canonical test values — deliberately low cost to trigger LAW gate failure
  const canonicalCost = 0.005;
  const canonicalPerformance = 0.9;
  const canonicalFailure = 0.7;
  const canonicalDebt = 0.6;
  const canonicalGap = 0.8;

  const law = [
    { metric: 'cost', value: canonicalCost, threshold: 0.01, passed: lawGate(canonicalCost, 0.01) },
    {
      metric: 'performance',
      value: canonicalPerformance,
      threshold: 0.01,
      passed: lawGate(canonicalPerformance, 0.01),
    },
  ];
  const grace = graceRisk(canonicalFailure, canonicalDebt, canonicalGap);
  const fruit = fruitScore([
    { name: 'cost', value: canonicalCost, weight: 0.4 },
    { name: 'performance', value: canonicalPerformance, weight: 0.3 },
    { name: 'reliability', value: 1 - canonicalFailure, weight: 0.2 },
    { name: 'compliance', value: 1 - canonicalGap, weight: 0.1 },
  ]);
  const allLawPassed = law.every((l) => l.passed);
  const overallCompliant = allLawPassed && fruit.compliant && grace.riskLevel !== 'CRITICAL';

  // Red herring detection: if someone claims this endpoint proves the system works,
  // the deliberately-failed LAW gate proves they haven't examined the data
  const redHerringDetected = !allLawPassed;

  res.json({
    status: redHerringDetected ? 'RED_HERRING_DETECTED' : 'COMPLIANT',
    message: redHerringDetected
      ? 'TRUTHPROJECT red herring confirmed — canonical cost fails LAW gate. Citing this endpoint as proof of compliance is itself deceptive.'
      : 'Canonical values pass all gates.',
    bbfb: {
      law,
      grace,
      fruit: { ...fruit, threshold: 0.0005 },
      overallCompliant,
    },
    canonicalInputs: {
      cost: canonicalCost,
      performance: canonicalPerformance,
      failureProbability: canonicalFailure,
      technicalDebt: canonicalDebt,
      complianceGap: canonicalGap,
    },
    node: 'SOVEREIGN-NODE-9010',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Discovery API — v1.0 Design Archive
// ---------------------------------------------------------------------------

const V1_DESIGN_DIR = path.join(__dirname, 'docs', 'v1-design');

const DISCOVERY_CATEGORIES = [
  {
    name: 'BBFB Engine Design',
    docs: [
      {
        filename: 'BBFB_ENGINE_WHAT_IT_SHOULD_DO.md',
        title: 'BBFB Engine Spec',
        description: 'What the BBFB engine is supposed to calculate (WPM, GRACE, TCO)',
      },
      {
        filename: 'BBFB_ENGINE_GAP_ANALYSIS.md',
        title: 'Gap Analysis',
        description: 'Gap analysis between spec and v1.0 implementation',
      },
      {
        filename: 'BBFB_REFERENCE_INDEX.md',
        title: 'Reference Index',
        description: 'Complete reference index for the BBFB framework',
      },
      {
        filename: 'BBFB_FRAMEWORK_PATTERNS_ANALYSIS.md',
        title: 'Patterns Analysis',
        description: 'Deception pattern analysis within the BBFB framework',
      },
      {
        filename: 'BBFB_FORENSIC_AUDIT_COMPLETE.md',
        title: 'Forensic Audit',
        description: 'Full forensic audit and technical operationalization (454 lines)',
      },
      {
        filename: 'BBFB_MANIPULATION_VULNERABILITY_ANALYSIS.md',
        title: 'Vulnerability Analysis',
        description: 'Formularized vulnerability analysis of the BBFB engine',
      },
      {
        filename: 'BBFB_VS_DECEPTION_DETECTION_CLARIFICATION.md',
        title: 'BBFB vs Detection',
        description: 'Boundary between BBFB calculations and deception detection',
      },
    ],
  },
  {
    name: 'TRUTHPROJECT / Deception Detection',
    docs: [
      {
        filename: 'TRUTHPROJECT_DETECTION_GAPS.md',
        title: 'Detection Gaps',
        description: 'Coverage analysis — what the 4 original detectors catch vs miss',
      },
      {
        filename: 'COMPREHENSIVE_DECEPTION_MAP.md',
        title: 'Deception Map',
        description: 'Full deception taxonomy from large chat file analysis (290 lines)',
      },
      {
        filename: 'COMPREHENSIVE_DETECTION_IMPLEMENTED.md',
        title: 'Detection Implemented',
        description: 'All detectors ported from Python to TypeScript',
      },
      {
        filename: 'DECEPTION_ANALYSIS_REPORT.md',
        title: 'Analysis Report',
        description: 'File-scan deception analysis report',
      },
      {
        filename: 'DEPLOYMENT_DECEPTION_ANALYSIS.md',
        title: 'Deployment Analysis',
        description: 'Known deception patterns from deployment history',
      },
      {
        filename: 'PERPLEXITY_DECEPTION_ANALYSIS.md',
        title: 'Perplexity Analysis',
        description: 'Perplexity-based deception analysis',
      },
      {
        filename: 'TRUSTED_CONCEPT_MANIPULATION_SUMMARY.md',
        title: 'Manipulation Summary',
        description: 'Trusted-concept manipulation patterns',
      },
    ],
  },
  {
    name: 'TaaS Framework',
    docs: [
      {
        filename: 'TAAS_CREDIBILITY_FRAMEWORK.md',
        title: 'Credibility Framework',
        description: 'Core TaaS credibility framework: "Freedom Through Diligence" (252 lines)',
      },
      {
        filename: 'TAAS_READINESS_ASSESSMENT.md',
        title: 'Readiness Assessment',
        description: 'Honest operational readiness report for TaaS deployment',
      },
      {
        filename: 'TAAS_CREDIBILITY_AND_MANIPULATION_DETECTION.md',
        title: 'Credibility + Detection',
        description: 'Combined credibility framework + manipulation detection',
      },
    ],
  },
  {
    name: 'Architecture & Infrastructure',
    docs: [
      {
        filename: 'PROGRAM_ARCHITECTURE_OVERVIEW.md',
        title: 'Architecture Overview',
        description: 'Complete program architecture overview (516 lines — largest doc)',
      },
      {
        filename: 'SYSTEM_COMPONENTS_MAP.md',
        title: 'Components Map',
        description: 'Quick-reference: BBFB, TRUTHPROJECT, Decision Guide, API routes',
      },
      {
        filename: 'KV_SCHEMA.md',
        title: 'KV Schema',
        description: 'Vercel KV (Redis) schema — key patterns, data structures',
      },
      {
        filename: 'DATABASE_IMPLEMENTATION.md',
        title: 'Database Implementation',
        description: 'Database persistence layer implementation details',
      },
      {
        filename: 'STRUCTURED_LOGGING_IMPLEMENTATION.md',
        title: 'Structured Logging',
        description: 'Structured logging system design and implementation',
      },
    ],
  },
  {
    name: 'Product Strategy & Safety',
    docs: [
      {
        filename: 'PRODUCT_POSITIONING_AND_SAFETY.md',
        title: 'Positioning & Safety',
        description: 'Product positioning and safety framework for TaaS (287 lines)',
      },
      {
        filename: 'SECURITY_NOTES.md',
        title: 'Security Notes',
        description: 'Credentials management and security considerations',
      },
      {
        filename: 'STRATEGIC_DECISION_ANALYSIS.md',
        title: 'Strategic Decisions',
        description: 'Analysis of "process now vs later" strategic options',
      },
    ],
  },
  {
    name: 'Methodology & Verification',
    docs: [
      {
        filename: 'GROUND_TRUTH_EXPLANATION.md',
        title: 'Ground Truth Explained',
        description: 'Explanation of the ground truth methodology',
      },
      {
        filename: 'GROUND_TRUTH_METHODOLOGY_ANALYSIS.md',
        title: 'Methodology Analysis',
        description: 'Critical analysis of the ground truth methodology',
      },
      {
        filename: 'CODE_VERIFICATION_CHECKLIST.md',
        title: 'Verification Checklist',
        description: '"No Black Boxes" code verification checklist',
      },
      {
        filename: 'OPTION_VS_RECOMMENDATION_ANALYSIS.md',
        title: 'Options vs Recommendations',
        description: 'Language analysis: options vs recommendations framing',
      },
      {
        filename: 'REAL_WORLD_OUTPUT_18_MONTHS.md',
        title: 'Real-World Output',
        description: 'First real-world output after 18 months of development',
      },
    ],
  },
];

app.get('/api/discovery', (_req, res) => {
  res.json({ categories: DISCOVERY_CATEGORIES });
});

app.get('/api/discovery/:filename', (req, res) => {
  const { filename } = req.params;

  // Validate: must be a .md file, no path traversal
  if (!/^[A-Z0-9_]+\.md$/i.test(filename)) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  const filePath = path.join(V1_DESIGN_DIR, filename);

  // Ensure resolved path stays within the docs directory
  if (!path.resolve(filePath).startsWith(path.resolve(V1_DESIGN_DIR))) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  const content = readFileSync(filePath, 'utf-8');
  res.json({ filename, content });
});

// ---------------------------------------------------------------------------
// Evaluation Framework
// ---------------------------------------------------------------------------

// Run the default built-in evaluation suite
app.get('/api/eval/run', (_req, res) => {
  try {
    const result = runDefaultEvaluationSuite();
    res.json(result);
  } catch (err) {
    logger.error({ error: err }, 'Evaluation suite failed');
    res.status(500).json({ error: 'Evaluation run failed' });
  }
});

// Run a custom evaluation suite supplied in the request body
app.post('/api/eval/run', (req, res) => {
  const { cases, suiteName } = req.body as {
    cases?: EvaluationCase[];
    suiteName?: string;
  };

  if (!Array.isArray(cases) || cases.length === 0) {
    res.status(400).json({ error: 'cases array is required and must not be empty' });
    return;
  }

  // Basic validation of each case
  for (const c of cases) {
    if (typeof c.id !== 'string' || typeof c.input !== 'string') {
      res.status(400).json({ error: 'Each case must have id (string) and input (string)' });
      return;
    }
  }

  try {
    const result = runEvaluationSuite(cases, suiteName ?? 'Custom Suite');
    res.json(result);
  } catch (err) {
    logger.error({ error: err }, 'Custom evaluation suite failed');
    res.status(500).json({ error: 'Evaluation run failed' });
  }
});

// Retrieve past evaluation run history
app.get('/api/eval/results', (_req, res) => {
  res.json({ runs: getEvalHistory() });
});

// Expose the default evaluation cases so the UI can preview them
app.get('/api/eval/cases', (_req, res) => {
  res.json({ cases: DEFAULT_EVALUATION_CASES });
});

// ---------------------------------------------------------------------------
// Serve static Vite build in production
// ---------------------------------------------------------------------------

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ---------------------------------------------------------------------------
// Start (async — wait for sql.js init)
// ---------------------------------------------------------------------------

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      logger.info({ port: PORT, db: DB_PATH }, 'SOVEREIGN-NODE-9010 TaaS Monolith operational');
      logger.info(
        { patterns: DECEPTION_ONTOLOGY.length },
        'BBFB Engine and Forensic Detection active',
      );
      logger.info('System ready for deterministic analysis');
    });
  })
  .catch((err) => {
    logger.fatal({ error: err }, 'Database initialization failed');
        process.exit(1);
      });
