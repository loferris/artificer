import pino from 'pino';

/**
 * A wrapper class around the pino logger to provide a consistent API
 * across the application and allow for easy dependency injection in tests.
 */
export class Logger {
  private logger: pino.Logger;

  constructor(pinoInstance: pino.Logger) {
    this.logger = pinoInstance;
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    if (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error({ err: errorObj, ...meta }, message);
    } else {
      this.logger.error(meta, message);
    }
  }

  warn(message: string, meta?: Record<string, unknown> | string | unknown) {
    if (typeof meta === 'string' || (meta && typeof meta !== 'object')) {
      this.logger.warn({ data: meta }, message);
    } else {
      this.logger.warn(meta as Record<string, unknown>, message);
    }
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.logger.info(meta, message);
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.logger.debug(meta, message);
  }

  apiRequest(method: string, path: string, duration: number, status: number, userId?: string) {
    this.info('API Request', {
      request: { method, path, userId },
      response: { status, duration },
    });
  }

  rateLimitHit(identifier: string, endpoint: string, resetTime: number) {
    this.warn('Rate limit exceeded', {
      ratelimit: {
        identifier: identifier.substring(0, 20) + '...',
        endpoint,
        resetTime: new Date(resetTime).toISOString(),
      },
    });
  }

  dbQuery(query: string, duration: number, error?: Error) {
    const queryMeta = {
      db: { query: query.substring(0, 100) + '...', duration },
    };
    if (error) {
      this.error('Database query failed', error, queryMeta);
    } else if (process.env.ENABLE_QUERY_LOGGING === 'true') {
      this.debug('Database query', queryMeta);
    }
  }

  assistantRequest(model: string, tokens: number, cost: number, duration: number, error?: Error) {
    const assistantMeta = { model, tokens, cost, duration };
    if (error) {
      this.error('Assistant request failed', error, assistantMeta);
    } else {
      this.info('Assistant request', assistantMeta);
    }
  }
}

// Create the default pino instance for the application to use
const pinoInstance = pino({
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

// Export a pre-configured instance for the app to use as a singleton
export const logger = new Logger(pinoInstance);
export default logger;
