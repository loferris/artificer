/**
 * Enhanced Logging Module
 *
 * Provides cloud-aggregated logging with:
 * - Axiom: Cloud log analytics and querying
 * - Highlight: Error tracking and distributed tracing
 * - Pino: Local development logging
 */

export {
  EnhancedLogger,
  enhancedLogger,
  Highlight,
  type LogContext,
  type ChainStageLog,
  type CostLog,
  type PerformanceLog,
  type SecurityLog,
} from './EnhancedLogger';

export {
  withTracing,
  Traced,
  createSpan,
  extractTracingContext,
  type TracingOptions,
} from './withTracing';

export { default } from './EnhancedLogger';
