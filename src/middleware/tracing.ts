// ============================================================================
// Sovereign Node 9010 — Request Tracing Middleware
// Provides per-request trace IDs via AsyncLocalStorage.
// Accepts X-Trace-Id from upstream callers; generates one when absent.
// ============================================================================

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import type { Request, Response, NextFunction } from 'express';

export interface TraceContext {
  traceId: string;
  startTime: number;
}

/** AsyncLocalStorage instance — persists trace context across async boundaries */
const traceStore = new AsyncLocalStorage<TraceContext>();

/** Returns the trace context for the current request, or undefined outside a request */
export function getTraceContext(): TraceContext | undefined {
  return traceStore.getStore();
}

/** Returns the traceId for the current request, or 'no-trace' outside a request */
export function getTraceId(): string {
  return traceStore.getStore()?.traceId ?? 'no-trace';
}

/**
 * Express middleware that attaches a unique trace ID to every request.
 *
 * - Reads X-Trace-Id header from the incoming request (e.g. from a load balancer
 *   or upstream service) and re-uses it, enabling end-to-end trace correlation.
 *   The header value is validated: max 200 characters, safe printable ASCII only.
 * - Generates a new UUID v4 when no incoming trace ID is present or the header
 *   fails validation.
 * - Echoes the trace ID back on the response via X-Trace-Id so callers can
 *   reference it in support tickets or their own logs.
 * - Makes the trace ID available anywhere in the request lifecycle through
 *   getTraceId() / getTraceContext() (backed by AsyncLocalStorage).
 */

// Allowlist: printable ASCII excluding control characters and characters that
// could be misinterpreted in log output or HTTP headers (e.g. CR/LF, null byte).
const SAFE_TRACE_ID = /^[\x20-\x7E]{1,200}$/;

export function tracingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-trace-id'];
  const isValidIncoming =
    typeof incomingId === 'string' && incomingId.length > 0 && SAFE_TRACE_ID.test(incomingId);
  const traceId = isValidIncoming ? (incomingId as string) : randomUUID();

  res.setHeader('X-Trace-Id', traceId);

  const context: TraceContext = { traceId, startTime: Date.now() };
  traceStore.run(context, () => {
    next();
  });
}
