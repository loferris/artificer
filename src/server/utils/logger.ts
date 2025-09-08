// Production-ready logging utility for solo deployment

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'debug':
        this.logLevel = LogLevel.DEBUG;
        break;
      case 'info':
        this.logLevel = LogLevel.INFO;
        break;
      case 'warn':
        this.logLevel = LogLevel.WARN;
        break;
      case 'error':
      default:
        this.logLevel = LogLevel.ERROR;
        break;
    }
  }

  private formatLog(
    level: string,
    message: string,
    meta?: Record<string, unknown>,
    error?: Error,
  ): LogEntry {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (meta && Object.keys(meta).length > 0) {
      logEntry.meta = meta;
    }

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      };
    }

    return logEntry;
  }

  private log(
    level: LogLevel,
    levelName: string,
    message: string,
    meta?: Record<string, unknown>,
    error?: Error,
  ) {
    if (level > this.logLevel) return;

    const logEntry = this.formatLog(levelName, message, meta, error);

    // In production, you might want to send to external service
    // For solo deployment, console logging is sufficient
    if (level === LogLevel.ERROR) {
      console.error(JSON.stringify(logEntry));
    } else if (level === LogLevel.WARN) {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, 'ERROR', message, meta, error);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.log(LogLevel.WARN, 'WARN', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.log(LogLevel.INFO, 'INFO', message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
  }

  // Specific logging methods for common scenarios
  apiRequest(method: string, path: string, duration: number, status: number, userId?: string) {
    this.info('API Request', {
      method,
      path,
      duration,
      status,
      userId,
    });
  }

  rateLimitHit(identifier: string, endpoint: string, resetTime: number) {
    this.warn('Rate limit exceeded', {
      identifier: identifier.substring(0, 20) + '...', // Truncate for privacy
      endpoint,
      resetTime: new Date(resetTime).toISOString(),
    });
  }

  dbQuery(query: string, duration: number, error?: Error) {
    if (error) {
      this.error('Database query failed', error, {
        query: query.substring(0, 100) + '...',
        duration,
      });
    } else if (process.env.ENABLE_QUERY_LOGGING === 'true') {
      this.debug('Database query', { query: query.substring(0, 100) + '...', duration });
    }
  }

  assistantRequest(model: string, tokens: number, cost: number, duration: number, error?: Error) {
    if (error) {
      this.error('Assistant request failed', error, { model, tokens, cost, duration });
    } else {
      this.info('Assistant request', { model, tokens, cost, duration });
    }
  }
}

export const logger = new Logger();

// Export for use in other modules
export default logger;
