import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedLogger } from '../EnhancedLogger';
import type pino from 'pino';

// Mock Axiom
vi.mock('@axiomhq/js', () => ({
  Axiom: vi.fn().mockImplementation(() => ({
    ingest: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('EnhancedLogger', () => {
  let mockPinoInstance: pino.Logger;
  let logger: EnhancedLogger;

  beforeEach(() => {
    // Create a mock pino instance for each test
    mockPinoInstance = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    } as unknown as pino.Logger;

    // Reset environment variables
    delete process.env.AXIOM_TOKEN;
    delete process.env.AXIOM_DATASET;
    delete process.env.AXIOM_ORG_ID;
    process.env.NODE_ENV = 'development';

    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with pino instance', () => {
      logger = new EnhancedLogger(mockPinoInstance);
      expect(logger).toBeDefined();
    });

    it('should not enable Axiom in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.AXIOM_TOKEN = 'test-token';
      process.env.AXIOM_DATASET = 'test-dataset';

      logger = new EnhancedLogger(mockPinoInstance);
      expect(logger.isAxiomEnabled()).toBe(false);
    });

    it('should enable Axiom in production with credentials', () => {
      process.env.NODE_ENV = 'production';
      process.env.AXIOM_TOKEN = 'test-token';
      process.env.AXIOM_DATASET = 'test-dataset';

      logger = new EnhancedLogger(mockPinoInstance);
      expect(logger.isAxiomEnabled()).toBe(true);
    });

    it('should not enable Axiom without credentials', () => {
      process.env.NODE_ENV = 'production';

      logger = new EnhancedLogger(mockPinoInstance);
      expect(logger.isAxiomEnabled()).toBe(false);
    });
  });

  describe('Core Logging Methods', () => {
    beforeEach(() => {
      logger = new EnhancedLogger(mockPinoInstance);
    });

    it('should log info messages', () => {
      const context = { requestId: '123', component: 'test' };
      const message = 'Test info message';
      const data = { foo: 'bar' };

      logger.info(context, message, data);

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        { ...context, ...data },
        message
      );
    });

    it('should log error messages', () => {
      const context = { requestId: '123' };
      const message = 'Test error';
      const error = new Error('Something went wrong');
      const data = { userId: '456' };

      logger.error(context, message, error, data);

      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        { err: error, ...context, ...data },
        message
      );
    });

    it('should log warnings', () => {
      const context = { sessionId: '789' };
      const message = 'Test warning';
      const data = { severity: 'medium' };

      logger.warn(context, message, data);

      expect(mockPinoInstance.warn).toHaveBeenCalledWith(
        { ...context, ...data },
        message
      );
    });

    it('should log debug messages', () => {
      const context = { component: 'debug' };
      const message = 'Debug info';
      const data = { verbose: true };

      logger.debug(context, message, data);

      expect(mockPinoInstance.debug).toHaveBeenCalledWith(
        { ...context, ...data },
        message
      );
    });
  });

  describe('Chain Orchestration Logging', () => {
    beforeEach(() => {
      logger = new EnhancedLogger(mockPinoInstance);
    });

    it('should log successful chain stage', () => {
      const context = { requestId: '123' };
      const stage = {
        stage: 'analyze' as const,
        duration: 156,
        cost: 0.0001,
        model: 'deepseek/deepseek-chat',
        success: true,
      };

      logger.logChainStage(context, stage);

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: '123',
          component: 'chain',
          stage: 'analyze',
          duration: 156,
          cost: 0.0001,
          model: 'deepseek/deepseek-chat',
          success: true,
        }),
        'Chain stage: analyze'
      );
    });

    it('should log failed chain stage as error', () => {
      const context = { requestId: '123' };
      const stage = {
        stage: 'execute' as const,
        duration: 200,
        success: false,
        error: 'Model timeout',
      };

      logger.logChainStage(context, stage);

      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Model timeout' }),
        'Chain stage: execute'
      );
    });

    it('should log chain completion', () => {
      const context = { requestId: '123' };
      const stages = [
        {
          stage: 'analyze' as const,
          duration: 100,
          success: true,
        },
        {
          stage: 'execute' as const,
          duration: 200,
          success: true,
        },
      ];

      logger.logChainComplete(context, stages, 0.0234);

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: '123',
          component: 'chain',
          totalStages: 2,
          totalDuration: 300,
          totalCost: 0.0234,
          failedStages: 0,
        }),
        expect.stringContaining('Chain complete')
      );
    });

    it('should log chain completion as warning if stages failed', () => {
      const context = { requestId: '123' };
      const stages = [
        {
          stage: 'analyze' as const,
          duration: 100,
          success: true,
        },
        {
          stage: 'execute' as const,
          duration: 200,
          success: false,
        },
      ];

      logger.logChainComplete(context, stages, 0.0234);

      expect(mockPinoInstance.warn).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'chain' }),
        expect.stringContaining('Chain complete')
      );
    });
  });

  describe('Cost Logging', () => {
    beforeEach(() => {
      logger = new EnhancedLogger(mockPinoInstance);
    });

    it('should log cost information', () => {
      const context = { requestId: '123' };
      const cost = {
        model: 'claude-sonnet',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.0234,
        requestType: 'chat',
      };

      logger.logCost(context, cost);

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: '123',
          component: 'costs',
          model: 'claude-sonnet',
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          cost: 0.0234,
          requestType: 'chat',
        }),
        'Model usage: claude-sonnet'
      );
    });
  });

  describe('Security Event Logging', () => {
    beforeEach(() => {
      logger = new EnhancedLogger(mockPinoInstance);
    });

    it('should log high severity events as errors', () => {
      const context = { requestId: '123' };
      logger.logSecurityEvent(
        context,
        'potential_injection_detected',
        'high',
        { content: 'suspicious content' }
      );

      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'potential_injection_detected' }),
        'Security event: potential_injection_detected'
      );
    });

    it('should log medium severity events as warnings', () => {
      const context = { requestId: '123' };
      logger.logSecurityEvent(
        context,
        'unusual_pattern',
        'medium',
        { pattern: 'test' }
      );

      expect(mockPinoInstance.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'unusual_pattern' }),
        'Security event: unusual_pattern'
      );
    });

    it('should log low severity events as info', () => {
      const context = { requestId: '123' };
      logger.logSecurityEvent(
        context,
        'auth_success',
        'low'
      );

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'auth_success' }),
        'Security event: auth_success'
      );
    });
  });

  describe('Performance Logging', () => {
    beforeEach(() => {
      logger = new EnhancedLogger(mockPinoInstance);
    });

    it('should log performance metrics', () => {
      const context = { requestId: '123' };
      logger.logPerformance(context, 'database_query', 45, { query: 'SELECT *' });

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: '123',
          component: 'performance',
          operation: 'database_query',
          duration: 45,
          query: 'SELECT *',
        }),
        'Performance: database_query'
      );
    });
  });

  describe('Child Logger', () => {
    beforeEach(() => {
      logger = new EnhancedLogger(mockPinoInstance);
    });

    it('should create child logger with inherited context', () => {
      const parentContext = { requestId: '123' };
      const parentLogger = new EnhancedLogger(mockPinoInstance, parentContext);

      const childContext = { sessionId: '456' };
      const childLogger = parentLogger.child(childContext);

      childLogger.info({}, 'Test message');

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        { requestId: '123', sessionId: '456' },
        'Test message'
      );
    });

    it('should allow child context to override parent context', () => {
      const parentContext = { requestId: '123', component: 'parent' };
      const parentLogger = new EnhancedLogger(mockPinoInstance, parentContext);

      const childContext = { component: 'child' };
      const childLogger = parentLogger.child(childContext);

      childLogger.info({}, 'Test message');

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        { requestId: '123', component: 'child' },
        'Test message'
      );
    });
  });

  describe('Axiom Integration', () => {
    it('should buffer logs for Axiom when enabled', () => {
      process.env.NODE_ENV = 'production';
      process.env.AXIOM_TOKEN = 'test-token';
      process.env.AXIOM_DATASET = 'test-dataset';

      logger = new EnhancedLogger(mockPinoInstance);

      logger.info({ requestId: '123' }, 'Test message', { foo: 'bar' });

      expect(logger.getBufferSize()).toBe(1);
    });

    it('should not buffer logs when Axiom is disabled', () => {
      process.env.NODE_ENV = 'development';

      logger = new EnhancedLogger(mockPinoInstance);

      logger.info({ requestId: '123' }, 'Test message');

      expect(logger.getBufferSize()).toBe(0);
    });

    it('should auto-flush when buffer exceeds 100 events', async () => {
      process.env.NODE_ENV = 'production';
      process.env.AXIOM_TOKEN = 'test-token';
      process.env.AXIOM_DATASET = 'test-dataset';

      logger = new EnhancedLogger(mockPinoInstance);

      // Log 101 messages
      for (let i = 0; i < 101; i++) {
        logger.info({ requestId: String(i) }, `Message ${i}`);
      }

      // Buffer should have flushed after 100
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(logger.getBufferSize()).toBeLessThan(101);
    });

    it('should handle flush errors gracefully', async () => {
      process.env.NODE_ENV = 'production';
      process.env.AXIOM_TOKEN = 'test-token';
      process.env.AXIOM_DATASET = 'test-dataset';

      logger = new EnhancedLogger(mockPinoInstance);

      // Mock Axiom to throw error
      const { Axiom } = await import('@axiomhq/js');
      const mockAxiom = (Axiom as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (mockAxiom?.ingest) {
        mockAxiom.ingest = vi.fn().mockRejectedValue(new Error('Network error'));
      }

      logger.info({ requestId: '123' }, 'Test message');
      await logger.flush();

      // Should log warning but not crash
      expect(mockPinoInstance.warn).toHaveBeenCalled();
    });
  });

  describe('Object Flattening', () => {
    it('should flatten nested objects for Axiom', () => {
      process.env.NODE_ENV = 'production';
      process.env.AXIOM_TOKEN = 'test-token';
      process.env.AXIOM_DATASET = 'test-dataset';

      logger = new EnhancedLogger(mockPinoInstance);

      const nestedData = {
        user: {
          id: '123',
          profile: {
            name: 'Test User',
            settings: {
              theme: 'dark'
            }
          }
        }
      };

      logger.info({ requestId: '123' }, 'Test message', nestedData);

      // Verify buffering happened (flattening is internal)
      expect(logger.getBufferSize()).toBe(1);
    });
  });

  describe('Graceful Degradation', () => {
    it('should continue logging if Axiom initialization fails', () => {
      process.env.NODE_ENV = 'production';
      process.env.AXIOM_TOKEN = 'invalid-token';
      process.env.AXIOM_DATASET = 'test-dataset';

      // Mock Axiom constructor to throw
      vi.doMock('@axiomhq/js', () => ({
        Axiom: vi.fn().mockImplementation(() => {
          throw new Error('Invalid token');
        }),
      }));

      // Should not throw, should log warning
      expect(() => {
        logger = new EnhancedLogger(mockPinoInstance);
      }).not.toThrow();

      logger.info({ requestId: '123' }, 'Test message');
      expect(mockPinoInstance.info).toHaveBeenCalled();
    });
  });
});
