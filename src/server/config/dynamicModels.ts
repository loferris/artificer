/**
 * Dynamic Model Discovery & Selection
 *
 * This module provides dynamic model discovery from OpenRouter API.
 * It automatically selects the best models based on requirements and pricing.
 *
 * Usage:
 * - Set USE_DYNAMIC_MODEL_DISCOVERY=true in .env to enable
 * - Individual model env vars (CHAT_MODEL, ANALYZER_MODEL, etc.) still override discovery
 * - Models are discovered at startup and refreshed periodically
 */

import { ModelDiscoveryService } from '../services/model/ModelDiscoveryService';
import { ModelFilterService } from '../services/model/ModelFilterService';
import { MODEL_REQUIREMENTS, ModelRole } from './modelRequirements';
import type { ModelConfig } from './models';
import { logger } from '../utils/logger';

/**
 * Global discovery service instance (singleton)
 */
let discoveryService: ModelDiscoveryService | null = null;
let filterService: ModelFilterService | null = null;

/**
 * Initialize model discovery services
 */
function initializeServices(): void {
  if (!discoveryService) {
    discoveryService = new ModelDiscoveryService();
  }
  if (!filterService) {
    filterService = new ModelFilterService();
  }
}

/**
 * Discover and select the best model for a given role
 */
async function discoverModelForRole(role: ModelRole): Promise<string | null> {
  try {
    initializeServices();

    const models = await discoveryService!.getModels();
    const requirements = MODEL_REQUIREMENTS[role];

    const result = filterService!.selectModel(models, requirements);

    if (!result) {
      logger.warn(`[DynamicModels] No model found for role: ${role}`);
      return null;
    }

    logger.info(`[DynamicModels] Selected model for ${role}`, {
      modelId: result.modelId,
      score: result.score,
      reason: result.reason,
    });

    return result.modelId;
  } catch (error) {
    logger.error(`[DynamicModels] Failed to discover model for role: ${role}`, error);
    return null;
  }
}

/**
 * Load model configuration using dynamic discovery
 * Falls back to env vars if discovery fails
 */
export async function loadDynamicModelConfig(): Promise<ModelConfig> {
  const isDynamicEnabled = process.env.USE_DYNAMIC_MODEL_DISCOVERY === 'true';

  if (!isDynamicEnabled) {
    logger.debug('[DynamicModels] Dynamic discovery disabled, using env vars only');
    return loadFromEnv();
  }

  logger.info('[DynamicModels] Loading models using dynamic discovery');

  try {
    // Discover models for each role (with env var overrides)
    // Note: Embeddings are NOT discovered from OpenRouter since they don't provide embedding models
    // Use Promise.allSettled to handle individual role failures gracefully
    const roles: ModelRole[] = [
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

    const envOverrides = [
      process.env.CHAT_MODEL,
      process.env.CHAT_FALLBACK_MODEL,
      process.env.ANALYZER_MODEL,
      process.env.ROUTER_MODEL,
      process.env.VALIDATOR_MODEL,
      process.env.DOCUMENT_UPDATE_DECISION_MODEL,
      process.env.DOCUMENT_UPDATE_GENERATION_MODEL,
      process.env.DOCUMENT_UPDATE_SUMMARY_MODEL,
      process.env.SUMMARIZATION_MODEL,
    ];

    const results = await Promise.allSettled(
      roles.map((role, index) => getModelWithOverride(role, envOverrides[index]))
    );

    const [
      chat,
      chatFallback,
      analyzer,
      router,
      validator,
      documentUpdateDecision,
      documentUpdateGeneration,
      documentUpdateSummary,
      summarization,
    ] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        logger.warn(`[DynamicModels] Failed to discover ${roles[index]}`, {
          error: result.reason instanceof Error ? result.reason.message : result.reason
        });
        return null;
      }
    });

    // Get available models list
    const availableModels = await getAvailableModelsList();

    // Get fallback models from discovery service (the ONLY source of hardcoded models)
    const fallbackModels = ModelDiscoveryService.getFallbackModels();
    const fallbackChat = fallbackModels.find(m => m.id.includes('sonnet'))?.id || fallbackModels[0]?.id;
    const fallbackCheap = fallbackModels.find(m => m.id.includes('deepseek'))?.id || fallbackModels[1]?.id;
    const fallbackEmbedding = fallbackModels.find(m => m.id.includes('embedding'))?.id || '';

    // Embedding model: use env var or fallback (OpenRouter doesn't provide embeddings)
    const embedding = process.env.EMBEDDING_MODEL || fallbackEmbedding;

    const config: ModelConfig = {
      chat: chat || fallbackChat || '',
      chatFallback: chatFallback || fallbackCheap || '',
      analyzer: analyzer || chatFallback || fallbackCheap || '',
      router: router || chat || fallbackChat || '',
      validator: validator || chat || fallbackChat || '',
      documentUpdateDecision: documentUpdateDecision || chatFallback || fallbackCheap || '',
      documentUpdateGeneration: documentUpdateGeneration || chat || fallbackChat || '',
      documentUpdateSummary: documentUpdateSummary || chatFallback || fallbackCheap || '',
      summarization: summarization || chatFallback || fallbackCheap || '',
      embedding,
      embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10),
      available: availableModels,
    };

    logger.info('[DynamicModels] Model configuration loaded successfully', {
      chat: config.chat,
      chatFallback: config.chatFallback,
      totalAvailable: config.available.length,
    });

    return config;
  } catch (error) {
    logger.error('[DynamicModels] Failed to load dynamic config, falling back to env vars', error);
    return loadFromEnv();
  }
}

