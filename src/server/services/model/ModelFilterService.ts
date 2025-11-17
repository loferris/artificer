/**
 * ModelFilterService - Filters and selects models based on requirements
 *
 * Provides an abstract layer for model selection that consuming applications
 * can customize with their own requirements and thresholds.
 */

import { logger } from '../../utils/logger';
import {
  OpenRouterModel,
  ModelRequirements,
  ModelSelectionResult,
} from './types';

export class ModelFilterService {
  /**
   * Select the best model matching the given requirements
   */
  selectModel(
    availableModels: OpenRouterModel[],
    requirements: ModelRequirements
  ): ModelSelectionResult | null {
    const candidates = this.filterModels(availableModels, requirements);

    if (candidates.length === 0) {
      logger.warn('[ModelFilter] No models matched requirements', {
        totalModels: availableModels.length,
        requirements,
      });
      return null;
    }

    // Score and rank candidates
    const scored = candidates.map(model => ({
      model,
      score: this.scoreModel(model, requirements),
    }));

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];

    logger.info('[ModelFilter] Selected model', {
      modelId: best.model.id,
      score: best.score,
      candidateCount: candidates.length,
    });

    return {
      modelId: best.model.id,
      model: best.model,
      score: best.score,
      reason: this.explainSelection(best.model, requirements),
    };
  }

  /**
   * Filter models that meet minimum requirements
   */
  filterModels(
    models: OpenRouterModel[],
    requirements: ModelRequirements
  ): OpenRouterModel[] {
    return models.filter(model => {
      // Check minimum input tokens
      if (requirements.minInputTokens && model.context_length < requirements.minInputTokens) {
        return false;
      }

      // Check minimum output tokens
      if (requirements.minOutputTokens) {
        const maxOutput = model.top_provider?.max_completion_tokens || 0;
        if (maxOutput < requirements.minOutputTokens) {
          return false;
        }
      }

      // Check maximum input cost
      if (requirements.maxInputCostPer1M && model.pricing.prompt > requirements.maxInputCostPer1M) {
        return false;
      }

      // Check maximum output cost
      if (requirements.maxOutputCostPer1M && model.pricing.completion > requirements.maxOutputCostPer1M) {
        return false;
      }

      // Check preferred providers
      if (requirements.preferredProviders && requirements.preferredProviders.length > 0) {
        const provider = this.extractProvider(model.id);
        if (!requirements.preferredProviders.includes(provider)) {
          return false;
        }
      }

      // Check excluded providers
      if (requirements.excludedProviders && requirements.excludedProviders.length > 0) {
        const provider = this.extractProvider(model.id);
        if (requirements.excludedProviders.includes(provider)) {
          return false;
        }
      }

      // Check modality
      if (requirements.modality && model.architecture?.modality !== requirements.modality) {
        return false;
      }

      // Apply custom filter if provided
      if (requirements.customFilter && !requirements.customFilter(model)) {
        return false;
      }

      // Exclude free models (they have rate limits and are unreliable for production)
      // Free models are marked with :free suffix or have $0 pricing
      if (model.id.includes(':free') || (model.pricing.prompt === 0 && model.pricing.completion === 0)) {
        return false;
      }

      // Exclude very small models (too unreliable for production)
      // Models with 1B-3B parameters tend to produce poor quality outputs
      if (model.id.includes('-1b-') || model.id.includes('-3b-')) {
        return false;
      }

      // For quality tasks, enforce minimum cost floor to avoid ultra-cheap tiny models
      // If preferSpeed is not set, assume quality matters
      if (!requirements.preferSpeed) {
        const avgCost = (model.pricing.prompt + model.pricing.completion) / 2;
        // Models cheaper than $0.10/1M average are suspiciously cheap (likely tiny/poor quality)
        if (avgCost < 0.10) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Score a model based on how well it matches preferences
   * Returns a score between 0 and 1
   */
  private scoreModel(model: OpenRouterModel, requirements: ModelRequirements): number {
    let score = 0.5; // Base score

    // Prefer quality: higher context = better (log scale to handle large ranges)
    if (requirements.preferQuality) {
      // Use log scale: 32k=0.5, 128k=0.75, 512k=0.9, 1M+=1.0
      const contextScore = Math.min(Math.log10(model.context_length / 8000) / Math.log10(125), 1);
      score += contextScore * 0.2;
    }

    // Prefer speed/cost: lower price = better
    if (requirements.preferSpeed || !requirements.preferQuality) {
      const avgCost = (model.pricing.prompt + model.pricing.completion) / 2;
      const costScore = Math.max(0, 1 - (avgCost / 10)); // Normalize to 0-1
      score += costScore * 0.2;
    }

    // Preferred provider bonus
    if (requirements.preferredProviders && requirements.preferredProviders.length > 0) {
      const provider = this.extractProvider(model.id);
      if (requirements.preferredProviders.includes(provider)) {
        score += 0.1;
      }
    }

    // Latest version bonus (if preferLatest is set)
    if (requirements.preferLatest) {
      // Models with higher version numbers or "latest" in name get bonus
      if (model.id.includes('latest') || this.isLatestVersion(model.id)) {
        score += 0.1;
      }
    }

    // JSON capability bonus (approximation: most modern models support this)
    if (requirements.requiresJson) {
      // Claude, GPT-4, and other modern models typically support JSON
      const supportsJson = this.likelySupportsJson(model);
      if (supportsJson) {
        score += 0.05;
      }
    }

    // Clamp score to 0-1 range
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Extract provider name from model ID
   */
  private extractProvider(modelId: string): string {
    return modelId.split('/')[0] || '';
  }

  /**
   * Check if model is likely the latest version from its provider
   */
  private isLatestVersion(modelId: string): boolean {
    // Simple heuristic: contains "3.5", "4", "4o", "v2", etc.
    // This is approximate and can be refined
    const latestIndicators = ['3.5', '-4', '4o', 'v2', 'v3', 'turbo'];
    return latestIndicators.some(indicator => modelId.toLowerCase().includes(indicator));
  }

  /**
   * Check if model likely supports JSON output
   */
  private likelySupportsJson(model: OpenRouterModel): boolean {
    const jsonCapableProviders = ['anthropic', 'openai', 'google'];
    const provider = this.extractProvider(model.id);
    return jsonCapableProviders.includes(provider);
  }

  /**
   * Explain why a model was selected
   */
  private explainSelection(model: OpenRouterModel, requirements: ModelRequirements): string {
    const reasons: string[] = [];

    if (requirements.preferQuality) {
      reasons.push(`high quality (${model.context_length.toLocaleString()} context)`);
    }

    if (requirements.preferSpeed) {
      reasons.push('optimized for speed');
    }

    const avgCost = (model.pricing.prompt + model.pricing.completion) / 2;
    if (avgCost < 1) {
      reasons.push('cost-effective');
    }

    if (requirements.preferredProviders?.includes(this.extractProvider(model.id))) {
      reasons.push('preferred provider');
    }

    return reasons.length > 0
      ? reasons.join(', ')
      : 'best match for requirements';
  }

  /**
   * Get all models matching requirements (for debugging/admin)
   */
  getAllMatches(
    availableModels: OpenRouterModel[],
    requirements: ModelRequirements
  ): ModelSelectionResult[] {
    const candidates = this.filterModels(availableModels, requirements);

    return candidates.map(model => ({
      modelId: model.id,
      model,
      score: this.scoreModel(model, requirements),
      reason: this.explainSelection(model, requirements),
    })).sort((a, b) => b.score - a.score);
  }
}
