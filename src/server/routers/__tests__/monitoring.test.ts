import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { monitoringRouter } from '../monitoring';

describe('Monitoring Router', () => {
  const createMockContext = () => ({
    db: null,
    user: null,
    req: { 
      headers: { 'user-agent': 'test-agent' },
      on: vi.fn(),
      complete: false,
    } as any,
    res: {
      setHeader: vi.fn(),
    } as any,
    signal: new AbortController().signal,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getModelMonitoring', () => {
    it('should return monitoring data structure', async () => {
      const caller = monitoringRouter.createCaller(createMockContext());

      const result = await caller.getModelMonitoring();

      expect(result).toHaveProperty('usage');
      expect(result).toHaveProperty('health');
      expect(result).toHaveProperty('capabilities');
      expect(result).toHaveProperty('timestamp');
      expect(Array.isArray(result.usage)).toBe(true);
      expect(Array.isArray(result.health)).toBe(true);
      expect(typeof result.capabilities).toBe('object');
    });

    it('should handle missing assistant gracefully', async () => {
      const caller = monitoringRouter.createCaller(createMockContext());
      const result = await caller.getModelMonitoring();

      expect(result.error).toBeDefined();
      expect(result.usage).toEqual([]);
      expect(result.health).toEqual([]);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics structure', async () => {
      const caller = monitoringRouter.createCaller(createMockContext());
      const result = await caller.getUsageStats();

      expect(result).toHaveProperty('usage');
      expect(result).toHaveProperty('timestamp');
      expect(Array.isArray(result.usage)).toBe(true);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status structure', async () => {
      const caller = monitoringRouter.createCaller(createMockContext());
      const result = await caller.getHealthStatus();

      expect(result).toHaveProperty('health');
      expect(result).toHaveProperty('timestamp');
      expect(Array.isArray(result.health)).toBe(true);
    });
  });

  describe('getCapabilities', () => {
    it('should return capabilities structure', async () => {
      const caller = monitoringRouter.createCaller(createMockContext());
      const result = await caller.getCapabilities();

      expect(result).toHaveProperty('capabilities');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.capabilities).toBe('object');
    });
  });

  describe('checkModelHealth', () => {
    it('should check specific model health', async () => {
      const caller = monitoringRouter.createCaller(createMockContext());
      const result = await caller.checkModelHealth({ modelId: 'deepseek-chat' });

      expect(result).toHaveProperty('health');
      expect(result).toHaveProperty('timestamp');
    });
  });
});