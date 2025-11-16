import { logger } from '../../utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Model capability metadata for routing decisions
 */
export interface ModelMetadata {
  id: string;
  tier: 'cheap' | 'mid' | 'expensive';
  strengths: string[];
  costPer1kTokens: number;
  maxTokens: number;
}

/**
 * OpenRouter API model response format
 */
interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  top_provider?: {
    max_completion_tokens?: number;
  };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

/**
 * Config file format for model metadata
 */
interface ModelConfig {
  models: Array<{
    pattern: string; // Regex pattern or exact match
    tier: 'cheap' | 'mid' | 'expensive';
    strengths: string[];
    costPer1kTokens: number;
    maxTokens?: number;
  }>;
  defaults: {
    tier: 'cheap' | 'mid' | 'expensive';
    strengths: string[];
    costPer1kTokens: number;
    maxTokens: number;
  };
}

/**
 * ModelRegistry - Manages model metadata with multiple fallback strategies
 *
 * Strategy:
 * 1. Fetch from OpenRouter API (most accurate, real-time pricing)
 * 2. Fallback to config file (reliable, manually maintained)
 * 3. Infer from model name (last resort, smart defaults)
 */
export class ModelRegistry {
  private cache: Map<string, ModelMetadata> = new Map();
  private configFallback: Map<string, ModelMetadata> = new Map();
  private configPatterns: ModelConfig['models'] = [];
  private lastFetch: number = 0;
  private readonly CACHE_TTL_MS = 3600000; // 1 hour

  constructor(private configPath?: string) {
    // Load static config as fallback
    this.loadConfigFile();
    logger.info('[ModelRegistry] Initialized with config fallback', {
      configModels: this.configFallback.size,
    });
  }

  /**
   * Initialize the registry by fetching from OpenRouter
   * This should be called on app startup
   */
  async initialize(): Promise<void> {
    try {
      await this.fetchFromOpenRouter();
      logger.info('[ModelRegistry] ✅ Loaded model metadata from OpenRouter API', {
        cachedModels: this.cache.size,
      });
    } catch (error) {
      logger.warn('[ModelRegistry] ⚠️ Failed to fetch from OpenRouter, using config fallback', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Use config fallback (already loaded in constructor)
      this.cache = new Map(this.configFallback);
    }
  }

  /**
   * Get metadata for a specific model
   * Returns cached data or infers from model name
   */
  getMetadata(modelId: string): ModelMetadata {
    // Check cache first
    let metadata = this.cache.get(modelId);
    if (metadata) {
      return metadata;
    }

    // Try config patterns
    metadata = this.matchConfigPattern(modelId);
    if (metadata) {
      // Cache for future use
      this.cache.set(modelId, metadata);
      return metadata;
    }

    // Last resort: infer from name
    metadata = this.inferFromName(modelId);
    this.cache.set(modelId, metadata);

    logger.debug('[ModelRegistry] Inferred metadata for unknown model', {
      modelId,
      tier: metadata.tier,
    });

    return metadata;
  }

  /**
   * Get metadata for multiple models
   */
  getMetadataMap(modelIds: string[]): Map<string, ModelMetadata> {
    const result = new Map<string, ModelMetadata>();
    for (const id of modelIds) {
      result.set(id, this.getMetadata(id));
    }
    return result;
  }

  /**
   * Refresh cache from OpenRouter (can be called periodically)
   */
  async refresh(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetch < this.CACHE_TTL_MS) {
      logger.debug('[ModelRegistry] Cache still fresh, skipping refresh');
      return;
    }

    await this.fetchFromOpenRouter();
  }

  /**
   * Fetch model metadata from OpenRouter API
   */
  private async fetchFromOpenRouter(): Promise<void> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not set');
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://github.com/ai-workflow-engine',
        'X-Title': 'AI Workflow Engine',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenRouterModelsResponse = await response.json();

    // Clear existing cache
    this.cache.clear();

    // Process models
    for (const model of data.data) {
      const metadata = this.convertOpenRouterModel(model);
      this.cache.set(model.id, metadata);
    }

    this.lastFetch = Date.now();

