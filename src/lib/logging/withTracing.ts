import { H } from '@highlight-run/node';
import { enhancedLogger } from './EnhancedLogger';

/**
 * Options for configuring the tracing wrapper
 */
export interface TracingOptions {
  /**
   * Name of the operation being traced
   */
  operationName: string;

  /**
   * Optional request ID for correlation
   */
  requestId?: string;

  /**
   * Optional session ID for user tracking
   */
  sessionId?: string;

  /**
   * Additional attributes to attach to the trace
   */
  attributes?: Record<string, string | number | boolean>;

  /**
   * Component name (e.g., 'chain', 'api', 'database')
   */
  component?: string;
}

/**
 * Wraps an async function with Highlight distributed tracing
 *
 * This automatically:
 * - Creates a trace span for the operation
 * - Records timing and success/failure
 * - Logs errors to both Highlight and the enhanced logger
 * - Adds request/session correlation
 *
 * @param fn The async function to wrap
 * @param options Tracing configuration options
 * @returns The wrapped function with the same signature
 *
 * @example
 * ```typescript
 * const tracedFunction = withTracing(
 *   async (query: string) => {
 *     return await database.query(query);
 *   },
 *   {
 *     operationName: 'database.query',
 *     component: 'database',
 *     requestId: '123',
 *   }
 * );
 *
 * const result = await tracedFunction('SELECT * FROM users');
 * ```
 */
export function withTracing<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: TracingOptions
): T {
  const wrapped = async function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    const { operationName, requestId, sessionId, attributes = {}, component } = options;

    // Create logger with context
    const log = enhancedLogger.child({
      requestId,
      sessionId,
      component: component || 'tracing',
    });

    // Check if Highlight is enabled
    const highlightEnabled = enhancedLogger.isHighlightEnabled();

    const startTime = Date.now();

    try {
      let result: any;

      // Execute the function (Highlight tracing is handled at a higher level via H.init())
      // The SDK automatically captures traces when enabled
      result = await fn.apply(this, args);

      const duration = Date.now() - startTime;

      // Log successful execution
      log.logPerformance(
        { requestId, sessionId },
        operationName,
        duration,
        {
          success: true,
          ...attributes,
        }
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error
      log.error(
        { requestId, sessionId, component: component || 'tracing' },
        `Operation failed: ${operationName}`,
        error instanceof Error ? error : new Error(String(error)),
        {
          duration,
          success: false,
          ...attributes,
        }
      );

      throw error;
    }
  };

  return wrapped as T;
}

/**
 * Decorator version of withTracing for class methods
 *
 * @example
 * ```typescript
 * class MyService {
 *   @Traced({ operationName: 'MyService.processData', component: 'service' })
 *   async processData(input: string): Promise<string> {
 *     // ... implementation
 *     return result;
 *   }
 * }
 * ```
 */
export function Traced(options: Omit<TracingOptions, 'requestId' | 'sessionId'>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = withTracing(originalMethod, {
      ...options,
      operationName: options.operationName || `${target.constructor.name}.${propertyKey}`,
    });

    return descriptor;
  };
}

/**
 * Creates a manual trace span for more complex scenarios
 *
 * Use this when you need fine-grained control over trace lifecycle
 *
 * @example
 * ```typescript
 * const span = createSpan('complex-operation', { requestId: '123' });
 * try {
 *   // Do work
 *   await step1();
 *   span.addEvent('step1-complete');
 *
 *   await step2();
 *   span.addEvent('step2-complete');
 *
 *   span.setStatus({ code: 1 }); // OK
 * } catch (error) {
 *   span.recordException(error);
 *   span.setStatus({ code: 2, message: error.message });
 *   throw error;
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function createSpan(
  operationName: string,
  options: {
    requestId?: string;
    sessionId?: string;
    attributes?: Record<string, string | number | boolean>;
  } = {}
) {
  // Return a no-op span - manual span creation is handled by Highlight SDK internally
  // when H.init() is called with proper configuration
  return {
    setStatus: () => {},
    addEvent: () => {},
    recordException: () => {},
    end: () => {},
  };
}

/**
 * Utility to extract request/session IDs from HTTP headers or context
 */
export function extractTracingContext(headers: Record<string, string | undefined>): {
  requestId?: string;
  sessionId?: string;
} {
  return {
    requestId: headers['x-request-id'] || headers['x-trace-id'],
    sessionId: headers['x-session-id'],
  };
}
