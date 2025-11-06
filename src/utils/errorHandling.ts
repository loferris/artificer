// Utility functions for consistent error handling

export interface ErrorWithContext {
  error: Error;
  context?: Record<string, any>;
  timestamp: Date;
  userId?: string;
}

export interface ErrorHandlerOptions {
  logToConsole?: boolean;
  logToService?: boolean;
  showUserMessage?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorWithContext[] = [];
  private maxLogSize = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle errors with consistent logging and user feedback
   */
  handleError(
    error: Error | string,
    context?: Record<string, any>,
    options: ErrorHandlerOptions = {},
  ): void {
    const { logToConsole = true, logToService = false, showUserMessage = true } = options;

    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const errorWithContext: ErrorWithContext = {
      error: errorObj,
      context,
      timestamp: new Date(),
    };

    // Add to local log
    this.addToLog(errorWithContext);

    // Log to console
    if (logToConsole) {
      this.logToConsole(errorWithContext);
    }

    // Log to external service (placeholder for future implementation)
    if (logToService) {
      this.logToService(errorWithContext);
    }

    // Show user message
    if (showUserMessage) {
      this.showUserMessage(errorObj.message);
    }
  }

  /**
   * Handle async operations with error handling
   */
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>,
    options: ErrorHandlerOptions = {},
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error as Error, context, options);
      return null;
    }
  }

  /**
   * Retry an operation with exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    context?: Record<string, any>,
  ): Promise<T | null> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          this.handleError(lastError, {
            ...context,
            retryAttempts: attempt,
            maxRetries,
          });
          return null;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return null;
  }

  /**
   * Validate input with error handling
   */
  validateInput<T>(
    value: T,
    validator: (value: T) => boolean,
    errorMessage: string,
    context?: Record<string, any>,
  ): boolean {
    try {
      if (!validator(value)) {
        const error = new Error(errorMessage);
        this.handleError(error, context);
        return false;
      }
      return true;
    } catch (error) {
      this.handleError(error as Error, context);
      return false;
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: ErrorWithContext[];
  } {
    const errorsByType: Record<string, number> = {};

    this.errorLog.forEach(({ error }) => {
      const type = error.constructor.name;
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      recentErrors: this.errorLog.slice(-10), // Last 10 errors
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  private addToLog(errorWithContext: ErrorWithContext): void {
    this.errorLog.push(errorWithContext);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
  }

  private logToConsole(errorWithContext: ErrorWithContext): void {
    const { error, context, timestamp } = errorWithContext;

    if (process.env.NODE_ENV !== 'production') {
      console.group(`🚨 Error at ${timestamp.toISOString()}`);
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      if (context) {
        console.error('Context:', context);
      }
      console.groupEnd();
    }
  }

  private logToService(errorWithContext: ErrorWithContext): void {
    // Placeholder for external error reporting service
    // You can integrate with services like Sentry, LogRocket, etc.
    if (process.env.NODE_ENV !== 'production') {
      console.log('Would send to error reporting service:', errorWithContext);
    }
  }

  private showUserMessage(message: string): void {
    // Placeholder for user notification system
    // You can integrate with toast notifications, modals, etc.
    if (process.env.NODE_ENV !== 'production') {
      console.log('Would show user message:', message);
    }
  }
}

// Convenience functions
export const errorHandler = ErrorHandler.getInstance();

export const handleError = (error: Error | string, context?: Record<string, any>) => {
  errorHandler.handleError(error, context);
};

export const withErrorHandling = <T>(
  operation: () => Promise<T>,
  context?: Record<string, any>,
) => {
  return errorHandler.withErrorHandling(operation, context);
};

export const withRetry = <T>(
  operation: () => Promise<T>,
  maxRetries?: number,
  baseDelay?: number,
  context?: Record<string, any>,
) => {
  return errorHandler.withRetry(operation, maxRetries, baseDelay, context);
};

// Common error types
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public operation?: string,
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Error boundary hook
export function useErrorBoundary() {
  return {
    handleError: (error: Error, context?: Record<string, any>) => {
      errorHandler.handleError(error, context);
    },
    getErrorStats: () => errorHandler.getErrorStats(),
  };
}