    logger.info('[ModelRegistry] Fetched models from OpenRouter', {
      modelCount: this.cache.size,
    });
  }

  /**
   * Convert OpenRouter model format to our metadata format
   */
  private convertOpenRouterModel(model: OpenRouterModel): ModelMetadata {
    // Parse pricing (OpenRouter returns strings)
    const promptCost = parseFloat(model.pricing.prompt);
    const completionCost = parseFloat(model.pricing.completion);

    // Average cost per 1k tokens (prompt + completion)
    const costPer1kTokens = ((promptCost + completionCost) / 2) * 1000;

    // Infer tier based on cost
    const tier = this.inferTier(costPer1kTokens);

    // Infer strengths from model name and description
    const strengths = this.inferStrengthsFromDescription(model.id, model.description);

    // Get max tokens
    const maxTokens = model.top_provider?.max_completion_tokens || model.context_length || 4096;

    return {
      id: model.id,
      tier,
      strengths,
      costPer1kTokens,
      maxTokens,
    };
  }

  /**
   * Load model metadata from config file
   */
  private loadConfigFile(): void {
    try {
      const configPath = this.configPath || path.join(process.cwd(), 'config', 'models.json');

      // Check if file exists
      if (!fs.existsSync(configPath)) {
        logger.debug('[ModelRegistry] Config file not found, using built-in defaults');
        this.loadBuiltInDefaults();
        return;
      }

      const configData = fs.readFileSync(configPath, 'utf-8');
      const config: ModelConfig = JSON.parse(configData);

      this.configPatterns = config.models;

      // Pre-populate cache with exact matches
      for (const modelConfig of config.models) {
        // If pattern doesn't contain wildcards, add directly
        if (!modelConfig.pattern.includes('*') && !modelConfig.pattern.includes('.*')) {
          this.configFallback.set(modelConfig.pattern, {
            id: modelConfig.pattern,
            tier: modelConfig.tier,
            strengths: modelConfig.strengths,
            costPer1kTokens: modelConfig.costPer1kTokens,
            maxTokens: modelConfig.maxTokens || 4096,
          });
        }
      }

      logger.info('[ModelRegistry] Loaded config file', {
        configPath,
        patterns: this.configPatterns.length,
        exactMatches: this.configFallback.size,
      });
    } catch (error) {
      logger.error('[ModelRegistry] Failed to load config file', error);
      this.loadBuiltInDefaults();
    }
  }

  /**
   * Load built-in default model configurations
   */
  private loadBuiltInDefaults(): void {
    this.configPatterns = [
      {
        pattern: 'deepseek/*',
        tier: 'cheap',
        strengths: ['code', 'analysis', 'speed'],
        costPer1kTokens: 0.00014,
      },
      {
        pattern: 'anthropic/claude-3-haiku*',
        tier: 'cheap',
        strengths: ['chat', 'speed', 'analysis'],
        costPer1kTokens: 0.00025,
      },
      {
        pattern: 'openai/gpt-4o-mini*',
        tier: 'cheap',
        strengths: ['chat', 'analysis', 'speed'],
        costPer1kTokens: 0.00015,
      },
      {
        pattern: 'anthropic/claude-3-5-sonnet*',
        tier: 'mid',
        strengths: ['code', 'reasoning', 'analysis', 'creative'],
        costPer1kTokens: 0.003,
      },
      {
        pattern: 'openai/gpt-4o*',
        tier: 'mid',
        strengths: ['code', 'reasoning', 'creative'],
        costPer1kTokens: 0.0025,
      },
      {
        pattern: 'anthropic/claude-3-opus*',
        tier: 'expensive',
        strengths: ['reasoning', 'research', 'creative', 'analysis'],
        costPer1kTokens: 0.015,
      },
      {
        pattern: 'openai/o1*',
        tier: 'expensive',
        strengths: ['reasoning', 'analysis', 'research'],
        costPer1kTokens: 0.015,
      },
    ];
  }

  /**
   * Match model ID against config patterns
   */
  private matchConfigPattern(modelId: string): ModelMetadata | null {
    for (const pattern of this.configPatterns) {
      const regex = new RegExp('^' + pattern.pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(modelId)) {
        return {
          id: modelId,
          tier: pattern.tier,
          strengths: pattern.strengths,
          costPer1kTokens: pattern.costPer1kTokens,
          maxTokens: pattern.maxTokens || 4096,
        };
      }
    }
    return null;
  }

  /**
   * Infer model tier from cost
   */
  private inferTier(costPer1kTokens: number): 'cheap' | 'mid' | 'expensive' {
    if (costPer1kTokens < 0.001) return 'cheap';
    if (costPer1kTokens < 0.005) return 'mid';
    return 'expensive';
  }

  /**
   * Infer strengths from model name and description
   */
  private inferStrengthsFromDescription(modelId: string, description?: string): string[] {
    const strengths: string[] = [];
    const text = `${modelId} ${description || ''}`.toLowerCase();

    // Code indicators
    if (text.includes('code') || text.includes('deepseek') || text.includes('codestral')) {
      strengths.push('code');
    }

    // Reasoning indicators
    if (text.includes('reasoning') || text.includes('o1') || text.includes('opus') || text.includes('sonnet')) {
      strengths.push('reasoning');
    }

    // Creative indicators
    if (text.includes('creative') || text.includes('writing') || text.includes('opus')) {
      strengths.push('creative');
    }

    // Analysis indicators
    if (text.includes('analysis') || text.includes('research') || text.includes('deepseek')) {
      strengths.push('analysis');
    }

    // Speed indicators
    if (text.includes('fast') || text.includes('haiku') || text.includes('mini') || text.includes('turbo')) {
      strengths.push('speed');
    }

    // Default to chat if no strengths identified
    if (strengths.length === 0) {
      strengths.push('chat');
    }

    return strengths;
  }

  /**
   * Infer metadata from model name only (last resort)
   */
  private inferFromName(modelId: string): ModelMetadata {
    const lower = modelId.toLowerCase();

    // Infer tier
    let tier: 'cheap' | 'mid' | 'expensive' = 'mid';
    let costPer1kTokens = 0.001;

    if (lower.includes('haiku') || lower.includes('mini') || lower.includes('deepseek') || lower.includes('gemma')) {
      tier = 'cheap';
      costPer1kTokens = 0.0005;
    } else if (lower.includes('opus') || lower.includes('o1') || lower.includes('claude-3-opus')) {
      tier = 'expensive';
      costPer1kTokens = 0.015;
    } else if (lower.includes('sonnet') || lower.includes('gpt-4')) {
      tier = 'mid';
      costPer1kTokens = 0.003;
    }

    // Infer strengths
    const strengths = this.inferStrengthsFromDescription(modelId);

    return {
      id: modelId,
      tier,
      strengths,
      costPer1kTokens,
      maxTokens: 4096, // Conservative default
    };
  }
}
