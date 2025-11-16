import pino from 'pino';
import { Axiom } from '@axiomhq/js';
import { H } from '@highlight-run/node';

/**
 * Context for structured logging with request/session correlation
 */
export interface LogContext {
  requestId?: string;
  sessionId?: string;
  conversationId?: string;
  component?: string; // 'chain', 'costs', 'security', etc.
  [key: string]: unknown;
}

/**
 * Log data for chain orchestration stages
 */
export interface ChainStageLog {
  stage: 'structure' | 'analyze' | 'route' | 'execute' | 'validate';
  duration: number;
  cost?: number;
  model?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log data for cost tracking
 */
export interface CostLog {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  requestType: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log data for performance tracking
 */
export interface PerformanceLog {
  operation: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

/**
 * Log data for security events
 */
export interface SecurityLog {
  event: string;
  severity: 'low' | 'medium' | 'high';
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for PII sanitization
 */
export interface SanitizationConfig {
  /**
   * Keys to redact (e.g., ['email', 'ssn', 'password'])
   */
  redactKeys?: string[];
  /**
   * Regex patterns to redact (e.g., /\d{3}-\d{2}-\d{4}/ for SSN)
   */
  redactPatterns?: RegExp[];
  /**
   * Replacement string for redacted values
   */
  redactedValue?: string;
}

/**
 * Internal log event for batching
 */
interface LogEvent {
  timestamp: Date;
  level: string;
  message: string;
  context: LogContext;
  data?: Record<string, unknown>;
}

/**
 * Enhanced logger that wraps pino and adds cloud aggregation
 *
 * Features:
 * - Triple logging: pino (local), Axiom (cloud analytics), Highlight (error tracking)
 * - Request ID correlation and distributed tracing
 * - Structured contexts
 * - Specialized methods for chain, cost, security, and performance tracking
 * - Batched Axiom ingestion for efficiency
 * - Highlight error tracking and session replay
 * - Graceful degradation if cloud services unavailable
 */
export class EnhancedLogger {
  // Configuration constants
  private static readonly FLUSH_INTERVAL_MS = 5000;
  private static readonly AUTO_FLUSH_THRESHOLD = 100;
  private static readonly MAX_FLATTEN_DEPTH = 10;
  private static readonly DEFAULT_REDACTED_VALUE = '[REDACTED]';

  private pino: pino.Logger;
  private axiom?: Axiom;
  private dataset?: string;
  private logBuffer: LogEvent[] = [];
  private flushInterval?: NodeJS.Timeout;
  private isProduction: boolean;
  private context: LogContext;
  private axiomEnabled: boolean;
  private highlightEnabled: boolean;
  private isFlushing: boolean = false;
  private sanitizationConfig?: SanitizationConfig;
  private exitHandler?: () => void;