/**
 * Get model with env var override or dynamic discovery
 */
async function getModelWithOverride(
  role: ModelRole,
  envOverride?: string
): Promise<string | null> {
  // Env var takes precedence
  if (envOverride && envOverride.trim() !== '') {
    logger.debug(`[DynamicModels] Using env var override for ${role}: ${envOverride}`);
    return envOverride;
  }

  // Discover dynamically
  return await discoverModelForRole(role);
}

/**
 * Get available models list for orchestration
 */
async function getAvailableModelsList(): Promise<string[]> {
  // Check env var first
  const envModels = process.env.OPENROUTER_MODELS;
  if (envModels) {
    return envModels.split(',').map(m => m.trim()).filter(Boolean);
  }

  // Discover from API
  try {
    initializeServices();
    const models = await discoveryService!.getModels();

    // Filter to only chat/completion models (exclude embeddings, etc.)
    const chatModels = models.filter(m =>
      !m.id.includes('embedding') &&
      m.context_length >= 8000 &&
      m.pricing.prompt > 0
    );

    return chatModels.map(m => m.id);
  } catch (error) {
    logger.error('[DynamicModels] Failed to get available models', error);
    return [];
  }
}

/**
 * Load configuration from environment variables only (original behavior)
 * Uses fallback models from discovery service if env vars not set
 */
function loadFromEnv(): ModelConfig {
  const chat = process.env.CHAT_MODEL || '';
  const chatFallback = process.env.CHAT_FALLBACK_MODEL || '';

  // Get fallback models from discovery service (the ONLY source of hardcoded models)
  const fallbackModels = ModelDiscoveryService.getFallbackModels();
  const fallbackChat = fallbackModels.find(m => m.id.includes('sonnet'))?.id || fallbackModels[0]?.id || '';
  const fallbackCheap = fallbackModels.find(m => m.id.includes('deepseek'))?.id || fallbackModels[1]?.id || '';
  const fallbackEmbedding = fallbackModels.find(m => m.id.includes('embedding'))?.id || '';

  const chatModel = chat || fallbackChat;
  const chatFallbackModel = chatFallback || fallbackCheap;

  return {
    chat: chatModel,
    chatFallback: chatFallbackModel,
    analyzer: process.env.ANALYZER_MODEL || chatFallbackModel,
    router: process.env.ROUTER_MODEL || chatModel,
    validator: process.env.VALIDATOR_MODEL || chatModel,
    documentUpdateDecision: process.env.DOCUMENT_UPDATE_DECISION_MODEL || chatFallbackModel,
    documentUpdateGeneration: process.env.DOCUMENT_UPDATE_GENERATION_MODEL || chatModel,
    documentUpdateSummary: process.env.DOCUMENT_UPDATE_SUMMARY_MODEL || chatFallbackModel,
    summarization: process.env.SUMMARIZATION_MODEL || chatFallbackModel,
    embedding: process.env.EMBEDDING_MODEL || fallbackEmbedding,
    embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10),
    available: process.env.OPENROUTER_MODELS?.split(',').map(m => m.trim()).filter(Boolean) || [chatModel, chatFallbackModel].filter(Boolean),
  };
}

/**
 * Refresh model discovery cache
 * Call this periodically or via admin endpoint
 */
export async function refreshModelCache(): Promise<void> {
  initializeServices();
  await discoveryService!.refresh();
  logger.info('[DynamicModels] Model cache refreshed');
}

/**
 * Get discovery service instance (for testing/admin)
 */
export function getDiscoveryService(): ModelDiscoveryService {
  initializeServices();
  return discoveryService!;
}

/**
 * Get filter service instance (for testing/admin)
 */
export function getFilterService(): ModelFilterService {
  initializeServices();
  return filterService!;
}
