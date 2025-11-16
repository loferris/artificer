import { AnalysisResult, ValidationResult, ExecutionResult } from '../types';
import { logger } from '../../../utils/logger';

/**
 * ValidatorAgent - Validates response quality and determines if retry is needed
 * Uses a quality model to ensure responses meet standards
 */
export class ValidatorAgent {
  constructor(private modelId: string) {}

  /**
   * Validates the execution result and determines if retry is needed
   */
  async validate(
    userMessage: string,
    analysis: AnalysisResult,
    executionResult: ExecutionResult,
    availableModels: string[],
    openRouterFetch: (model: string, messages: Array<{ role: string; content: string }>) => Promise<{ content: string }>
  ): Promise<ValidationResult> {
    const systemPrompt = this.buildValidationPrompt(analysis);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: this.buildValidationQuery(userMessage, executionResult) }
    ];

    try {
      const response = await openRouterFetch(this.modelId, messages);
      return this.parseValidationResponse(response.content, availableModels, executionResult.model);
    } catch (error) {
      logger.error('[ValidatorAgent] Validation failed', error);
      // Fallback: accept the response
      return this.getFallbackValidation(executionResult);
    }
  }

  /**
   * Builds the system prompt for the validator
   */
  private buildValidationPrompt(analysis: AnalysisResult): string {
    return `You are an AI response validator. Your job is to evaluate the quality of AI-generated responses.

Task context:
- Complexity: ${analysis.complexity}/10
- Category: ${analysis.category}
- Required capabilities: ${analysis.capabilities.join(', ')}

Evaluate the response on these criteria:
1. **Accuracy** (0-10): Is the information correct and factual?
2. **Completeness** (0-10): Does it fully answer the question?
3. **Relevance** (0-10): Does it address what was asked?
4. **Quality** (0-10): Is it well-structured and clear?

Provide a JSON response with this structure:
{
  "isValid": <boolean>,
  "score": <number 0-10>,
  "accuracy": <number 0-10>,
  "completeness": <number 0-10>,
  "shouldRetry": <boolean>,
  "suggestedModel": "<model-id or null>",
  "reasoning": "<brief explanation>",
  "issues": ["<issue1>", "<issue2>"]
}

Guidelines:
- isValid: true if score >= 7, false otherwise
- shouldRetry: true if isValid is false AND a better model is available
- suggestedModel: Only suggest if shouldRetry is true (prefer more capable/expensive models)
- issues: List specific problems found (empty array if none)

For code tasks:
- Check for syntax errors, security issues, best practices
- Verify code actually solves the problem

For research tasks:
- Check for factual accuracy
- Verify completeness of information

For creative tasks:
- Check for originality and relevance
- Verify it meets the creative brief

Respond ONLY with valid JSON. No additional text.`;
  }

  /**
   * Builds the validation query
   */
  private buildValidationQuery(userMessage: string, executionResult: ExecutionResult): string {
    return `Validate this response:

**User Request:**
${userMessage}

**AI Response (from ${executionResult.model}):**
${executionResult.content}

**Metadata:**
- Tokens: ${executionResult.tokens}
- Latency: ${executionResult.latency}ms
- Cost: $${executionResult.cost.toFixed(6)}

Is this response acceptable?`;
  }

  /**
   * Parses the validation response from the model
   */
  private parseValidationResponse(
    content: string,
    availableModels: string[],
    currentModel: string
  ): ValidationResult {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Calculate overall score
      const accuracy = Math.min(10, Math.max(0, Number(parsed.accuracy) || 5));
      const completeness = Math.min(10, Math.max(0, Number(parsed.completeness) || 5));
      const score = (accuracy + completeness) / 2;

      // Validate suggested model exists and is different from current
      let suggestedModel: string | undefined;
      if (parsed.suggestedModel && typeof parsed.suggestedModel === 'string') {
        const modelExists = availableModels.some(m =>
          m.toLowerCase() === parsed.suggestedModel.toLowerCase()
        );
        const isDifferent = parsed.suggestedModel.toLowerCase() !== currentModel.toLowerCase();

        if (modelExists && isDifferent) {
          suggestedModel = availableModels.find(m =>
            m.toLowerCase() === parsed.suggestedModel.toLowerCase()
          );
        }
      }

      // Determine if should retry
      const isValid = score >= 7;
      const shouldRetry = !isValid && suggestedModel !== undefined;

      return {
        isValid,
        score,
        accuracy,
        completeness: completeness,
        shouldRetry,
        suggestedModel,
        reasoning: String(parsed.reasoning || 'No reasoning provided'),
        issues: Array.isArray(parsed.issues) ? parsed.issues.filter((i: any) => typeof i === 'string') : []
      };
    } catch (error) {
      logger.error('[ValidatorAgent] Failed to parse validation', error);
      throw error;
    }
  }

  /**
   * Provides fallback validation if the validator fails
   * Default: accept the response
   */
  private getFallbackValidation(executionResult: ExecutionResult): ValidationResult {
    // Simple heuristics
    const hasContent = executionResult.content.length > 20;
    const notTooShort = executionResult.content.length > 10;
    const hasError = /error|failed|unable|cannot|sorry/i.test(
      executionResult.content.substring(0, 100)
    );

    const isValid = hasContent && notTooShort && !hasError;
    const score = isValid ? 7 : 5;

    return {
      isValid,
      score,
      accuracy: score,
      completeness: score,
      shouldRetry: !isValid,
      suggestedModel: undefined,
      reasoning: 'Fallback validation due to validator failure',
      issues: isValid ? [] : ['Could not validate response quality']
    };
  }

  /**
   * Quick validation for simple tasks (skip full validation)
   */
  validateSimple(executionResult: ExecutionResult): ValidationResult {
    const hasContent = executionResult.content.length > 20;
    const isValid = hasContent;

    return {
      isValid,
      score: isValid ? 8 : 4,
      accuracy: isValid ? 8 : 4,
      completeness: isValid ? 8 : 4,
      shouldRetry: false, // Don't retry simple tasks
      reasoning: 'Simple validation: content length check',
      issues: isValid ? [] : ['Response too short']
    };
  }
}
