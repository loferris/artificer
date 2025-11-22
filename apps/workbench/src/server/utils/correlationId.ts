/**
 * Correlation ID utilities for distributed tracing
 *
 * Generates and manages correlation IDs that flow across service boundaries
 * to enable request tracing in distributed systems.
 */

import { randomUUID } from 'crypto';

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Extract correlation ID from HTTP headers
 */
export function extractCorrelationId(headers: Record<string, string | string[] | undefined>): string | undefined {
  const headerNames = ['x-correlation-id', 'x-request-id', 'traceparent'];

  for (const name of headerNames) {
    const value = headers[name];
    if (value) {
      return Array.isArray(value) ? value[0] : value;
    }
  }

  return undefined;
}

/**
 * Get or create correlation ID from headers
 */
export function getOrCreateCorrelationId(headers: Record<string, string | string[] | undefined>): string {
  return extractCorrelationId(headers) || generateCorrelationId();
}

/**
 * Header name for correlation ID
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';
