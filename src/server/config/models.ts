/**
 * Centralized model configuration
 * Single source of truth for all AI models used throughout the application
 *
 * Models are loaded from environment variables with fallback to ModelDiscoveryService.
 * Specialized models (analyzer, validator, etc.) fall back to base chat models if not set.
 */

import { ModelDiscoveryService } from '../services/model/ModelDiscoveryService';

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
 * Load model configuration from environment variables
 * Falls back to ModelDiscoveryService hardcoded models if env vars not set
 * Optional specialized models fall back to base chat models
 */
function loadModelConfig(): ModelConfig {
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
      console.error(`❌ Model config: ${field} is required but not set (this should not happen with fallback models)`);
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
      console.warn(`⚠️  Model config: ${field}="${value}" may be invalid (expected format: provider/model-name)`);
    }
  }

  // Log configuration in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📋 Model Configuration:');
    console.log(`  Chat: ${config.chat}`);
    console.log(`  Chat Fallback: ${config.chatFallback}`);
    console.log(`  Analyzer: ${config.analyzer}`);
    console.log(`  Router: ${config.router}`);
    console.log(`  Validator: ${config.validator}`);
    console.log(`  Document Update Decision: ${config.documentUpdateDecision}`);
    console.log(`  Document Update Generation: ${config.documentUpdateGeneration}`);
    console.log(`  Document Update Summary: ${config.documentUpdateSummary}`);
    console.log(`  Summarization: ${config.summarization}`);
    console.log(`  Embedding: ${config.embedding} (${config.embeddingDimensions}D)`);
    console.log(`  Available Models: ${config.available.join(', ')}`);
  }
}

/**
 * Global model configuration instance
 * Loaded once at startup
 */
export const models: ModelConfig = loadModelConfig();

// Validate on load
validateModelConfig(models);

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
  return models[role] as string;
}

/**
 * Check if a model is in the available list
 */
export function isModelAvailable(modelName: string): boolean {
  return models.available.includes(modelName);
}

/**
 * Get pricing tier for common models (rough estimates)
 * Useful for cost-aware routing
 */
export function getModelTier(modelName: string): 'cheap' | 'medium' | 'expensive' | 'unknown' {
  if (modelName.includes('deepseek')) return 'cheap';
  if (modelName.includes('haiku') || modelName.includes('gpt-4o-mini')) return 'medium';
  if (modelName.includes('sonnet') || modelName.includes('gpt-4o')) return 'expensive';
  return 'unknown';
}
