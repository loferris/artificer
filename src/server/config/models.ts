/**
 * Centralized model configuration
 * Single source of truth for all AI models used throughout the application
 *
 * Models can be loaded either:
 * - From environment variables (static)
 * - From dynamic model discovery (async)
 *
 * Call initializeModels() at server startup before accepting requests.
 */

import { ModelDiscoveryService } from '../services/model/ModelDiscoveryService';
import { logger } from '../utils/logger';

export interface ModelConfig {
  /** Primary chat model for general conversations */
  chat: string;

  /** Fallback chat model if primary fails */
  chatFallback: string;

  /** Model for analyzing query complexity (orchestration) */
  analyzer: string;

  /** Model for routing decisions (orchestration) */
  router: string;

  /** Model for validating responses (orchestration) */
  validator: string;

  /** Model for document update decisions (fast, cheap) */
  documentUpdateDecision: string;

  /** Model for document content generation (high quality) */
  documentUpdateGeneration: string;

  /** Model for document change summaries */
  documentUpdateSummary: string;

  /** Model for conversation summarization */
  summarization: string;

  /** Model for generating embeddings */
  embedding: string;

  /** Dimensions for embedding vectors */
  embeddingDimensions: number;

  /** Available models for orchestration to choose from */
  available: string[];
}

/**
 * Load model configuration from environment variables only
 * Falls back to ModelDiscoveryService hardcoded models if env vars not set
 */
export function loadModelConfigFromEnv(): ModelConfig {
  // Get fallback models from discovery service (the ONLY source of hardcoded models)
  const fallbackModels = ModelDiscoveryService.getFallbackModels();
  const fallbackChat = fallbackModels.find(m => m.id.includes('sonnet'))?.id || fallbackModels[0]?.id || '';
  const fallbackCheap = fallbackModels.find(m => m.id.includes('deepseek'))?.id || fallbackModels[1]?.id || '';
  const fallbackEmbedding = fallbackModels.find(m => m.id.includes('embedding'))?.id || '';

  // Base chat models (with fallback to discovery service defaults)
  const chat = process.env.CHAT_MODEL || fallbackChat;
  const chatFallback = process.env.CHAT_FALLBACK_MODEL || fallbackCheap;

  return {
    // Base chat models
    chat,
    chatFallback,

    // Orchestration models (fall back to chat models)
    analyzer: process.env.ANALYZER_MODEL || chatFallback,
    router: process.env.ROUTER_MODEL || chat,
    validator: process.env.VALIDATOR_MODEL || chat,

    // Document update models (fall back to appropriate chat models)
    documentUpdateDecision: process.env.DOCUMENT_UPDATE_DECISION_MODEL || chatFallback,
    documentUpdateGeneration: process.env.DOCUMENT_UPDATE_GENERATION_MODEL || chat,
    documentUpdateSummary: process.env.DOCUMENT_UPDATE_SUMMARY_MODEL || chatFallback,

    // Summarization model (fall back to cheap model)
    summarization: process.env.SUMMARIZATION_MODEL || chatFallback,

    // Embedding configuration
    embedding: process.env.EMBEDDING_MODEL || fallbackEmbedding,
    embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10),

    // Available models list
    available: process.env.OPENROUTER_MODELS?.split(',').map(m => m.trim()).filter(Boolean) || [chat, chatFallback].filter(Boolean),
  };
}

/**
 * Validate that all required models are configured
 * Logs warnings for missing/invalid models
 */
function validateModelConfig(config: ModelConfig): void {
  const requiredFields: (keyof ModelConfig)[] = [
    'chat',
    'chatFallback',
  ];

  for (const field of requiredFields) {
    const value = config[field];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      logger.error(`[ModelConfig] ${field} is required but not set (this should not happen with fallback models)`);
      throw new Error(`${field} must be configured`);
    }
  }

  // Validate format for OpenRouter models (should contain a slash for provider/model)
  const openRouterModelFields: (keyof ModelConfig)[] = [
    'chat',
    'chatFallback',
    'analyzer',
    'router',
    'validator',
    'documentUpdateDecision',
    'documentUpdateGeneration',
    'documentUpdateSummary',
    'summarization',
  ];

  for (const field of openRouterModelFields) {
    const value = config[field];
    if (typeof value === 'string' && !value.includes('/')) {
      logger.warn(`[ModelConfig] ${field}="${value}" may be invalid (expected format: provider/model-name)`);
    }
  }

  // Log configuration in development
  if (process.env.NODE_ENV === 'development') {
    logger.info('[ModelConfig] Model configuration loaded:', {
      chat: config.chat,
      chatFallback: config.chatFallback,
      analyzer: config.analyzer,
      router: config.router,
      validator: config.validator,
      documentUpdateDecision: config.documentUpdateDecision,
      documentUpdateGeneration: config.documentUpdateGeneration,
      documentUpdateSummary: config.documentUpdateSummary,
      summarization: config.summarization,
      embedding: config.embedding,
      embeddingDimensions: config.embeddingDimensions,
      availableCount: config.available.length,
    });
  }
}

