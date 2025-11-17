import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { createServicesFromContext } from '../services/ServiceFactory';

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
      
      // Get the assistant instance from the chat service
      const assistant = (chatService as any).assistant;
      
      if (!assistant) {
        return {
          usage: [],
          health: [],
          capabilities: {},
          error: 'Assistant not available',
          timestamp: new Date().toISOString(),
        };
      }

      // Collect all monitoring data
      const usage = assistant.getModelUsageStats?.() || [];
      const capabilities = assistant.getModelCapabilities?.() || new Map();
      const health = assistant.checkAllModelsHealth ? await assistant.checkAllModelsHealth() : [];

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
      const assistant = (chatService as any).assistant;
      
      if (!assistant?.getModelUsageStats) {
        return { 
          usage: [], 
          error: 'Usage stats not available',
          timestamp: new Date().toISOString(),
        };
      }

      return {
        usage: assistant.getModelUsageStats(),
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
      const assistant = (chatService as any).assistant;
      
      if (!assistant?.checkAllModelsHealth) {
        return { 
          health: [], 
          error: 'Health monitoring not available',
          timestamp: new Date().toISOString(),
        };
      }

      const health = await assistant.checkAllModelsHealth();
      
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
      const assistant = (chatService as any).assistant;
      
      if (!assistant?.getModelCapabilities) {
        return { 
          capabilities: {}, 
          error: 'Capabilities not available',
          timestamp: new Date().toISOString(),
        };
      }

      const capabilities = assistant.getModelCapabilities();
      
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
        const assistant = (chatService as any).assistant;
        
        if (!assistant?.getModelHealthStatus) {
          return { 
            health: null, 
            error: 'Health monitoring not available',
            timestamp: new Date().toISOString(),
          };
        }

        // Get current health status for the model
        const health = assistant.getModelHealthStatus(input.modelId);
        
        return {
          health: health instanceof Map ? Object.fromEntries(health) : health,
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
});