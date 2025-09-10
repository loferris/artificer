import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LogLevel } from '../logger';

describe('Logger Utility', () => {
  const originalEnv = process.env;
  const originalConsole = console;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.debug = vi.fn();

    process.env = { ...originalEnv };

    // Clear module cache to ensure fresh logger instance
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
  });

  describe('LogLevel Enum', () => {
    it('should have correct enum values', () => {
      expect(LogLevel.ERROR).toBe(0);
      expect(LogLevel.WARN).toBe(1);
      expect(LogLevel.INFO).toBe(2);
      expect(LogLevel.DEBUG).toBe(3);
    });
  });

  describe('Logger Instance', () => {
    it('should export logger instance', async () => {
      const { logger } = await import('../logger');
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    it('should have all required methods', async () => {
      const { logger } = await import('../logger');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.apiRequest).toBe('function');
      expect(typeof logger.rateLimitHit).toBe('function');
      expect(typeof logger.dbQuery).toBe('function');
      expect(typeof logger.assistantRequest).toBe('function');
    });
  });

  describe('Basic Logging Methods', () => {
    it('should log error messages', async () => {
      const { logger } = await import('../logger');
      logger.error('Test error message');

      expect(console.error).toHaveBeenCalled();
      const logOutput = JSON.parse((console.error as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'ERROR',
        message: 'Test error message',
      });
    });

    it('should log error messages with error object', async () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      const { logger } = await import('../logger');
      logger.error('Test error message', error);

      expect(console.error).toHaveBeenCalled();
      const logOutput = JSON.parse((console.error as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'ERROR',
        message: 'Test error message',
        error: {
          name: 'Error',
          message: 'Test error',
          stack: expect.any(String),
        },
      });
    });

    it('should log error messages with metadata', async () => {
      const { logger } = await import('../logger');
      logger.error('Test error message', undefined, { userId: 'test-user' });

      expect(console.error).toHaveBeenCalled();
      const logOutput = JSON.parse((console.error as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'ERROR',
        message: 'Test error message',
        meta: {
          userId: 'test-user',
        },
      });
    });

    it('should log warning messages', async () => {
      process.env.LOG_LEVEL = 'warn';
      const { logger } = await import('../logger');
      logger.warn('Test warning message');

      expect(console.warn).toHaveBeenCalled();
      const logOutput = JSON.parse((console.warn as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'WARN',
        message: 'Test warning message',
      });
    });

    it('should log warning messages with metadata', async () => {
      process.env.LOG_LEVEL = 'warn';
      const { logger } = await import('../logger');
      logger.warn('Test warning message', { userId: 'test-user' });

      expect(console.warn).toHaveBeenCalled();
      const logOutput = JSON.parse((console.warn as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'WARN',
        message: 'Test warning message',
        meta: {
          userId: 'test-user',
        },
      });
    });

    it('should log info messages', async () => {
      process.env.LOG_LEVEL = 'info';
      const { logger } = await import('../logger');
      logger.info('Test info message');

      expect(console.log).toHaveBeenCalled();
      const logOutput = JSON.parse((console.log as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'INFO',
        message: 'Test info message',
      });
    });

    it('should log info messages with metadata', async () => {
      process.env.LOG_LEVEL = 'info';
      const { logger } = await import('../logger');
      logger.info('Test info message', { userId: 'test-user' });

      expect(console.log).toHaveBeenCalled();
      const logOutput = JSON.parse((console.log as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'INFO',
        message: 'Test info message',
        meta: {
          userId: 'test-user',
        },
      });
    });

    it('should log debug messages', async () => {
      process.env.LOG_LEVEL = 'debug';
      const { logger } = await import('../logger');
      logger.debug('Test debug message');

      expect(console.log).toHaveBeenCalled();
      const logOutput = JSON.parse((console.log as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'DEBUG',
        message: 'Test debug message',
      });
    });

    it('should log debug messages with metadata', async () => {
      process.env.LOG_LEVEL = 'debug';
      const { logger } = await import('../logger');
      logger.debug('Test debug message', { userId: 'test-user' });

      expect(console.log).toHaveBeenCalled();
      const logOutput = JSON.parse((console.log as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'DEBUG',
        message: 'Test debug message',
        meta: {
          userId: 'test-user',
        },
      });
    });
  });

  describe('Specialized Logging Methods', () => {
    it('should log API requests', async () => {
      process.env.LOG_LEVEL = 'info';
      const { logger } = await import('../logger');
      logger.apiRequest('GET', '/api/test', 100, 200, 'test-user');

      expect(console.log).toHaveBeenCalled();
      const logOutput = JSON.parse((console.log as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'INFO',
        message: 'API Request',
        meta: {
          method: 'GET',
          path: '/api/test',
          duration: 100,
          status: 200,
          userId: 'test-user',
        },
      });
    });

    it('should log rate limit hits', async () => {
      process.env.LOG_LEVEL = 'warn';
      const { logger } = await import('../logger');
      logger.rateLimitHit('test-identifier', '/api/test', Date.now() + 60000);

      expect(console.warn).toHaveBeenCalled();
      const logOutput = JSON.parse((console.warn as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'WARN',
        message: 'Rate limit exceeded',
        meta: {
          identifier: expect.stringMatching(/^test-iden/),
          endpoint: '/api/test',
          resetTime: expect.any(String),
        },
      });
    });

    it('should log database queries with error', async () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Database connection failed');
      const { logger } = await import('../logger');
      logger.dbQuery('SELECT * FROM users', 50, error);

      expect(console.error).toHaveBeenCalled();
      const logOutput = JSON.parse((console.error as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'ERROR',
        message: 'Database query failed',
        error: {
          name: 'Error',
          message: 'Database connection failed',
          stack: expect.any(String),
        },
        meta: {
          query: expect.stringMatching(/^SELECT \* FROM users/),
          duration: 50,
        },
      });
    });

    it('should log database queries when ENABLE_QUERY_LOGGING is true', async () => {
      process.env.ENABLE_QUERY_LOGGING = 'true';
      process.env.LOG_LEVEL = 'debug';
      const { logger } = await import('../logger');
      logger.dbQuery('SELECT * FROM users', 50);

      expect(console.log).toHaveBeenCalled();
      const logOutput = JSON.parse((console.log as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'DEBUG',
        message: 'Database query',
        meta: {
          query: expect.stringMatching(/^SELECT \* FROM users/),
          duration: 50,
        },
      });
    });

    it('should not log database queries when ENABLE_QUERY_LOGGING is not true', async () => {
      delete process.env.ENABLE_QUERY_LOGGING;
      const { logger } = await import('../logger');
      logger.dbQuery('SELECT * FROM users', 50);

      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should log assistant requests', async () => {
      process.env.LOG_LEVEL = 'info';
      const { logger } = await import('../logger');
      logger.assistantRequest('gpt-4', 100, 0.001, 2000);

      expect(console.log).toHaveBeenCalled();
      const logOutput = JSON.parse((console.log as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'INFO',
        message: 'Assistant request',
        meta: {
          model: 'gpt-4',
          tokens: 100,
          cost: 0.001,
          duration: 2000,
        },
      });
    });

    it('should log assistant requests with error', async () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Assistant request failed');
      const { logger } = await import('../logger');
      logger.assistantRequest('gpt-4', 100, 0.001, 2000, error);

      expect(console.error).toHaveBeenCalled();
      const logOutput = JSON.parse((console.error as vi.Mock).mock.calls[0][0]);
      expect(logOutput).toEqual({
        timestamp: expect.any(String),
        level: 'ERROR',
        message: 'Assistant request failed',
        error: {
          name: 'Error',
          message: 'Assistant request failed',
          stack: expect.any(String),
        },
        meta: {
          model: 'gpt-4',
          tokens: 100,
          cost: 0.001,
          duration: 2000,
        },
      });
    });
  });

  describe('Log Filtering', () => {
    it('should not log debug messages when log level is ERROR', async () => {
      delete process.env.LOG_LEVEL; // Default to ERROR level
      const { logger } = await import('../logger');
      logger.debug('Test debug message');

      expect(console.log).not.toHaveBeenCalled();
    });

    it('should not log info messages when log level is ERROR', async () => {
      delete process.env.LOG_LEVEL; // Default to ERROR level
      const { logger } = await import('../logger');
      logger.info('Test info message');

      expect(console.log).not.toHaveBeenCalled();
    });

    it('should not log warning messages when log level is ERROR', async () => {
      delete process.env.LOG_LEVEL; // Default to ERROR level
      const { logger } = await import('../logger');
      logger.warn('Test warning message');

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should log error messages when log level is ERROR', async () => {
      delete process.env.LOG_LEVEL; // Default to ERROR level
      const { logger } = await import('../logger');
      logger.error('Test error message');

      expect(console.error).toHaveBeenCalled();
    });
  });
});
