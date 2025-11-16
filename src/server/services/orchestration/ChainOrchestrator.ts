import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AnalyzerAgent } from './agents/AnalyzerAgent';
import { RouterAgent } from './agents/RouterAgent';
import { ValidatorAgent } from './agents/ValidatorAgent';
import {
  ChainConfig,
  ChainContext,
  ChainResult,
  ExecutionResult,
  AnalysisResult,
  RoutingPlan,
  ValidationResult,
} from './types';
import { Assistant, AssistantResponse } from '../assistant';
import { logger } from '../../utils/logger';

/**
 * ChainOrchestrator - Intelligent multi-stage routing system
 *
 * Pipeline:
 * 1. Analyzer Agent: Analyze query complexity and requirements
 * 2. Router Agent: Select optimal model(s) based on analysis
 * 3. Executor: Run the task using selected model(s)
 * 4. Validator Agent: Validate response quality and decide if retry needed
 */
export class ChainOrchestrator {
  private analyzer: AnalyzerAgent;
  private router: RouterAgent;
  private validator: ValidatorAgent;
  private assistant: Assistant;
  private db?: PrismaClient;

  constructor(
    private config: ChainConfig,
    assistant: Assistant,
    db?: PrismaClient
  ) {
    this.assistant = assistant;
    this.db = db;

    // Initialize agents
    this.analyzer = new AnalyzerAgent(config.analyzerModel);
    this.router = new RouterAgent(config.routerModel, config.availableModels);
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
          await this.storeRoutingDecision(result);

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
      return await this.analyzer.analyze(
        context.userMessage,
        context.conversationHistory || [],
        this.createOpenRouterFetch()
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
      return await this.router.route(
        analysis,
        this.createOpenRouterFetch(),
        context.config.preferCheapModels || false
      );
    } catch (error) {
      logger.error('[ChainOrchestrator] Routing failed, using fallback', error);
      // Fallback routing is handled within the RouterAgent
      throw error;
    }
  }

  /**
   * Stage 3: Execute the query with selected model
   */
  private async executeQuery(
    context: ChainContext,
    model: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      const messages = [
        ...(context.conversationHistory || []),
        { role: 'user', content: context.userMessage }
      ];

      // Use the assistant's getResponse method with specific model
      const response = await this.assistant.getResponse(
        context.userMessage,
        context.conversationHistory || [],
        { signal: context.signal }
      );

      const latency = Date.now() - startTime;

      // Parse response
      if (typeof response === 'string') {
        return {
          content: response,
          model: model,
          tokens: this.estimateTokens(response),
          cost: 0,
          latency,
        };
      } else {
        const assistantResponse = response as AssistantResponse;
        return {
          content: assistantResponse.response,
          model: assistantResponse.model || model,
          tokens: this.estimateTokens(assistantResponse.response),
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
      return await this.validator.validate(
        context.userMessage,
        analysis,
        execution,
        this.config.availableModels,
        this.createOpenRouterFetch()
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

    await this.storeRoutingDecision(result);

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
   */
  private async storeRoutingDecision(result: ChainResult): Promise<void> {
    if (!this.db) {
      logger.warn('[ChainOrchestrator] No database connection, skipping routing decision storage');
      return;
    }

    try {
      await this.db.routingDecision.create({
        data: {
          prompt: result.analysis.reasoning,
          analysis: result.analysis as any,
          routingPlan: result.routingPlan as any,
          executedModel: result.model,
          validationResult: result.validation as any,
          totalCost: new Decimal(result.totalCost),
          successful: result.successful,
          retryCount: result.retryCount,
          conversationId: result.conversationId,
        },
      });

      logger.info('[ChainOrchestrator] Routing decision stored', {
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
   */
  private createOpenRouterFetch() {
    return async (
      model: string,
      messages: Array<{ role: string; content: string }>
    ): Promise<{ content: string }> => {
      // Extract user message
      const userMessage = messages[messages.length - 1]?.content || '';
      const history = messages.slice(0, -1);

      const response = await this.assistant.getResponse(userMessage, history);

      if (typeof response === 'string') {
        return { content: response };
      } else {
        return { content: response.response };
      }
    };
  }

  /**
   * Estimates token count from text (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