  constructor(
    pinoInstance?: pino.Logger,
    inheritedContext: LogContext = {},
    sanitizationConfig?: SanitizationConfig
  ) {
    // Initialize pino with existing config or create new instance
    this.pino = pinoInstance || this.createDefaultPinoInstance();
    this.context = inheritedContext;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.sanitizationConfig = sanitizationConfig;

    // Initialize Axiom only in production and if credentials are available
    this.axiomEnabled = this.isProduction &&
                        !!process.env.AXIOM_TOKEN &&
                        !!process.env.AXIOM_DATASET;

    if (this.axiomEnabled) {
      try {
        this.axiom = new Axiom({
          token: process.env.AXIOM_TOKEN!,
          orgId: process.env.AXIOM_ORG_ID,
        });
        this.dataset = process.env.AXIOM_DATASET!;

        // Start periodic flush
        this.flushInterval = setInterval(() => {
          void this.flush();
        }, EnhancedLogger.FLUSH_INTERVAL_MS);

        // Flush on process exit
        this.setupExitHandlers();
      } catch (error) {
        // Graceful degradation - log error but continue with pino only
        this.pino.warn({ err: error }, 'Failed to initialize Axiom - continuing with local logging only');
        this.axiomEnabled = false;
      }
    }

    // Initialize Highlight if project ID is configured
    this.highlightEnabled = !!process.env.HIGHLIGHT_PROJECT_ID;

    if (this.highlightEnabled) {
      try {
        const highlightConfig: any = {
          projectID: process.env.HIGHLIGHT_PROJECT_ID!,
          serviceName: process.env.HIGHLIGHT_SERVICE_NAME || 'alembic-orchestrator',
          serviceVersion: process.env.npm_package_version || '1.0.0',
        };

        // Use self-hosted backend if configured (development)
        // Otherwise uses Highlight cloud (production)
        if (process.env.HIGHLIGHT_BACKEND_URL) {
          highlightConfig.otlpEndpoint = process.env.HIGHLIGHT_BACKEND_URL;
          this.pino.info({
            backend: process.env.HIGHLIGHT_BACKEND_URL,
          }, 'Initializing Highlight with self-hosted backend');
        } else {
          this.pino.info('Initializing Highlight with cloud backend');
        }

        H.init(highlightConfig);
      } catch (error) {
        // Graceful degradation - log error but continue without Highlight
        this.pino.warn({ err: error }, 'Failed to initialize Highlight - continuing without error tracking');
        this.highlightEnabled = false;
      }
    }
  }

  /**
   * Create default pino instance matching existing logger configuration
   */
  private createDefaultPinoInstance(): pino.Logger {
    return pino({
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:HH:MM:ss',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
      serializers: {
        err: pino.stdSerializers.err,
      },
    });
  }

  /**
   * Setup process exit handlers to flush remaining logs
   */
  private setupExitHandlers(): void {
    this.exitHandler = () => {
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
      }
      void this.flush();
    };

    // Handle various exit scenarios
    process.on('beforeExit', this.exitHandler);
    process.on('SIGINT', this.exitHandler);
    process.on('SIGTERM', this.exitHandler);
    process.on('SIGUSR2', this.exitHandler); // nodemon restart
  }

  /**
   * Remove exit handlers
   */
  private removeExitHandlers(): void {
    if (this.exitHandler) {
      process.off('beforeExit', this.exitHandler);
      process.off('SIGINT', this.exitHandler);
      process.off('SIGTERM', this.exitHandler);
      process.off('SIGUSR2', this.exitHandler);
      this.exitHandler = undefined;
    }
  }

  /**
   * Buffer log event for Axiom ingestion
   */
  private bufferForAxiom(
    level: string,
    message: string,
    context: LogContext,
    data?: Record<string, unknown>
  ): void {
    if (!this.axiomEnabled) return;

    this.logBuffer.push({
      timestamp: new Date(),
      level,
      message,
      context: { ...this.context, ...context },
      data,
    });

    // Auto-flush if buffer gets too large
    if (this.logBuffer.length >= EnhancedLogger.AUTO_FLUSH_THRESHOLD) {
      void this.flush();
    }
  }

  /**
   * Flatten nested objects for Axiom (makes querying easier)
   * @param obj Object to flatten
   * @param prefix Current key prefix
   * @param depth Current recursion depth
   * @returns Flattened object
   */
  private flattenObject(
    obj: Record<string, unknown>,
    prefix = '',
    depth = 0
  ): Record<string, unknown> {
    // Prevent stack overflow on deeply nested objects
    if (depth >= EnhancedLogger.MAX_FLATTEN_DEPTH) {
      return { [prefix || 'data']: '[max depth exceeded]' };
    }

    const flattened: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, this.flattenObject(value as Record<string, unknown>, newKey, depth + 1));
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  /**
   * Sanitize data to remove PII
   * @param data Data to sanitize
   * @returns Sanitized data with PII redacted
   */
  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    if (!this.sanitizationConfig) {
      return data;
    }

    const { redactKeys = [], redactPatterns = [], redactedValue = EnhancedLogger.DEFAULT_REDACTED_VALUE } = this.sanitizationConfig;

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      // Check if key should be redacted
      if (redactKeys.includes(key.toLowerCase())) {
        sanitized[key] = redactedValue;
        continue;
      }

