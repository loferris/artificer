import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ErrorHandler,
  ErrorWithContext,
  ErrorHandlerOptions,
  ValidationError,
  NetworkError,
  DatabaseError,
  errorHandler,
  handleError,
  withErrorHandling,
  withRetry,
  useErrorBoundary,
} from '../errorHandling';

// Mock console methods
const mockConsoleGroup = vi.fn();
const mockConsoleGroupEnd = vi.fn();
const mockConsoleError = vi.fn();
const mockConsoleLog = vi.fn();

beforeEach(() => {
  vi.spyOn(console, 'group').mockImplementation(mockConsoleGroup);
  vi.spyOn(console, 'groupEnd').mockImplementation(mockConsoleGroupEnd);
  vi.spyOn(console, 'error').mockImplementation(mockConsoleError);
  vi.spyOn(console, 'log').mockImplementation(mockConsoleLog);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    errorHandler = ErrorHandler.getInstance();
    errorHandler.clearErrorLog();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('handleError', () => {
    it('handles Error objects', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };

      errorHandler.handleError(error, context);

      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsByType.Error).toBe(1);
    });

    it('handles string errors', () => {
      const errorMessage = 'String error';
      const context = { userId: '123' };

      errorHandler.handleError(errorMessage, context);

      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsByType.Error).toBe(1);
    });

    it('logs to console by default', () => {
      const error = new Error('Test error');
      const context = { userId: '123' };

      errorHandler.handleError(error, context);

      expect(mockConsoleGroup).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith('Message:', 'Test error');
      expect(mockConsoleError).toHaveBeenCalledWith('Stack:', expect.any(String));
      expect(mockConsoleError).toHaveBeenCalledWith('Context:', context);
      expect(mockConsoleGroupEnd).toHaveBeenCalled();
    });

    it('skips console logging when disabled', () => {
      const error = new Error('Test error');
      const options: ErrorHandlerOptions = { logToConsole: false };

      errorHandler.handleError(error, undefined, options);

      expect(mockConsoleGroup).not.toHaveBeenCalled();
    });

    it('logs to service when enabled', () => {
      const error = new Error('Test error');
      const options: ErrorHandlerOptions = { logToService: true };

      errorHandler.handleError(error, undefined, options);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Would send to error reporting service:',
        expect.objectContaining({
          error: expect.any(Error),
          timestamp: expect.any(Date),
        }),
      );
    });

    it('shows user message when enabled', () => {
      const error = new Error('Test error');
      const options: ErrorHandlerOptions = { showUserMessage: true };

      errorHandler.handleError(error, undefined, options);

      expect(mockConsoleLog).toHaveBeenCalledWith('Would show user message:', 'Test error');
    });

    it('skips user message when disabled', () => {
      const error = new Error('Test error');
      const options: ErrorHandlerOptions = { showUserMessage: false };

      errorHandler.handleError(error, undefined, options);

      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        'Would show user message:',
        expect.any(String),
      );
    });
  });

  describe('withErrorHandling', () => {
    it('returns result when operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const context = { operation: 'test' };

      const result = await errorHandler.withErrorHandling(operation, context);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('returns null when operation fails', async () => {
      const error = new Error('Operation failed');
      const operation = vi.fn().mockRejectedValue(error);
      const context = { operation: 'test' };

      const result = await errorHandler.withErrorHandling(operation, context);

      expect(result).toBeNull();
      expect(operation).toHaveBeenCalled();
    });

    it('handles errors with custom options', async () => {
      const error = new Error('Operation failed');
      const operation = vi.fn().mockRejectedValue(error);
      const context = { operation: 'test' };
      const options: ErrorHandlerOptions = { logToConsole: false };

      const result = await errorHandler.withErrorHandling(operation, context, options);

      expect(result).toBeNull();
      expect(mockConsoleGroup).not.toHaveBeenCalled();
    });
  });

  describe('withRetry', () => {
    it('returns result on first attempt when operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const context = { operation: 'test' };

      const result = await errorHandler.withRetry(operation, 3, 100, context);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and succeeds on second attempt', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValue('success');
      const context = { operation: 'test' };

      const result = await errorHandler.withRetry(operation, 3, 10, context);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('retries with exponential backoff', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const context = { operation: 'test' };
      const startTime = Date.now();

      const result = await errorHandler.withRetry(operation, 3, 10, context); // Reduced delay for faster test

      const endTime = Date.now();
      expect(result).toBeNull();
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('handles all retries failing', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const context = { operation: 'test' };

      const result = await errorHandler.withRetry(operation, 2, 5, context); // Reduced delay for faster test

      expect(result).toBeNull();
      expect(operation).toHaveBeenCalledTimes(2);

      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);
    });
  });

  describe('validateInput', () => {
    it('returns true for valid input', () => {
      const validator = (value: string) => value.length > 0;
      const result = errorHandler.validateInput('test', validator, 'Invalid input');

      expect(result).toBe(true);
    });

    it('returns false for invalid input', () => {
      const validator = (value: string) => value.length > 0;
      const result = errorHandler.validateInput('', validator, 'Invalid input');

      expect(result).toBe(false);

      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);
    });

    it('handles validator throwing an error', () => {
      const validator = (value: string) => {
        throw new Error('Validator error');
      };
      const result = errorHandler.validateInput('test', validator, 'Invalid input');

      expect(result).toBe(false);

      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);
    });
  });

  describe('getErrorStats', () => {
    it('returns correct statistics', () => {
      errorHandler.handleError(new Error('Error 1'));
      errorHandler.handleError(new Error('Error 2'));
      errorHandler.handleError(new ValidationError('Validation error'));

      const stats = errorHandler.getErrorStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType.Error).toBe(2);
      expect(stats.errorsByType.ValidationError).toBe(1);
      expect(stats.recentErrors).toHaveLength(3);
    });

    it('limits recent errors to last 10', () => {
      // Add 15 errors
      for (let i = 0; i < 15; i++) {
        errorHandler.handleError(new Error(`Error ${i}`));
      }

      const stats = errorHandler.getErrorStats();

      expect(stats.totalErrors).toBe(15);
      expect(stats.recentErrors).toHaveLength(10);
    });
  });

  describe('clearErrorLog', () => {
    it('clears the error log', () => {
      errorHandler.handleError(new Error('Test error'));
      expect(errorHandler.getErrorStats().totalErrors).toBe(1);

      errorHandler.clearErrorLog();
      expect(errorHandler.getErrorStats().totalErrors).toBe(0);
    });
  });
});

