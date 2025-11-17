/**
 * Shared Router Helpers
 * Common utilities used across tRPC routers
 */

import { TRPCError } from '@trpc/server';
import { logger } from './logger';
import { models } from '../config/models';
import type { ChainConfig } from '../services/orchestration/types';

/**
 * Ensure database is available (not in demo mode)
 * Throws PRECONDITION_FAILED if database is not available
 */
export function ensureDatabase(ctx: any) {
  if (!ctx.db) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Database not available in demo mode',
    });
  }
  return ctx.db;
}

/**
 * Sanitize errors for client responses
 * Logs full error details server-side but only sends safe messages to client
 */
export function sanitizeError(error: unknown, operation: string): TRPCError {
  // Log full error details for debugging
  logger.error(`Router error: ${operation}`, {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });

  // If it's already a TRPCError, return it
  if (error instanceof TRPCError) {
    return error;
  }

  // For known error types, create appropriate TRPC errors
  if (error instanceof Error) {
    // Database errors
    if (error.message.includes('not found') || error.message.includes('does not exist')) {
      return new TRPCError({
        code: 'NOT_FOUND',
        message: error.message,
      });
    }

    // Permission/auth errors
    if (error.message.includes('not authorized') || error.message.includes('permission denied')) {
      return new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
      });
    }

    // Validation errors
    if (error.message.includes('invalid') || error.message.includes('validation')) {
      return new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message,
      });
    }

    // Default to internal server error with sanitized message
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Operation failed: ${error.message}`,
    });
  }

  // Unknown error type
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}

/**
 * Build ChainConfig from centralized model registry and environment variables
 * Shared configuration builder for orchestration
 */
export function buildChainConfig(): ChainConfig {
  const analyzerModel = models.analyzer;
  const routerModel = models.router;
  const validatorModel = models.validator;
  const availableModels = models.available;

  const minComplexity = parseInt(process.env.CHAIN_ROUTING_MIN_COMPLEXITY || '5', 10);
  const maxRetries = parseInt(process.env.MAX_RETRIES || '2', 10);
  const validationEnabled = process.env.VALIDATION_ENABLED !== 'false';
  const preferCheapModels = process.env.PREFER_CHEAP_MODELS === 'true';

  // Timeout configuration (in milliseconds)
  const analyzerTimeout = parseInt(process.env.ANALYZER_TIMEOUT || '30000', 10);
  const routerTimeout = parseInt(process.env.ROUTER_TIMEOUT || '30000', 10);
  const executionTimeout = parseInt(process.env.EXECUTION_TIMEOUT || '120000', 10);
  const validatorTimeout = parseInt(process.env.VALIDATOR_TIMEOUT || '30000', 10);

  return {
    analyzerModel,
    routerModel,
    validatorModel,
    availableModels,
    minComplexityForChain: minComplexity,
    maxRetries,
    validationEnabled,
    preferCheapModels,
    analyzerTimeout,
    routerTimeout,
    executionTimeout,
    validatorTimeout,
  };
}
