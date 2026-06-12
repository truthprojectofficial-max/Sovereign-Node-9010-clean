// ============================================================================
// Sovereign Node 9010 — Facts Registry Module
// Ground Truth (00) Store: Initialize, create, retrieve, verify facts
// ============================================================================

import type { Fact } from '../types.js';

// In-memory Facts Registry (Sovereign Point: Ground Truth Store)
// Persists facts with deterministic timestamps and verification states
interface FactRecord extends Fact {
  auditLog: Array<{ action: 'CREATE' | 'VERIFY' | 'DELETE'; timestamp: string }>;
}

const factsRegistry = new Map<number, FactRecord>();
let nextId = 1;

/**
 * Initialize the Facts Registry
 * For MVP: in-memory storage with deterministic behavior
 */
export function initializeDB(): void {
  // Reset registry if called multiple times
  factsRegistry.clear();
  nextId = 1;
}

/**
 * Get all facts (internal use)
 */
export function getAllFacts(): FactRecord[] {
  return Array.from(factsRegistry.values());
}

/**
 * Add a new fact to the registry
 */
export function addFact(factInput: {
  category: 'Technical' | 'Governance' | 'Forensic';
  statement: string;
  source: string;
}): Fact {
  // Validate category at runtime
  const validCategories = ['Technical', 'Governance', 'Forensic'];
  if (!validCategories.includes(factInput.category)) {
    throw new Error(
      `Invalid category "${factInput.category}". Must be one of: ${validCategories.join(', ')}`,
    );
  }

  const id = nextId++;
  const createdAt = new Date().toISOString();

  // Check for duplicate (statement, source) pair
  for (const existing of factsRegistry.values()) {
    if (existing.statement === factInput.statement && existing.source === factInput.source) {
      throw new Error('Fact already exists for statement and source combination');
    }
  }

  const fact: FactRecord = {
    id,
    category: factInput.category,
    statement: factInput.statement,
    source: factInput.source,
    verified: false,
    createdAt,
    updatedAt: createdAt,
    auditLog: [{ action: 'CREATE', timestamp: createdAt }],
  };

  factsRegistry.set(id, fact);

  return {
    id: fact.id,
    category: fact.category,
    statement: fact.statement,
    source: fact.source,
    verified: fact.verified,
    createdAt: fact.createdAt,
    updatedAt: fact.updatedAt,
  };
}

/**
 * Retrieve a single fact by ID
 */
export function getFact(id: number): Fact | null {
  const record = factsRegistry.get(id);
  if (!record) return null;

  return {
    id: record.id,
    category: record.category,
    statement: record.statement,
    source: record.source,
    verified: record.verified,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * List all facts with optional filtering
 */
export function listFacts(filters?: {
  category?: 'Technical' | 'Governance' | 'Forensic';
  verified?: boolean;
}): Fact[] {
  let results = Array.from(factsRegistry.values());

  if (filters?.category) {
    results = results.filter((f) => f.category === filters.category);
  }

  if (filters?.verified !== undefined) {
    results = results.filter((f) => f.verified === filters.verified);
  }

  // Sort by createdAt descending, then by ID descending (for stable sort)
  results.sort((a, b) => {
    const timeCompare = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (timeCompare !== 0) return timeCompare;
    return b.id - a.id; // Use ID as tie-breaker
  });

  return results.map((record) => ({
    id: record.id,
    category: record.category,
    statement: record.statement,
    source: record.source,
    verified: record.verified,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }));
}

/**
 * Verify a fact (mark as verified = true)
 */
export function verifyFact(id: number): Fact {
  const record = factsRegistry.get(id);
  if (!record) {
    throw new Error(`Fact with ID ${id} not found`);
  }

  record.verified = true;
  record.updatedAt = new Date().toISOString();
  record.auditLog.push({ action: 'VERIFY', timestamp: record.updatedAt });

  return {
    id: record.id,
    category: record.category,
    statement: record.statement,
    source: record.source,
    verified: record.verified,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Delete a fact from the registry
 */
export function deleteFact(id: number): boolean {
  const record = factsRegistry.get(id);
  if (!record) {
    return false;
  }

  record.auditLog.push({ action: 'DELETE', timestamp: new Date().toISOString() });
  factsRegistry.delete(id);
  return true;
}

/**
 * Close the database connection (no-op for in-memory)
 */
export function closeDB(): void {
  // No-op for in-memory registry
}

/**
 * Get database statistics
 */
export function getStats(): {
  total: number;
  verified: number;
  byCategory: Record<string, number>;
} {
  const records = Array.from(factsRegistry.values());

  const total = records.length;
  const verified = records.filter((f) => f.verified).length;

  const byCategory: Record<string, number> = {};

  for (const record of records) {
    byCategory[record.category] = (byCategory[record.category] ?? 0) + 1;
  }

  return { total, verified, byCategory };
}
