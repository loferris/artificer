import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AnalyzerAgent } from './agents/AnalyzerAgent';
import { RouterAgent } from './agents/RouterAgent';
import { ValidatorAgent } from './agents/ValidatorAgent';
import { ModelRegistry } from './ModelRegistry';
import {
  ChainConfig,
  ChainContext,
  ChainResult,
  ExecutionResult,
  AnalysisResult,
  RoutingPlan,
  ValidationResult,
  StreamEvent,
  CachedRoute,
  RouteCacheKey,
} from './types';
import crypto from 'crypto';
import { Assistant, AssistantResponse } from '../assistant';
import { logger } from '../../utils/logger';
import { countMessageTokens } from '../../utils/tokenCounter';
import { StructuredQueryService } from '../security/StructuredQueryService';
import type { ConversationService } from '../conversation/ConversationService';
import type { MessageService } from '../message/MessageService';

/**
 * ChainOrchestrator - Intelligent multi-stage routing system
 *
 * Pipeline:
 * 1. Analyzer Agent: Analyze query complexity and requirements
 * 2. Router Agent: Select optimal model(s) based on analysis
 * 3. Executor: Run the task using selected model(s)
 * 4. Validator Agent: Validate response quality and decide if retry needed
 *
 * Security:
 * - Uses StructuredQueryService to prevent prompt injection attacks
 * - Separates user instructions from untrusted data (conversation history, documents)
 */
export class ChainOrchestrator {
  private analyzer: AnalyzerAgent;
  private router: RouterAgent;
  private validator: ValidatorAgent;
  private assistant: Assistant;
  private db?: PrismaClient;
  private registry: ModelRegistry;
  private structuredQueryService?: StructuredQueryService;
  private routeCache: Map<string, CachedRoute> = new Map();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  // Default timeouts (in milliseconds)
  private readonly DEFAULT_ANALYZER_TIMEOUT = 30000;    // 30 seconds
  private readonly DEFAULT_ROUTER_TIMEOUT = 30000;      // 30 seconds
  private readonly DEFAULT_EXECUTION_TIMEOUT = 120000;  // 2 minutes
  private readonly DEFAULT_VALIDATOR_TIMEOUT = 30000;   // 30 seconds

  constructor(
    private config: ChainConfig,
    assistant: Assistant,
    db?: PrismaClient,
    registry?: ModelRegistry,
    structuredQueryService?: StructuredQueryService
  ) {
    this.assistant = assistant;
    this.db = db;
    this.structuredQueryService = structuredQueryService;

    // Initialize or use provided model registry
    this.registry = registry || new ModelRegistry();

    // Initialize agents
    this.analyzer = new AnalyzerAgent(config.analyzerModel);
    this.router = new RouterAgent(config.routerModel, config.availableModels, this.registry);
    this.validator = new ValidatorAgent(config.validatorModel);

    logger.info('[ChainOrchestrator] Initialized', {
      analyzerModel: config.analyzerModel,
      routerModel: config.routerModel,
      validatorModel: config.validatorModel,
      availableModels: config.availableModels.length,
    });
  }

  /**
   * Main orchestration method - runs the full chain
   */
  async orchestrate(context: ChainContext): Promise<ChainResult> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | undefined;

    logger.info('[ChainOrchestrator] Starting orchestration', {
      messageLength: context.userMessage.length,
      historyLength: context.conversationHistory?.length || 0,
      conversationId: context.conversationId,
    });

