// ============================================================================
// Sovereign Node 9010 — Squeal Protocol (Task 2.2)
// Writes deception/exhaustion reports to disk as JSON audit trail
// ============================================================================

import { mkdirSync, writeFileSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import type { DeceptionReport } from '../types.js';

const SQUEAL_DIR = path.join(process.cwd(), 'data', 'squeal-reports');

// Ensure directory exists on import
mkdirSync(SQUEAL_DIR, { recursive: true });

export interface SquealFileReport {
  timestamp: string;
  sessionId: string;
  trigger: 'DECEPTION_DETECTED' | 'USER_EXHAUSTION';
  inputText: string;
  deceptionProbability: number;
  structuralDeceptionFlag: boolean;
  criticalPatterns: string[];
  forensicReasoning: string[];
  recommendation: 'ESCALATE_TO_LEGAL' | 'MONITOR_CLOSELY';
}

export function writeSquealReport(
  report: DeceptionReport,
  sessionId: string,
  trigger: 'DECEPTION_DETECTED' | 'USER_EXHAUSTION',
): string {
  const ts = report.timestamp.replace(/[:.]/g, '-');
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `squeal-${ts}-${safeSessionId}.json`;
  const filepath = path.join(SQUEAL_DIR, filename);

  const criticalPatterns = report.detectedPatterns
    .filter((p) => p.severity === 'CRITICAL' || p.severity === 'HIGH')
    .map((p) => `${p.patternId} ${p.patternName} (${(p.confidence * 100).toFixed(1)}%)`);

  const squealFile: SquealFileReport = {
    timestamp: report.timestamp,
    sessionId,
    trigger,
    inputText: report.inputText,
    deceptionProbability: report.deceptionProbability,
    structuralDeceptionFlag: report.structuralDeceptionFlag,
    criticalPatterns,
    forensicReasoning: report.forensicReasoning,
    recommendation: report.detectedPatterns.some((p) => p.severity === 'CRITICAL')
      ? 'ESCALATE_TO_LEGAL'
      : 'MONITOR_CLOSELY',
  };

  writeFileSync(filepath, JSON.stringify(squealFile, null, 2), 'utf-8');
  return filename;
}

export function listSquealReports(): string[] {
  try {
    return readdirSync(SQUEAL_DIR).filter((f) => f.startsWith('squeal-') && f.endsWith('.json'));
  } catch {
    return [];
  }
}

export function readSquealReport(filename: string): SquealFileReport | null {
  const safeName = path.basename(filename);
  const filepath = path.join(SQUEAL_DIR, safeName);
  try {
    const content = readFileSync(filepath, 'utf-8');
    return JSON.parse(content) as SquealFileReport;
  } catch {
    return null;
  }
}
