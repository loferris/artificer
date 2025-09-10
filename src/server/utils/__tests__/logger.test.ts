import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '../logger'; // Import the class, not the default instance
import type pino from 'pino';

describe('Logger Class', () => {
  let mockPinoInstance: pino.Logger;
  let logger: Logger;

  beforeEach(() => {
    // Create a mock pino instance for each test
    mockPinoInstance = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    } as unknown as pino.Logger;

    // Create a new Logger instance with the mock
    logger = new Logger(mockPinoInstance);
  });

  it('should call pino.error with correct parameters', () => {
    const error = new Error('Test error');
    const meta = { userId: '123' };
    logger.error('An error occurred', error, meta);
    expect(mockPinoInstance.error).toHaveBeenCalledWith(
      { err: error, ...meta },
      'An error occurred',
    );
  });

  it('should call pino.warn with correct parameters', () => {
    const meta = { rateLimit: true };
    logger.warn('A warning occurred', meta);
    expect(mockPinoInstance.warn).toHaveBeenCalledWith(meta, 'A warning occurred');
  });

  it('should call pino.info with correct parameters', () => {
    const meta = { context: 'test' };
    logger.info('An info message', meta);
    expect(mockPinoInstance.info).toHaveBeenCalledWith(meta, 'An info message');
  });

  it('should call pino.debug with correct parameters', () => {
    const meta = { verbose: true };
    logger.debug('A debug message', meta);
    expect(mockPinoInstance.debug).toHaveBeenCalledWith(meta, 'A debug message');
  });

  describe('Specialized Logging Methods', () => {
    it('apiRequest should call pino.info', () => {
      logger.apiRequest('GET', '/api/test', 100, 200, 'user-1');
      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        {
          request: { method: 'GET', path: '/api/test', userId: 'user-1' },
          response: { status: 200, duration: 100 },
        },
        'API Request',
      );
    });

    it('rateLimitHit should call pino.warn', () => {
      const resetTime = Date.now() + 60000;
      logger.rateLimitHit('user-ip', '/login', resetTime);
      expect(mockPinoInstance.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          ratelimit: expect.objectContaining({ endpoint: '/login' }),
        }),
        'Rate limit exceeded',
      );
    });

    it('dbQuery should call pino.debug when no error and logging is enabled', () => {
      process.env.ENABLE_QUERY_LOGGING = 'true';
      logger.dbQuery('SELECT *', 50);
      expect(mockPinoInstance.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          db: { query: 'SELECT *...', duration: 50 },
        }),
        'Database query',
      );
      delete process.env.ENABLE_QUERY_LOGGING;
    });

    it('dbQuery should call pino.error on error', () => {
      const error = new Error('Query failed');
      logger.dbQuery('SELECT *', 50, error);
      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: error,
          db: { query: 'SELECT *...', duration: 50 },
        }),
        'Database query failed',
      );
    });

    it('assistantRequest should call pino.info', () => {
      logger.assistantRequest('test-model', 100, 0.01, 500);
      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        { model: 'test-model', tokens: 100, cost: 0.01, duration: 500 },
        'Assistant request',
      );
    });

    it('assistantRequest should call pino.error on error', () => {
      const error = new Error('Assistant failed');
      logger.assistantRequest('test-model', 100, 0.01, 500, error);
      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        { err: error, model: 'test-model', tokens: 100, cost: 0.01, duration: 500 },
        'Assistant request failed',
      );
    });
  });
});