      // Check if value matches redaction pattern
      if (typeof value === 'string' && redactPatterns.length > 0) {
        let sanitizedValue = value;
        for (const pattern of redactPatterns) {
          sanitizedValue = sanitizedValue.replace(pattern, redactedValue);
        }
        sanitized[key] = sanitizedValue;
        continue;
      }

      // Recursively sanitize nested objects
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        sanitized[key] = this.sanitizeData(value as Record<string, unknown>);
        continue;
      }

      // Pass through other values
      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Core logging methods
   */

  info(context: LogContext, message: string, data?: Record<string, unknown>): void {
    const mergedContext = { ...this.context, ...context };
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    const pinoData = { ...mergedContext, ...sanitizedData };
    this.pino.info(pinoData, message);
    this.bufferForAxiom('info', message, mergedContext, sanitizedData);
  }

  error(context: LogContext, message: string, error?: Error, data?: Record<string, unknown>): void {
    const mergedContext = { ...this.context, ...context };
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    const errorData = error ? { err: error, ...mergedContext, ...sanitizedData } : { ...mergedContext, ...sanitizedData };
    this.pino.error(errorData, message);
    this.bufferForAxiom('error', message, mergedContext, {
      ...sanitizedData,
      error: error?.message,
      stack: error?.stack,
    });

    // Send error to Highlight for tracking and alerting
    if (this.highlightEnabled && error) {
      try {
        H.consumeError(
          error,
          mergedContext.requestId as string | undefined,
          mergedContext.sessionId as string | undefined
        );
      } catch (highlightError) {
        // Don't let Highlight errors break the application
        this.pino.debug({ err: highlightError }, 'Failed to send error to Highlight');
      }
    }
  }

  warn(context: LogContext, message: string, data?: Record<string, unknown>): void {
    const mergedContext = { ...this.context, ...context };
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    const pinoData = { ...mergedContext, ...sanitizedData };
    this.pino.warn(pinoData, message);
    this.bufferForAxiom('warn', message, mergedContext, sanitizedData);
  }

  debug(context: LogContext, message: string, data?: Record<string, unknown>): void {
    const mergedContext = { ...this.context, ...context };
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    const pinoData = { ...mergedContext, ...sanitizedData };
    this.pino.debug(pinoData, message);
    this.bufferForAxiom('debug', message, mergedContext, sanitizedData);
  }

  /**
   * Specialized logging for chain orchestration
   */

  logChainStage(context: LogContext, stage: ChainStageLog): void {
    const message = `Chain stage: ${stage.stage}`;
    const data = {
      stage: stage.stage,
      duration: stage.duration,
      cost: stage.cost,
      model: stage.model,
      success: stage.success,
      error: stage.error,
      ...stage.metadata,
    };

    if (stage.success) {
      this.info({ ...context, component: 'chain' }, message, data);
    } else {
      this.error({ ...context, component: 'chain' }, message, undefined, data);
    }
  }

  logChainComplete(
    context: LogContext,
    stages: ChainStageLog[],
    totalCost: number
  ): void {
    const totalDuration = stages.reduce((sum, stage) => sum + stage.duration, 0);
    const failedStages = stages.filter(s => !s.success);

    const data = {
      totalStages: stages.length,
      totalDuration,
      totalCost,
      failedStages: failedStages.length,
      stages: stages.map(s => ({
        stage: s.stage,
        duration: s.duration,
        success: s.success,
      })),
    };

    const message = `Chain complete: ${stages.length} stages, ${totalDuration}ms, $${totalCost.toFixed(4)}`;

    if (failedStages.length > 0) {
      this.warn({ ...context, component: 'chain' }, message, data);
    } else {
      this.info({ ...context, component: 'chain' }, message, data);
    }
  }

  /**
   * Cost tracking
   */