    try {
      // Stage 1: Analyze
      const analysis = await this.analyzeQuery(context);
      logger.info('[ChainOrchestrator] Analysis complete', analysis);

      // Check if complexity meets threshold for chain routing
      if (analysis.complexity < context.config.minComplexityForChain) {
        logger.info('[ChainOrchestrator] Complexity below threshold, using simple routing');
        return await this.simpleExecution(context, analysis);
      }

      // Stage 2: Route
      const routingPlan = await this.routeQuery(analysis, context);
      logger.info('[ChainOrchestrator] Routing plan created', {
        primaryModel: routingPlan.primaryModel,
        strategy: routingPlan.strategy,
        estimatedCost: routingPlan.estimatedCost,
      });

      // Stage 3 & 4: Execute and optionally validate (with retry logic)
      let execution: ExecutionResult;
      let validation: ValidationResult | undefined;
      let finalModel = routingPlan.primaryModel;

      while (retryCount <= context.config.maxRetries) {
        try {
          // Execute with selected model
          execution = await this.executeQuery(context, finalModel);
          logger.info('[ChainOrchestrator] Execution complete', {
            model: execution.model,
            tokens: execution.tokens,
            cost: execution.cost,
            latency: execution.latency,
          });

          // Validate if enabled and required
          if (context.config.validationEnabled && routingPlan.shouldValidate) {
            validation = await this.validateResponse(context, analysis, execution);
            logger.info('[ChainOrchestrator] Validation complete', {
              isValid: validation.isValid,
              score: validation.score,
              shouldRetry: validation.shouldRetry,
            });

            // Check if retry is needed
            if (validation.shouldRetry && retryCount < context.config.maxRetries) {
              retryCount++;

              // Use suggested model or fallback
              if (validation.suggestedModel) {
                finalModel = validation.suggestedModel;
              } else if (routingPlan.fallbackModels && routingPlan.fallbackModels.length > 0) {
                finalModel = routingPlan.fallbackModels[retryCount - 1] || routingPlan.primaryModel;
              }

              logger.info('[ChainOrchestrator] Retrying with different model', {
                retryCount,
                newModel: finalModel,
                reason: validation.reasoning,
              });
              continue; // Retry with new model
            }
          }

          // Success - build and return result
          const result = this.buildChainResult(
            analysis,
            routingPlan,
            execution,
            validation,
            retryCount,
            Date.now() - startTime,
            context.conversationId
          );

          // Store routing decision in database
          await this.storeRoutingDecision(result, context.userMessage);

          return result;
        } catch (execError) {
          lastError = execError instanceof Error ? execError : new Error(String(execError));
          logger.error('[ChainOrchestrator] Execution failed', {
            model: finalModel,
            retryCount,
            error: lastError.message,
          });

          // Try fallback model if available
          if (retryCount < context.config.maxRetries &&
              routingPlan.fallbackModels &&
              routingPlan.fallbackModels.length > retryCount) {
            retryCount++;
            finalModel = routingPlan.fallbackModels[retryCount - 1];
            logger.info('[ChainOrchestrator] Retrying with fallback model', {
              retryCount,
              newModel: finalModel,
            });
            continue;
          }

          throw lastError; // No more retries
        }
      }

      // Max retries exceeded
      throw new Error(
        `Max retries (${context.config.maxRetries}) exceeded. Last error: ${lastError?.message}`
      );
    } catch (error) {
      logger.error('[ChainOrchestrator] Orchestration failed', error);
      throw error;
    }
  }

  /**
   * Stage 1: Analyze the query
   */
  private async analyzeQuery(context: ChainContext): Promise<AnalysisResult> {
    try {
      const timeout = context.config.analyzerTimeout || this.DEFAULT_ANALYZER_TIMEOUT;

      return await this.withTimeout(
        this.analyzer.analyze(
          context.userMessage,
          context.conversationHistory || [],
          this.createOpenRouterFetch(context.signal)
        ),
        timeout,
        'Analysis'
      );
    } catch (error) {
      logger.error('[ChainOrchestrator] Analysis failed, using fallback', error);
      // Fallback analysis is handled within the AnalyzerAgent
      throw error;
    }
  }

  /**
   * Stage 2: Route to appropriate model(s)
   */
  private async routeQuery(
    analysis: AnalysisResult,
    context: ChainContext
  ): Promise<RoutingPlan> {
    try {
      const timeout = context.config.routerTimeout || this.DEFAULT_ROUTER_TIMEOUT;

      return await this.withTimeout(
        this.router.route(
          analysis,
          this.createOpenRouterFetch(context.signal),
          context.config.preferCheapModels || false
        ),
        timeout,
        'Routing'
      );
    } catch (error) {
      logger.error('[ChainOrchestrator] Routing failed, using fallback', error);
      // Fallback routing is handled within the RouterAgent
      throw error;
    }
  }

  /**
   * Stage 3: Execute the query with selected model
   * Uses StructuredQueryService for secure prompt formatting if available
   */
  private async executeQuery(
    context: ChainContext,
    model: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      let finalMessage = context.userMessage;
      let conversationHistory = context.conversationHistory || [];

      // Use StructuredQueryService for secure prompt formatting if available
      if (this.structuredQueryService && context.useStructuredQuery !== false) {
        logger.info('[ChainOrchestrator] Using StructuredQueryService for secure prompt formatting');

        try {
          const structured = await this.structuredQueryService.structure({
            message: context.userMessage,
            conversationId: context.conversationId,
            uploadedFiles: context.uploadedFiles,
            projectId: context.projectId,
          });

          // Format into secure prompt
          const securePrompt = this.structuredQueryService.formatPrompt(structured);

          logger.debug('[ChainOrchestrator] Structured prompt created', {
            instructionLength: structured.instruction.length,
            documentsCount: structured.context.documents.length,
            historyLength: structured.context.conversationHistory.length,
          });

          // Use the secure prompt as the message, with empty history
          // (history is already included in the structured prompt)
          finalMessage = securePrompt;
          conversationHistory = [];
        } catch (structureError) {
          logger.warn('[ChainOrchestrator] Failed to structure query, falling back to direct message', {
            error: structureError instanceof Error ? structureError.message : String(structureError),
          });
          // Fall back to direct message passing
        }
      }

      // Use the assistant's getResponse method with specific model
      const timeout = context.config.executionTimeout || this.DEFAULT_EXECUTION_TIMEOUT;

      const response = await this.withTimeout(
        this.assistant.getResponse(
          finalMessage,
          conversationHistory,
          {
            signal: context.signal,
            model: model  // Pass the selected model from orchestration
          }
        ),
        timeout,
        `Execution with ${model}`
      );

      const latency = Date.now() - startTime;

      // Parse response
      if (typeof response === 'string') {
        return {
          content: response,
          model: model,
          tokens: this.estimateTokens(response, model),
          cost: 0,
          latency,
        };
      } else {
        const assistantResponse = response as AssistantResponse;
        return {
          content: assistantResponse.response,
          model: assistantResponse.model || model,
          tokens: this.estimateTokens(assistantResponse.response, assistantResponse.model || model),
          cost: assistantResponse.cost || 0,
          latency,
        };
      }
    } catch (error) {
      logger.error('[ChainOrchestrator] Execution failed', { model, error });
      throw error;
    }
  }

  /**
   * Stage 4: Validate the response
   */
  private async validateResponse(
    context: ChainContext,
    analysis: AnalysisResult,
    execution: ExecutionResult
  ): Promise<ValidationResult> {
    try {
      // Use simple validation for low complexity tasks
      if (analysis.complexity < 4) {
        return this.validator.validateSimple(execution);
      }

      // Full validation for complex tasks
      const timeout = context.config.validatorTimeout || this.DEFAULT_VALIDATOR_TIMEOUT;

      return await this.withTimeout(
        this.validator.validate(
          context.userMessage,
          analysis,
          execution,
          this.config.availableModels,
          this.createOpenRouterFetch(context.signal)
        ),
        timeout,
        'Validation'
      );
    } catch (error) {
      logger.error('[ChainOrchestrator] Validation failed, using fallback', error);
      // Fallback validation is handled within the ValidatorAgent
      throw error;
    }
  }

  /**
   * Simple execution without full chain (for low complexity tasks)
   */
  private async simpleExecution(
    context: ChainContext,
    analysis: AnalysisResult
  ): Promise<ChainResult> {
    const startTime = Date.now();

    // Use cheapest available model for simple tasks
    const cheapModel = this.config.availableModels[0] || 'deepseek/deepseek-chat';

    const execution = await this.executeQuery(context, cheapModel);
    const validation = this.validator.validateSimple(execution);

    const routingPlan: RoutingPlan = {
      primaryModel: cheapModel,
      fallbackModels: [],
      strategy: 'single',
      estimatedCost: execution.cost,
      reasoning: 'Simple task - using cheapest model',
      shouldValidate: false,
    };

    const result = this.buildChainResult(
      analysis,
      routingPlan,
      execution,
      validation,
      0,
      Date.now() - startTime,
      context.conversationId
    );

    await this.storeRoutingDecision(result, context.userMessage);

    return result;
  }

  /**
   * Builds the final chain result
   */
  private buildChainResult(
    analysis: AnalysisResult,
    routingPlan: RoutingPlan,
    execution: ExecutionResult,
    validation: ValidationResult | undefined,
    retryCount: number,
    totalLatency: number,
    conversationId?: string
  ): ChainResult {
    return {
      response: execution.content,
      model: execution.model,
      totalCost: execution.cost,
      totalTokens: execution.tokens,
      successful: validation?.isValid ?? true,
      retryCount,
      analysis,
      routingPlan,
      execution,
      validation,
      totalLatency,
      timestamp: new Date(),
      conversationId,
    };
  }

  /**
   * Stores the routing decision in the database for analytics
   * PII-safe: Only stores hashed prompt, metadata, and aggregated metrics
   */
  private async storeRoutingDecision(result: ChainResult, userMessage: string): Promise<void> {
    if (!this.db) {
      logger.warn('[ChainOrchestrator] No database connection, skipping routing decision storage');
      return;
    }

    try {
      // Create SHA-256 hash of user message for deduplication (PII-safe)
      const promptHash = crypto.createHash('sha256').update(userMessage).digest('hex');

      await this.db.routingDecision.create({
        data: {
          // PII-safe prompt analytics
          promptHash,
          promptLength: userMessage.length,
          complexity: result.analysis.complexity,
          category: result.analysis.category,

          // Metadata
          executedModel: result.model,
          totalCost: new Decimal(result.totalCost),
          successful: result.successful,
          retryCount: result.retryCount,
          latencyMs: result.totalLatency,

          // Optional fields
          conversationId: result.conversationId,
          strategy: result.routingPlan.strategy,
          validationScore: result.validation?.score,
        },
      });

      logger.info('[ChainOrchestrator] Routing decision stored (PII-safe)', {
        promptHash: promptHash.substring(0, 16) + '...',
        model: result.model,
        cost: result.totalCost,
        successful: result.successful,
      });
    } catch (error) {
      logger.error('[ChainOrchestrator] Failed to store routing decision', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Creates a wrapper function for OpenRouter API calls
   * @param signal Optional AbortSignal for cancellation support
   */
  private createOpenRouterFetch(signal?: AbortSignal) {
    return async (
      model: string,
      messages: Array<{ role: string; content: string }>
    ): Promise<{ content: string }> => {
      // Extract user message
      const userMessage = messages[messages.length - 1]?.content || '';
      const history = messages.slice(0, -1);

      const response = await this.assistant.getResponse(userMessage, history, {
        model,
        signal,
      });

      if (typeof response === 'string') {
        return { content: response };
      } else {
        return { content: response.response };
      }
    };
  }

  /**
   * Counts tokens in text using tiktoken (accurate)
   */
  private estimateTokens(text: string, model: string = 'gpt-4'): number {
    return countMessageTokens(text, model);
  }

  /**
   * Wraps a promise with a timeout to prevent hanging operations
   * @param promise The promise to wrap
   * @param timeoutMs Timeout in milliseconds
   * @param operationName Name of the operation for error messages
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Streaming orchestration - yields progress events as chain executes
   * Reduces perceived latency with real-time updates
   */
  async *orchestrateStream(context: ChainContext): AsyncGenerator<StreamEvent, ChainResult, undefined> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | undefined;

    try {
      // Stage 1: Analyze (with parallel cache check)
      yield {
        type: 'analyzing',
        stage: 'analysis',
        message: '🔍 Analyzing your query...',
        progress: 0.1,
      };

      const analysisPromise = this.analyzeQuery(context);
      const cacheKey = this.generateCacheKey(context.userMessage, context.sessionId);

      const analysis = await analysisPromise;

      yield {
        type: 'analyzing',
        stage: 'analysis',
        message: `📊 Complexity: ${analysis.complexity}/10 (${analysis.category})`,
        progress: 0.2,
        metadata: { analysis },
      };

      // Check if complexity meets threshold
      if (analysis.complexity < context.config.minComplexityForChain) {
        yield {
          type: 'routing',
          stage: 'simple-route',
          message: '⚡ Simple query detected, using fast path...',
          progress: 0.3,
        };

        const result = await this.simpleExecution(context, analysis);

        yield {
          type: 'complete',
          stage: 'complete',
          message: '✅ Done!',
          progress: 1.0,
          metadata: { finished: true },
        };

        return result;
      }

      // Stage 2: Route (with cache check)
      yield {
        type: 'routing',
        stage: 'routing',
        message: '🧭 Selecting optimal model...',
        progress: 0.3,
      };

      let routingPlan: RoutingPlan;
      const cachedRoute = this.getCachedRoute(cacheKey, analysis);

      if (cachedRoute) {
        routingPlan = cachedRoute.routingPlan;
        yield {
          type: 'routing',
          stage: 'routing',
          message: `💾 Using cached routing (${routingPlan.primaryModel})`,
          progress: 0.4,
          metadata: { routingPlan },
        };
      } else {
        routingPlan = await this.routeQuery(analysis, context);
        this.cacheRoute(cacheKey, analysis, routingPlan);

        yield {
          type: 'routing',
          stage: 'routing',
          message: `🎯 Routed to ${routingPlan.primaryModel}`,
          progress: 0.4,
          metadata: { routingPlan },
        };
      }

      // Stage 3: Execute (with streaming if supported)
      let execution: ExecutionResult;
      let validation: ValidationResult | undefined;
      let finalModel = routingPlan.primaryModel;

      while (retryCount <= context.config.maxRetries) {
        try {
          yield {
            type: 'executing',
            stage: 'execution',
            message: retryCount === 0
              ? `🤖 Generating response with ${finalModel}...`
              : `🔄 Retry ${retryCount}: Using ${finalModel}...`,
            progress: 0.5 + (retryCount * 0.1),
            metadata: { model: finalModel, retryCount },
          };

          execution = await this.executeQuery(context, finalModel);

          yield {
            type: 'executing',
            stage: 'execution',
            message: `✨ Response generated (${execution.tokens} tokens, $${execution.cost.toFixed(6)})`,
            progress: 0.7,
            metadata: {
              content: execution.content.substring(0, 100) + '...',
              model: execution.model,
            },
          };

          // Stage 4: Validate if needed
          if (context.config.validationEnabled && routingPlan.shouldValidate) {
            yield {
              type: 'validating',
              stage: 'validation',
              message: '🔬 Validating response quality...',
              progress: 0.8,
            };

            validation = await this.validateResponse(context, analysis, execution);

            if (validation.shouldRetry && retryCount < context.config.maxRetries) {
              retryCount++;

              yield {
                type: 'retrying',
                stage: 'retry',
                message: `⚠️ Quality check failed (score: ${validation.score}/10). Retrying with better model...`,
                progress: 0.5 + (retryCount * 0.1),
                metadata: { retryCount },
              };

              // Select retry model
              if (validation.suggestedModel) {
                finalModel = validation.suggestedModel;
              } else if (routingPlan.fallbackModels && routingPlan.fallbackModels.length > 0) {
                finalModel = routingPlan.fallbackModels[retryCount - 1] || routingPlan.primaryModel;
              }

              continue; // Retry loop
            }

            yield {
              type: 'validating',
              stage: 'validation',
              message: validation.isValid
                ? `✅ Quality verified (score: ${validation.score}/10)`
                : `⚠️ Validation complete (score: ${validation.score}/10)`,
              progress: 0.9,
            };
          }

          // Success - build result
          const result = this.buildChainResult(
            analysis,
            routingPlan,
            execution,
            validation,
            retryCount,
            Date.now() - startTime,
            context.conversationId
          );

          // Store decision (don't wait)
          this.storeRoutingDecision(result, context.userMessage).catch(err =>
            logger.error('[ChainOrchestrator] Failed to store decision', err)
          );

          yield {
            type: 'complete',
            stage: 'complete',
            message: `✅ Complete! (${(result.totalLatency / 1000).toFixed(1)}s)`,
            progress: 1.0,
            metadata: { finished: true },
          };

          return result;

        } catch (execError) {
          lastError = execError instanceof Error ? execError : new Error(String(execError));

          if (retryCount < context.config.maxRetries &&
              routingPlan.fallbackModels &&
              routingPlan.fallbackModels.length > retryCount) {
            retryCount++;
            finalModel = routingPlan.fallbackModels[retryCount - 1];

            yield {
              type: 'retrying',
              stage: 'retry',
              message: `⚠️ Model error. Trying fallback: ${finalModel}...`,
              progress: 0.5 + (retryCount * 0.1),
              metadata: { retryCount },
            };

            continue;
          }

          throw lastError;
        }
      }

      throw new Error(`Max retries exceeded: ${lastError?.message}`);

    } catch (error) {
      logger.error('[ChainOrchestrator] Stream orchestration failed', error);

      yield {
        type: 'error',
        stage: 'error',
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        progress: 0,
      };

      throw error;
    }
  }

  /**
   * Cache management methods
   */

  private generateCacheKey(message: string, sessionId?: string): string {
    // Hash message + sessionId to prevent cache collisions between users
    // Use SHA-256 for better security than MD5
    const input = `${sessionId || 'anon'}:${message.toLowerCase().trim()}`;
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  private getCachedRoute(
    messageHash: string,
    analysis: AnalysisResult
  ): CachedRoute | null {
    const cacheKey = `${messageHash}-${analysis.complexity}-${analysis.category}`;
    const cached = this.routeCache.get(cacheKey);

    if (!cached) return null;

    // Check if cache is still valid
    const age = Date.now() - cached.timestamp.getTime();
    if (age > this.CACHE_TTL_MS) {
      this.routeCache.delete(cacheKey);
      return null;
    }

    // Increment hit count
    cached.hitCount++;
    logger.info('[ChainOrchestrator] Cache hit', {
      cacheKey: cacheKey.substring(0, 16) + '...',
      hitCount: cached.hitCount,
      model: cached.routingPlan.primaryModel,
    });

    return cached;
  }

  private cacheRoute(
    messageHash: string,
    analysis: AnalysisResult,
    routingPlan: RoutingPlan
  ): void {
    const cacheKey = `${messageHash}-${analysis.complexity}-${analysis.category}`;

    this.routeCache.set(cacheKey, {
      key: {
        messageHash,
        complexity: analysis.complexity,
        category: analysis.category,
      },
      routingPlan,
      timestamp: new Date(),
      hitCount: 0,
    });

    logger.info('[ChainOrchestrator] Route cached', {
      cacheKey: cacheKey.substring(0, 16) + '...',
      model: routingPlan.primaryModel,
    });

    // Cleanup old cache entries (keep last 100)
    if (this.routeCache.size > 100) {
      const oldestKey = Array.from(this.routeCache.keys())[0];
      this.routeCache.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; totalHits: number; entries: Array<{ model: string; hits: number }> } {
    const entries = Array.from(this.routeCache.values())
      .map(cached => ({
        model: cached.routingPlan.primaryModel,
        hits: cached.hitCount,
      }))
      .sort((a, b) => b.hits - a.hits);

    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);

    return {
      size: this.routeCache.size,
      totalHits,
      entries,
    };
  }

  /**
   * Clear the routing cache
   */
  clearCache(): void {
    this.routeCache.clear();
    logger.info('[ChainOrchestrator] Cache cleared');
  }
}