/**
 * Global model configuration (initialized asynchronously)
 */
let modelConfig: ModelConfig | null = null;

/**
 * Initialize model configuration
 * Must be called once at server startup before accepting requests
 *
 * @returns Promise that resolves to the initialized config
 */
export async function initializeModels(): Promise<ModelConfig> {
  if (modelConfig) {
    logger.debug('[ModelConfig] Already initialized, returning cached config');
    return modelConfig;
  }

  const isDynamicEnabled = process.env.USE_DYNAMIC_MODEL_DISCOVERY === 'true';

  if (isDynamicEnabled) {
    logger.info('[ModelConfig] Loading with dynamic model discovery');
    const { loadDynamicModelConfig } = await import('./dynamicModels');
    modelConfig = await loadDynamicModelConfig();
  } else {
    logger.info('[ModelConfig] Loading from environment variables');
    modelConfig = loadModelConfigFromEnv();
  }

  validateModelConfig(modelConfig);
  return modelConfig;
}

/**
 * Get current model configuration
 * Automatically initializes with env vars if not already initialized
 *
 * @returns Current model configuration
 */
export function getModels(): ModelConfig {
  if (!modelConfig) {
    // Fallback: initialize synchronously with env vars (safe for build time)
    try {
      // Only log warnings in runtime, not during build
      if (process.env.VERCEL_ENV || process.env.NODE_ENV === 'production') {
        // Silent initialization during build
        modelConfig = loadModelConfigFromEnv();
      } else {
        logger.warn('[ModelConfig] Models not initialized, falling back to env vars');
        modelConfig = loadModelConfigFromEnv();
        validateModelConfig(modelConfig);
      }
    } catch (error) {
      // If validation fails during build, just load the config without validation
      modelConfig = loadModelConfigFromEnv();
    }
  }
  return modelConfig;
}

/**
 * Helper to get a specific model with runtime override support
 * Useful for testing or feature flags
 */
export function getModel(
  role: keyof Omit<ModelConfig, 'available' | 'embeddingDimensions'>,
  override?: string
): string {
  if (override && override.trim() !== '') {
    return override;
  }
  return getModels()[role] as string;
}

/**
 * Check if a model is in the available list
 */
export function isModelAvailable(modelName: string): boolean {
  return getModels().available.includes(modelName);
}

/**
 * Get pricing tier for common models (rough heuristic estimate)
 * Useful for cost-aware routing
 *
 * NOTE: This is a simple heuristic based on model name patterns.
 * For accurate pricing, use ModelDiscoveryService to fetch actual costs.
 */
export function getModelTier(modelName: string): 'cheap' | 'medium' | 'expensive' | 'unknown' {
  if (modelName.includes('deepseek')) return 'cheap';
  if (modelName.includes('haiku') || modelName.includes('gpt-4o-mini')) return 'medium';
  if (modelName.includes('sonnet') || modelName.includes('gpt-4o')) return 'expensive';
  return 'unknown';
}

// Legacy export for backward compatibility
// Eagerly initialize to avoid Proxy issues during SSR/build
let _legacyModels: ModelConfig | null = null;

/**
 * Get legacy models export (backward compatible)
 * Initializes synchronously on first access
 */
function getLegacyModels(): ModelConfig {
  if (!_legacyModels) {
    _legacyModels = getModels();
  }
  return _legacyModels;
}

// Export as Proxy for property access compatibility
export const models = new Proxy({} as ModelConfig, {
  get(_, prop) {
    return getLegacyModels()[prop as keyof ModelConfig];
  },
});