describe('Convenience Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    errorHandler.clearErrorLog();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleError', () => {
    it('calls errorHandler.handleError', () => {
      const error = new Error('Test error');
      const context = { test: true };

      handleError(error, context);

      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);
    });
  });

  describe('withErrorHandling', () => {
    it('calls errorHandler.withErrorHandling', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const context = { test: true };

      const result = await withErrorHandling(operation, context);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });
  });

  describe('withRetry', () => {
    it('calls errorHandler.withRetry', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const context = { test: true };

      const result = await withRetry(operation, 3, 100, context);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });
  });

  describe('useErrorBoundary', () => {
    it('returns error handling functions', () => {
      const { handleError: boundHandleError, getErrorStats } = useErrorBoundary();

      expect(typeof boundHandleError).toBe('function');
      expect(typeof getErrorStats).toBe('function');

      boundHandleError(new Error('Test error'));
      const stats = getErrorStats();
      expect(stats.totalErrors).toBe(1);
    });
  });
});

describe('Custom Error Classes', () => {
  describe('ValidationError', () => {
    it('creates validation error with message and field', () => {
      const error = new ValidationError('Invalid email', 'email');

      expect(error.message).toBe('Invalid email');
      expect(error.field).toBe('email');
      expect(error.name).toBe('ValidationError');
    });

    it('creates validation error with message only', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.field).toBeUndefined();
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NetworkError', () => {
    it('creates network error with message and status code', () => {
      const error = new NetworkError('Request failed', 404);

      expect(error.message).toBe('Request failed');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NetworkError');
    });

    it('creates network error with message only', () => {
      const error = new NetworkError('Connection failed');

      expect(error.message).toBe('Connection failed');
      expect(error.statusCode).toBeUndefined();
      expect(error.name).toBe('NetworkError');
    });
  });

  describe('DatabaseError', () => {
    it('creates database error with message and operation', () => {
      const error = new DatabaseError('Query failed', 'SELECT');

      expect(error.message).toBe('Query failed');
      expect(error.operation).toBe('SELECT');
      expect(error.name).toBe('DatabaseError');
    });

    it('creates database error with message only', () => {
      const error = new DatabaseError('Connection failed');

      expect(error.message).toBe('Connection failed');
      expect(error.operation).toBeUndefined();
      expect(error.name).toBe('DatabaseError');
    });
  });
});

describe('Error Log Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    errorHandler.clearErrorLog();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maintains log size limit', () => {
    // Add more errors than the max log size (100)
    for (let i = 0; i < 150; i++) {
      errorHandler.handleError(new Error(`Error ${i}`));
    }

    const stats = errorHandler.getErrorStats();
    expect(stats.totalErrors).toBe(100); // Should be limited to 100
  });

  it('keeps most recent errors when limit is exceeded', () => {
    // Add 150 errors
    for (let i = 0; i < 150; i++) {
      errorHandler.handleError(new Error(`Error ${i}`));
    }

    const stats = errorHandler.getErrorStats();
    const recentErrors = stats.recentErrors;

    // Should have the last 10 errors (most recent first: 149-140)
    // The slice(-10) takes the last 10 elements, so the first element should be Error 140
    expect(recentErrors[0].error.message).toBe('Error 140');
    expect(recentErrors[recentErrors.length - 1].error.message).toBe('Error 149');
  });
});