  logCost(context: LogContext, cost: CostLog): void {
    const message = `Model usage: ${cost.model}`;
    const data = {
      model: cost.model,
      inputTokens: cost.inputTokens,
      outputTokens: cost.outputTokens,
      totalTokens: cost.inputTokens + cost.outputTokens,
      cost: cost.cost,
      requestType: cost.requestType,
      ...cost.metadata,
    };

    this.info({ ...context, component: 'costs' }, message, data);
  }

  /**
   * Security events
   */

  logSecurityEvent(
    context: LogContext,
    event: string,
    severity: 'low' | 'medium' | 'high',
    data?: Record<string, unknown>
  ): void {
    const message = `Security event: ${event}`;
    const logData = {
      event,
      severity,
      ...data,
    };

    const mergedContext = { ...context, component: 'security' };

    if (severity === 'high') {
      this.error(mergedContext, message, undefined, logData);
    } else if (severity === 'medium') {
      this.warn(mergedContext, message, logData);
    } else {
      this.info(mergedContext, message, logData);
    }
  }

  /**
   * Performance tracking
   */

  logPerformance(
    context: LogContext,
    operation: string,
    duration: number,
    data?: Record<string, unknown>
  ): void {
    const message = `Performance: ${operation}`;
    const logData = {
      operation,
      duration,
      ...data,
    };

    this.info({ ...context, component: 'performance' }, message, logData);
  }

  /**
   * Create child logger with inherited context
   */

  child(context: LogContext): EnhancedLogger {
    const mergedContext = { ...this.context, ...context };
    return new EnhancedLogger(this.pino, mergedContext, this.sanitizationConfig);
  }

  /**
   * Flush buffered logs to Axiom
   */

  async flush(): Promise<void> {
    // Prevent concurrent flushes
    if (this.isFlushing || !this.axiomEnabled || !this.axiom || !this.dataset || this.logBuffer.length === 0) {
      return;
    }

    this.isFlushing = true;

    const eventsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // Transform events to Axiom format
      const axiomEvents = eventsToFlush.map(event => {
        const baseEvent = {
          _time: event.timestamp.toISOString(),
          level: event.level,
          message: event.message,
          ...event.context,
        };

        // Flatten and merge data
        if (event.data) {
          const flatData = this.flattenObject(event.data);
          Object.assign(baseEvent, flatData);
        }

        return baseEvent;
      });

      // Ingest to Axiom
      await this.axiom.ingest(this.dataset, axiomEvents);
    } catch (error) {
      // Graceful degradation - log error but don't crash
      this.pino.warn(
        { err: error, eventsLost: eventsToFlush.length },
        'Failed to flush logs to Axiom'
      );

      // Don't re-buffer failed events to avoid memory leak
      // In production, consider implementing a dead letter queue
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Dispose of logger resources and flush remaining logs
   * Call this before destroying the logger instance to prevent memory leaks
   */
  async dispose(): Promise<void> {
    // Clear interval to prevent memory leaks
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = undefined;
    }

    // Remove exit handlers to prevent memory leaks
    this.removeExitHandlers();

    // Flush any remaining logs
    await this.flush();
  }

  /**
   * Get current buffer size (useful for testing)
   */
  getBufferSize(): number {
    return this.logBuffer.length;
  }

  /**
   * Check if Axiom is enabled
   */
  isAxiomEnabled(): boolean {
    return this.axiomEnabled;
  }

  /**
   * Check if Highlight is enabled
   */
  isHighlightEnabled(): boolean {
    return this.highlightEnabled;
  }

  /**
   * Get Highlight instance for advanced usage (e.g., manual trace creation)
   */
  getHighlight() {
    return this.highlightEnabled ? H : null;
  }
}

/**
 * Create the default enhanced logger instance
 */
const defaultPinoInstance = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  serializers: {
    err: pino.stdSerializers.err,
  },
});

export const enhancedLogger = new EnhancedLogger(defaultPinoInstance);
export default enhancedLogger;

// Re-export Highlight for direct usage (tracing, etc.)
export { H as Highlight };
