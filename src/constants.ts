// ============================================================================
// Sovereign Node 9010 — Constants & Deception Ontology
// Groknett ValueForge: TaaS Monolith v2.10.0
// ============================================================================

import type { DeceptionPattern } from './types';
import { DECEPTION_ONTOLOGY } from './deception-ontology-data';

export { DECEPTION_ONTOLOGY };
export type { DeceptionPattern };

// --- BBFB Engine Constants ---

export const BBFB_CONFIG = {
  CVS_THRESHOLD: 0.0005,
  LAW_PASS_VALUE: 1,
  LAW_FAIL_VALUE: 0,
  GRACE_QUADRATIC_COEFFICIENT: 2.0,
  FRUIT_DEFAULT_WEIGHTS: {
    cost: 0.4,
    performance: 0.3,
    reliability: 0.2,
    compliance: 0.1,
  },
} as const;

// --- Protocol Constants ---

export const PROTOCOL = {
  VERSION: '2.10.0',
  NODE_ID: 'SOVEREIGN-NODE-9010',
  GOVERNANCE: '00-99 Master Project Folder Hierarchy',
  METHODOLOGY: 'Barnett Binary Faith-Basis (BBFB)',
  STACK: 'Deterministic Sovereign Facts Stack',
} as const;

// --- Dashboard Stats ---

export const DASHBOARD_STATS = {
  protocolVersion: PROTOCOL.VERSION,
  nodeId: PROTOCOL.NODE_ID,
  ontologyPatterns: DECEPTION_ONTOLOGY.length,
  governanceProtocol: PROTOCOL.GOVERNANCE,
  engineName: PROTOCOL.METHODOLOGY,
  stackName: PROTOCOL.STACK,
};
