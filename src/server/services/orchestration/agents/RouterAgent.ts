import { AnalysisResult, RoutingPlan, RoutingStrategy } from '../types';
import { ModelRegistry, ModelMetadata } from '../ModelRegistry';
import { logger } from '../../../utils/logger';

/**
 * RouterAgent - Decides which model(s) to use based on analysis
 * Uses a fast model to make intelligent routing decisions
 */
export class RouterAgent {
  private modelMetadata: Map<string, ModelMetadata>;

  constructor(
    private modelId: string,
    private availableModels: string[],
    private registry: ModelRegistry
  ) {
    this.modelMetadata = this.registry.getMetadataMap(this.availableModels);
  }

  /**
   * Decides which model(s) to use for execution
   */
  async route(
    analysis: AnalysisResult,
    openRouterFetch: (model: string, messages: Array<{ role: string; content: string }>) => Promise<{ content: string }>,
    preferCheap: boolean = false
  ): Promise<RoutingPlan> {
    const systemPrompt = this.buildRoutingPrompt(analysis, preferCheap);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: this.buildRoutingQuery(analysis) }
    ];

    try {
      const response = await openRouterFetch(this.modelId, messages);
      return this.parseRoutingResponse(response.content, analysis);
    } catch (error) {
      logger.error('[RouterAgent] Routing failed', error);
      // Fallback to rule-based routing
      return this.getFallbackRouting(analysis, preferCheap);
    }
  }

  /**
   * Builds the system prompt for the router
   */
  private buildRoutingPrompt(analysis: AnalysisResult, preferCheap: boolean): string {
    const modelList = this.availableModels
      .map(id => {
        const meta = this.modelMetadata.get(id);
        return meta
          ? `- ${id} (${meta.tier}, strengths: ${meta.strengths.join(', ')}, cost: $${meta.costPer1kTokens}/1k tokens)`
          : `- ${id}`;
      })
      .join('\n');

    return `You are an AI model router. Your job is to select the best model for a given task.

Available models:
${modelList}

Task analysis:
- Complexity: ${analysis.complexity}/10
- Category: ${analysis.category}
- Required capabilities: ${analysis.capabilities.join(', ')}
- Estimated tokens: ${analysis.estimatedTokens}
- Preference: ${preferCheap ? 'Minimize cost' : 'Balance cost and quality'}

Provide a JSON response with this structure:
{
  "primaryModel": "<model-id>",
  "fallbackModels": ["<model-id>"],
  "strategy": "<single|ensemble|speculative>",
  "estimatedCost": <number>,
  "reasoning": "<brief explanation>",
  "shouldValidate": <boolean>
}

Strategy guide:
- single: Use one model (most common)
- ensemble: Use multiple models and combine results (for critical tasks)
- speculative: Run multiple models in parallel, use fastest (for time-sensitive tasks)

Validation guide:
- Validate for complexity >= 7 or critical tasks
- Skip validation for simple chat (complexity < 4)

Respond ONLY with valid JSON. No additional text.`;
  }

  /**
   * Builds the routing query
   */
  private buildRoutingQuery(analysis: AnalysisResult): string {
    return `Based on the task analysis, which model(s) should I use? Analysis: ${JSON.stringify(analysis)}`;
  }

  /**
   * Parses the routing response from the model
   */
  private parseRoutingResponse(content: string, analysis: AnalysisResult): RoutingPlan {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate model exists
      const primaryModel = this.validateModel(parsed.primaryModel);
      const fallbackModels = Array.isArray(parsed.fallbackModels)
        ? parsed.fallbackModels.map((m: any) => this.validateModel(m)).filter(Boolean)
        : [];

      return {
        primaryModel: primaryModel as string,
        fallbackModels: fallbackModels as string[],
        strategy: this.validateStrategy(parsed.strategy),
        estimatedCost: Math.max(0, Number(parsed.estimatedCost) || 0),
        reasoning: String(parsed.reasoning || 'No reasoning provided'),
        shouldValidate: Boolean(parsed.shouldValidate ?? (analysis.complexity >= 7))
      };
    } catch (error) {
      logger.error('[RouterAgent] Failed to parse routing', error);
      throw error;
    }
  }

  /**
   * Validates model ID exists in available models
   */
  private validateModel(modelId: unknown): string | null {
    if (typeof modelId !== 'string') return null;

    // Check if model exists in available models
    const exists = this.availableModels.some(m =>
      m.toLowerCase() === modelId.toLowerCase()
    );

    if (exists) {
      return this.availableModels.find(m =>
        m.toLowerCase() === modelId.toLowerCase()
      ) || null;
    }

    return null;
  }

  /**
   * Validates routing strategy
   */
  private validateStrategy(strategy: unknown): RoutingStrategy {
    const validStrategies: RoutingStrategy[] = ['single', 'ensemble', 'speculative'];
    if (typeof strategy === 'string' && validStrategies.includes(strategy as RoutingStrategy)) {
      return strategy as RoutingStrategy;
    }
    return 'single'; // Default fallback
  }

  /**
   * Provides fallback routing if the router fails
   * Uses rule-based logic to select appropriate model
   */
  private getFallbackRouting(analysis: AnalysisResult, preferCheap: boolean): RoutingPlan {
    const { complexity, category, estimatedTokens } = analysis;

    // Rule-based model selection
    let primaryModel: string;
    let tier: 'cheap' | 'mid' | 'expensive';

    if (preferCheap || complexity <= 3) {
      // Use cheapest model for simple tasks
      tier = 'cheap';
      primaryModel = this.selectModelByTier('cheap', category);
    } else if (complexity <= 6) {
      // Use mid-tier for moderate tasks
      tier = 'mid';
      primaryModel = this.selectModelByTier('mid', category);
    } else {
      // Use expensive model for complex tasks
      tier = 'expensive';
      primaryModel = this.selectModelByTier('expensive', category);
    }

    // Estimate cost
    const meta = this.modelMetadata.get(primaryModel);
    const estimatedCost = meta
      ? (estimatedTokens / 1000) * meta.costPer1kTokens
      : 0.001;

    return {
      primaryModel,
      fallbackModels: this.selectFallbackModels(primaryModel),
      strategy: 'single',
      estimatedCost,
      reasoning: `Fallback rule-based routing: complexity=${complexity}, category=${category}, tier=${tier}`,
      shouldValidate: complexity >= 7
    };
  }

  /**
   * Selects a model by tier and category
   */
  private selectModelByTier(tier: 'cheap' | 'mid' | 'expensive', category: string): string {
    const modelsInTier = Array.from(this.modelMetadata.entries())
      .filter(([_, meta]) => meta.tier === tier)
      .map(([id]) => id);

    if (modelsInTier.length === 0) {
      // Fallback to first available model
      return this.availableModels[0] || 'deepseek/deepseek-chat';
    }

    // Prefer models that match the category
    const categoryMatch = modelsInTier.find(id => {
      const meta = this.modelMetadata.get(id);
      return meta?.strengths.includes(category);
    });

    return categoryMatch || modelsInTier[0];
  }

  /**
   * Selects fallback models (different tier than primary)
   */
  private selectFallbackModels(primaryModel: string): string[] {
    const primaryMeta = this.modelMetadata.get(primaryModel);
    if (!primaryMeta) return [];

    // Select one model from a different tier
    const fallbacks = Array.from(this.modelMetadata.entries())
      .filter(([id, meta]) => id !== primaryModel && meta.tier !== primaryMeta.tier)
      .slice(0, 1)
      .map(([id]) => id);

    return fallbacks;
  }

}
