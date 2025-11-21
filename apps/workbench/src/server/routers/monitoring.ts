import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { createServicesFromContext } from '../services/ServiceFactory';
import { pythonOCRClient } from '../services/python/PythonOCRClient';
import { pythonConversionClient } from '../services/python/PythonConversionClient';
import { pythonTextClient } from '../services/python/PythonTextClient';

/**
 * Monitoring router for model usage, health, and cost tracking
 */
export const monitoringRouter = router({
  /**
   * Get comprehensive model monitoring data
   */
  getModelMonitoring: publicProcedure.query(async ({ ctx }) => {
    try {
      const { chatService } = createServicesFromContext(ctx);

      // Collect all monitoring data using proper interface methods
      const usage = chatService.getModelUsageStats();
      const capabilities = chatService.getModelCapabilities();
      const health = await chatService.checkAllModelsHealth();

      // Convert capabilities Map to object for JSON serialization
      const capabilitiesObj = capabilities instanceof Map
        ? Object.fromEntries(capabilities)
        : capabilities;

      return {
        usage,
        health,
        capabilities: capabilitiesObj,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        usage: [],
        health: [],
        capabilities: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }),

  /**
   * Get model usage statistics only
   */
  getUsageStats: publicProcedure.query(async ({ ctx }) => {
    try {
      const { chatService } = createServicesFromContext(ctx);

      return {
        usage: chatService.getModelUsageStats(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        usage: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }),

  /**
   * Get model health status
   */
  getHealthStatus: publicProcedure.query(async ({ ctx }) => {
    try {
      const { chatService } = createServicesFromContext(ctx);
      const health = await chatService.checkAllModelsHealth();

      return {
        health,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        health: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }),

  /**
   * Get model capabilities and pricing
   */
  getCapabilities: publicProcedure.query(async ({ ctx }) => {
    try {
      const { chatService } = createServicesFromContext(ctx);
      const capabilities = chatService.getModelCapabilities();

      // Convert Map to object for JSON serialization
      const capabilitiesObj = capabilities instanceof Map
        ? Object.fromEntries(capabilities)
        : capabilities;

      return {
        capabilities: capabilitiesObj,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        capabilities: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }),

  /**
   * Trigger health check for specific model
   */
  checkModelHealth: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { chatService } = createServicesFromContext(ctx);
        const health = chatService.getModelHealthStatus(input.modelId);

        return {
          health,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          health: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * Get Python microservice statistics
   * Shows availability, circuit breaker state, and fallback status
   */
  getPythonServiceStats: publicProcedure.query(() => {
    try {
      const ocrStats = pythonOCRClient.getStats();
      const conversionStats = pythonConversionClient.getStats();
      const textStats = pythonTextClient.getStats();

      return {
        ocr: ocrStats,
        conversion: conversionStats,
        text: textStats,
        summary: {
          allAvailable: ocrStats.available && conversionStats.available && textStats.available,
          anyCircuitOpen:
            ocrStats.circuitBreaker.state === 'OPEN' ||
            conversionStats.circuitBreaker.state === 'OPEN' ||
            textStats.circuitBreaker.state === 'OPEN',
          forceDisabled: ocrStats.forceDisabled || conversionStats.forceDisabled || textStats.forceDisabled,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }),
});