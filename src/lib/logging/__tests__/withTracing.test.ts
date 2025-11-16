import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withTracing, extractTracingContext } from '../withTracing';
import { H } from '@highlight-run/node';
import { enhancedLogger } from '../EnhancedLogger';

// Mock Highlight
vi.mock('@highlight-run/node', () => ({
  H: {
    startActiveSpan: vi.fn(),
    runWithHeaders: vi.fn(),
    startSpan: vi.fn(() => ({
      setStatus: vi.fn(),
      addEvent: vi.fn(),
      recordException: vi.fn(),
      end: vi.fn(),
    })),
  },
}));

// Mock EnhancedLogger
vi.mock('../EnhancedLogger', () => ({
  enhancedLogger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      logPerformance: vi.fn(),
    })),
    isHighlightEnabled: vi.fn(() => true),
  },
}));

describe('withTracing', () => {
  let mockSpan: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock span object
    mockSpan = {
      setStatus: vi.fn(),
      addEvent: vi.fn(),
      recordException: vi.fn(),
      end: vi.fn(),
    };

    // Mock child to return a logger-like object with all required methods
    enhancedLogger.child.mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      logPerformance: vi.fn(),
      logChainStage: vi.fn(),
      logCost: vi.fn(),
      logSecurityEvent: vi.fn(),
    });

    // Default Highlight behavior - execute the function
    H.runWithHeaders.mockImplementation((_headers, fn) => fn());
    H.startActiveSpan.mockImplementation((_name, _opts, fn) => fn(mockSpan));
  });

  it('should wrap a function and track timing', async () => {
    const testFn = vi.fn(async (x: number) => x * 2);
    const mockChildLogger = {
      logPerformance: vi.fn(),
      error: vi.fn(),
    };
    enhancedLogger.child.mockReturnValueOnce(mockChildLogger as any);

    const wrapped = withTracing(testFn, {
      operationName: 'test.operation',
      requestId: '123',
    });

    const result = await wrapped(5);

    expect(result).toBe(10);
    expect(testFn).toHaveBeenCalledWith(5);
    expect(enhancedLogger.child).toHaveBeenCalledWith({
      requestId: '123',
      sessionId: undefined,
      component: 'tracing',
    });
    expect(mockChildLogger.logPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: '123' }),
      'test.operation',
      expect.any(Number),
      expect.objectContaining({ success: true })
    );
  });

  it('should execute function when Highlight is enabled', async () => {
    const testFn = vi.fn(async () => 'result');

    const wrapped = withTracing(testFn, {
      operationName: 'test.operation',
      requestId: '123',
      attributes: { foo: 'bar' },
    });

    const result = await wrapped();

    expect(result).toBe('result');
    expect(testFn).toHaveBeenCalled();

    // Highlight tracing is handled by SDK internally when H.init() is called
    // withTracing focuses on performance logging
  });

  it('should execute function when Highlight is disabled', async () => {
    enhancedLogger.isHighlightEnabled.mockReturnValueOnce(false);

    const testFn = vi.fn(async () => 'result');

    const wrapped = withTracing(testFn, {
      operationName: 'test.operation',
    });

    const result = await wrapped();

    expect(result).toBe('result');
    expect(testFn).toHaveBeenCalled();
  });

  it('should log errors when operation fails', async () => {
    const error = new Error('Test error');
    const mockChildLogger = {
      logPerformance: vi.fn(),
      error: vi.fn(),
    };
    enhancedLogger.child.mockReturnValueOnce(mockChildLogger as any);

    const testFn = vi.fn(async () => {
      throw error;
    });

    const wrapped = withTracing(testFn, {
      operationName: 'test.operation',
      requestId: '123',
    });

    await expect(wrapped()).rejects.toThrow('Test error');

    expect(mockChildLogger.error).toHaveBeenCalledWith(
      expect.anything(),
      'Operation failed: test.operation',
      error,
      expect.objectContaining({
        success: false,
        duration: expect.any(Number),
      })
    );
  });

  it('should include component in context', async () => {
    const testFn = vi.fn(async () => 'result');

    const wrapped = withTracing(testFn, {
      operationName: 'test.operation',
      component: 'database',
      requestId: '123',
    });

    await wrapped();

    expect(enhancedLogger.child).toHaveBeenCalledWith({
      requestId: '123',
      sessionId: undefined,
      component: 'database',
    });
  });

  it('should preserve function context (this)', async () => {
    class TestClass {
      value = 42;

      async getValue() {
        return this.value;
      }
    }

    const instance = new TestClass();

    const wrapped = withTracing(instance.getValue, {
      operationName: 'test.getValue',
    });

    const result = await wrapped.call(instance);

    expect(result).toBe(42);
  });

  it('should pass through all arguments', async () => {
    const testFn = vi.fn(async (a: number, b: string, c: boolean) => {
      return { a, b, c };
    });

    const wrapped = withTracing(testFn, {
      operationName: 'test.operation',
    });

    const result = await wrapped(1, 'two', true);

    expect(result).toEqual({ a: 1, b: 'two', c: true });
    expect(testFn).toHaveBeenCalledWith(1, 'two', true);
  });

  it('should include custom attributes in performance logs', async () => {
    const testFn = vi.fn(async () => 'result');
    const mockChildLogger = {
      logPerformance: vi.fn(),
      error: vi.fn(),
    };
    enhancedLogger.child.mockReturnValueOnce(mockChildLogger as any);

    const wrapped = withTracing(testFn, {
      operationName: 'test.operation',
      attributes: {
        userId: '123',
        action: 'create',
      },
    });

    await wrapped();

    expect(mockChildLogger.logPerformance).toHaveBeenCalledWith(
      expect.anything(),
      'test.operation',
      expect.any(Number),
      expect.objectContaining({
        userId: '123',
        action: 'create',
        success: true,
      })
    );
  });
});

describe('extractTracingContext', () => {
  it('should extract request ID from x-request-id header', () => {
    const context = extractTracingContext({
      'x-request-id': 'req-123',
    });

    expect(context).toEqual({
      requestId: 'req-123',
      sessionId: undefined,
    });
  });

  it('should extract request ID from x-trace-id header', () => {
    const context = extractTracingContext({
      'x-trace-id': 'trace-456',
    });

    expect(context).toEqual({
      requestId: 'trace-456',
      sessionId: undefined,
    });
  });

  it('should prefer x-request-id over x-trace-id', () => {
    const context = extractTracingContext({
      'x-request-id': 'req-123',
      'x-trace-id': 'trace-456',
    });

    expect(context).toEqual({
      requestId: 'req-123',
      sessionId: undefined,
    });
  });

  it('should extract session ID from x-session-id header', () => {
    const context = extractTracingContext({
      'x-request-id': 'req-123',
      'x-session-id': 'session-789',
    });

    expect(context).toEqual({
      requestId: 'req-123',
      sessionId: 'session-789',
    });
  });

  it('should handle missing headers', () => {
    const context = extractTracingContext({});

    expect(context).toEqual({
      requestId: undefined,
      sessionId: undefined,
    });
  });

  it('should handle headers with undefined values', () => {
    const context = extractTracingContext({
      'x-request-id': undefined,
      'x-session-id': undefined,
    });

    expect(context).toEqual({
      requestId: undefined,
      sessionId: undefined,
    });
  });
});
