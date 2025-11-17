/**
 * Application-specific model requirements configuration
 *
 * This file defines the specific requirements for each model role in THIS application.
 * Other applications consuming the model discovery layer can define their own requirements.
 */

import { ModelRequirements } from '../services/model/types';

/**
 * Model role definitions for this application
 */
export type ModelRole =
  | 'chat'
  | 'chatFallback'
  | 'analyzer'
  | 'router'
  | 'validator'
  | 'documentUpdateDecision'
  | 'documentUpdateGeneration'
  | 'documentUpdateSummary'
  | 'summarization'
  | 'embedding';

/**
 * Requirements for each model role
 *
 * These can be customized via environment variables or configuration
 */
export const MODEL_REQUIREMENTS: Record<ModelRole, ModelRequirements> = {
  /**
   * Primary chat model - handles general conversations
   * Needs high quality, large context for long conversations
   */
  chat: {
    minInputTokens: 100000,
    minOutputTokens: 4000,
    preferQuality: true,
    preferredProviders: ['anthropic', 'deepseek'],
    // Preference: Claude or DeepSeek
  },

  /**
   * Fallback chat model - used when primary fails
   * Needs to be cheap but still high quality (it's a fallback, not a toy)
   */
  chatFallback: {
    minInputTokens: 100000, // Require large context (ensures full models, not distilled)
    minOutputTokens: 4000,
    maxInputCostPer1M: 0.50,
    preferredProviders: ['deepseek']
    // Preference: DeepSeek chat-v3.1 (full model, not distilled)
  },

  /**
   * Analyzer - determines query complexity
   * Fast, cheap, needs JSON output
   */
  analyzer: {
    minInputTokens: 8000,
    minOutputTokens: 1000,
    requiresJson: true,
    maxInputCostPer1M: 0.50,
    preferSpeed: true,
    preferredProviders: ['deepseek']
    // Preference: DeepSeek or cheaper Claude models
  },

  /**
   * Router - selects which model to use
   * Medium speed/cost, needs JSON output
   */
  router: {
    minInputTokens: 8000,
    minOutputTokens: 1000,
    requiresJson: true,
    maxInputCostPer1M: 1.00,
    preferSpeed: true,
  },

  /**
   * Validator - checks response quality
   * Needs high quality to make good judgments
   */
  validator: {
    minInputTokens: 32000,
    minOutputTokens: 4000,
    preferQuality: true,
    preferredProviders: ['anthropic', 'deepseek']
    // Preference: Claude Sonnet or DeepSeek
  },

  /**
   * Document update decision - determines if doc should be updated
   * Fast, cheap, needs JSON
   */
  documentUpdateDecision: {
    minInputTokens: 8000,
    minOutputTokens: 500,
    requiresJson: true,
    maxInputCostPer1M: 0.50,
    // Preference: DeepSeek
  },

  /**
   * Document update generation - generates updated document content
   * Needs high quality, large context for big documents, high output tokens
   */
  documentUpdateGeneration: {
    minInputTokens: 100000,
    minOutputTokens: 8000,
    preferQuality: true,
    preferredProviders: ['anthropic'],
    // Preference: Claude Sonnet (best for writing)
  },

  /**
   * Document update summary - summarizes changes
   * Medium tokens, cheap
   */
  documentUpdateSummary: {
    minInputTokens: 32000,
    minOutputTokens: 2000,
    maxInputCostPer1M: 0.50,
    // Preference: DeepSeek or Haiku
  },

  /**
   * Conversation summarization - compresses long conversations
   * Large context (to see full history), willing to pay for quality
   */
  summarization: {
    minInputTokens: 100000,
    minOutputTokens: 4000,
    maxInputCostPer1M: 1.00,
    // Preference: Balance of quality and cost
  },

  /**
   * Embedding model - generates vector embeddings
   * Specific modality, specific provider
   */
  embedding: {
    modality: 'text->embedding',
    preferredProviders: ['openai'],
    // Preference: text-embedding-3-small
    customFilter: (model) => {
      // Only select embedding models
      return model.id.includes('embedding');
    },
  },
};

/**
 * Get requirements for a specific role
 * Allows for runtime overrides from environment or configuration
 */
export function getRequirementsForRole(role: ModelRole): ModelRequirements {
  return MODEL_REQUIREMENTS[role];
}

/**
 * Merge custom requirements with defaults
 * Useful for testing or per-request customization
 */
export function mergeRequirements(
  role: ModelRole,
  overrides: Partial<ModelRequirements>
): ModelRequirements {
  return {
    ...MODEL_REQUIREMENTS[role],
    ...overrides,
  };
}
