-- ============================================================================
-- Sovereign Node 9010 — Facts Registry Schema
-- Ground Truth (00) Store: Immutable facts with ISO Date Mandate compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK(category IN ('Technical', 'Governance', 'Forensic')),
  statement TEXT NOT NULL,
  source TEXT NOT NULL,
  verified BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ')),
  UNIQUE(statement, source)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_verified ON facts(verified);
CREATE INDEX IF NOT EXISTS idx_category ON facts(category);
CREATE INDEX IF NOT EXISTS idx_created_at ON facts(created_at);

-- Version log (optional, for audit trail)
CREATE TABLE IF NOT EXISTS facts_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fact_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('CREATE', 'VERIFY', 'DELETE')),
  timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ')),
  FOREIGN KEY(fact_id) REFERENCES facts(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_fact_id ON facts_audit_log(fact_id);
