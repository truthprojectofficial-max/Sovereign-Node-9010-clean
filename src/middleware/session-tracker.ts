// ============================================================================
// Sovereign Node 9010 — Session Tracker Middleware (Task 2.1)
// Tracks sessions, detects user exhaustion (repetition), locks transactions
// Returns 429 SOVEREIGN_EXIT_REACHED when lock triggers
// ============================================================================

import type { Request, Response, NextFunction } from 'express';

export interface SessionState {
  attempts: number;
  repetitions: number;
  locked: boolean;
  lockedAt: string | null;
  lastRequest: Date;
  lastTexts: string[];
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REPETITION_PATTERN = /\b(no\s*){3,}/i;
const MAX_REPETITIONS = 3;
const LAST_TEXTS_WINDOW = 5;

// In-memory session store
const sessions = new Map<string, SessionState>();

export function getSession(sessionId: string): SessionState | undefined {
  return sessions.get(sessionId);
}

export function getAllSessions(): Map<string, SessionState> {
  return sessions;
}

export function clearSessions(): void {
  sessions.clear();
}

export function unlockSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (session) {
    session.locked = false;
    session.lockedAt = null;
    session.repetitions = 0;
    return true;
  }
  return false;
}

function purgeExpiredSessions(): void {
  const now = Date.now();
  for (const [sid, state] of sessions) {
    if (now - state.lastRequest.getTime() > SESSION_TTL_MS) {
      sessions.delete(sid);
    }
  }
}

function detectTextRepetition(texts: string[]): boolean {
  if (texts.length < 3) return false;
  const last3 = texts.slice(-3);
  // All three most recent texts are identical (case-insensitive, trimmed)
  const normalized = last3.map((t) => t.trim().toLowerCase());
  return normalized[0] === normalized[1] && normalized[1] === normalized[2];
}

export function sessionTracker(req: Request, res: Response, next: NextFunction): void {
  // Only track POST requests with text bodies — skip GETs, health checks, etc.
  if (req.method !== 'POST') {
    next();
    return;
  }

  // Skip session management endpoints so they can't be blocked by the tracker itself
  if (req.path.startsWith('/api/sessions')) {
    next();
    return;
  }

  // Use X-Forwarded-For (real client IP behind Azure LB / reverse proxy) before req.ip
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip;
  const sessionId = (req.headers['x-session-id'] as string) || clientIp || 'anonymous';
  const now = new Date();

  // Purge stale sessions periodically
  purgeExpiredSessions();

  // Initialize or retrieve session
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      attempts: 0,
      repetitions: 0,
      locked: false,
      lockedAt: null,
      lastRequest: now,
      lastTexts: [],
    });
  }

  const session = sessions.get(sessionId)!;

  // Check if locked — block immediately
  if (session.locked) {
    res.status(429).json({
      error: 'SOVEREIGN_EXIT_REACHED',
      message: 'Transaction locked due to user exhaustion. Session must be unlocked or expire.',
      squealReport: {
        trigger: 'User_Stop_Command',
        sessionId,
        repetitionCount: session.repetitions,
        lockedAt: session.lockedAt,
        timestamp: now.toISOString(),
      },
    });
    return;
  }

  session.lastRequest = now;
  session.attempts++;

  // Check text body for exhaustion signals
  const bodyText = req.body?.text;
  if (typeof bodyText === 'string') {
    // Track recent texts for repetition detection
    session.lastTexts.push(bodyText);
    if (session.lastTexts.length > LAST_TEXTS_WINDOW) {
      session.lastTexts.shift();
    }

    // Check 1: Explicit "no no no" repetition pattern
    if (REPETITION_PATTERN.test(bodyText)) {
      session.repetitions++;
    }

    // Check 2: User sending the exact same text 3+ times in a row
    if (detectTextRepetition(session.lastTexts)) {
      session.repetitions++;
    }

    // Lock if threshold exceeded
    if (session.repetitions >= MAX_REPETITIONS) {
      session.locked = true;
      session.lockedAt = now.toISOString();
      res.status(429).json({
        error: 'SOVEREIGN_EXIT_REACHED',
        message: 'Transaction locked: repeated exhaustion signals detected.',
        squealReport: {
          trigger: 'User_Stop_Command',
          sessionId,
          repetitionCount: session.repetitions,
          lockedAt: session.lockedAt,
          timestamp: now.toISOString(),
        },
      });
      return;
    }
  }

  next();
}
