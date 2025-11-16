import { AnalysisResult, TaskCategory, RequiredCapability } from '../types';

/**
 * AnalyzerAgent - Analyzes user queries to determine task characteristics
 * Uses a fast/cheap model to classify the query and estimate requirements
 */
export class AnalyzerAgent {
  constructor(private modelId: string) {}

  /**
   * Analyzes a user query to determine its characteristics
   */
  async analyze(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    openRouterFetch: (model: string, messages: Array<{ role: string; content: string }>) => Promise<{ content: string }>
  ): Promise<AnalysisResult> {
    const systemPrompt = this.buildAnalysisPrompt();
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-3), // Include last 3 messages for context
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await openRouterFetch(this.modelId, messages);
      return this.parseAnalysisResponse(response.content);
    } catch (error) {
      console.error('[AnalyzerAgent] Analysis failed:', error);
      // Fallback to conservative defaults
      return this.getFallbackAnalysis(userMessage);
    }
  }

  /**
   * Builds the system prompt for the analyzer
   */
  private buildAnalysisPrompt(): string {
    return `You are an AI task analyzer. Your job is to analyze user queries and determine their characteristics.

Analyze the user's message and provide a JSON response with the following structure:
{
  "complexity": <number 1-10>,
  "category": "<code|research|creative|analysis|chat>",
  "capabilities": ["<reasoning|speed|knowledge|creativity>"],
  "estimatedTokens": <number>,
  "reasoning": "<brief explanation>"
}

Complexity scale:
1-3: Simple chat, basic Q&A, greetings
4-6: Moderate tasks, explanations, simple code, research
7-9: Complex analysis, advanced coding, multi-step reasoning
10: Very complex tasks requiring deep expertise

Categories:
- code: Programming, debugging, code review, technical implementation
- research: Information gathering, fact-checking, learning
- creative: Writing, brainstorming, storytelling, content creation
- analysis: Data analysis, decision-making, problem-solving
- chat: Casual conversation, simple Q&A

Capabilities:
- reasoning: Requires logical thinking, problem-solving
- speed: User expects quick response
- knowledge: Requires specific domain knowledge
- creativity: Requires creative thinking, novel ideas

EstimatedTokens: Rough estimate of tokens needed for a good response (100-4000)

Respond ONLY with valid JSON. No additional text.`;
  }

  /**
   * Parses the analysis response from the model
   */
  private parseAnalysisResponse(content: string): AnalysisResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize
      return {
        complexity: Math.min(10, Math.max(1, Number(parsed.complexity) || 5)),
        category: this.validateCategory(parsed.category),
        capabilities: this.validateCapabilities(parsed.capabilities),
        estimatedTokens: Math.max(100, Number(parsed.estimatedTokens) || 500),
        reasoning: String(parsed.reasoning || 'No reasoning provided')
      };
    } catch (error) {
      console.error('[AnalyzerAgent] Failed to parse analysis:', error);
      throw error;
    }
  }

  /**
   * Validates task category
   */
  private validateCategory(category: unknown): TaskCategory {
    const validCategories: TaskCategory[] = ['code', 'research', 'creative', 'analysis', 'chat'];
    if (typeof category === 'string' && validCategories.includes(category as TaskCategory)) {
      return category as TaskCategory;
    }
    return 'chat'; // Default fallback
  }

  /**
   * Validates required capabilities
   */
  private validateCapabilities(capabilities: unknown): RequiredCapability[] {
    if (!Array.isArray(capabilities)) {
      return ['reasoning']; // Default fallback
    }

    const validCapabilities: RequiredCapability[] = ['reasoning', 'speed', 'knowledge', 'creativity'];
    return capabilities.filter(cap =>
      typeof cap === 'string' && validCapabilities.includes(cap as RequiredCapability)
    ) as RequiredCapability[];
  }

  /**
   * Provides fallback analysis if the analyzer fails
   */
  private getFallbackAnalysis(userMessage: string): AnalysisResult {
    const messageLength = userMessage.length;
    const hasCodeIndicators = /```|function|class|import|const|let|var/.test(userMessage);
    const hasQuestionIndicators = /\?|how|what|why|when|where|who/i.test(userMessage);

    let category: TaskCategory = 'chat';
    let complexity = 5;
    const capabilities: RequiredCapability[] = ['reasoning'];

    if (hasCodeIndicators) {
      category = 'code';
      complexity = 7;
      capabilities.push('knowledge');
    } else if (hasQuestionIndicators) {
      category = messageLength > 100 ? 'research' : 'chat';
      complexity = messageLength > 200 ? 6 : 3;
    }

    return {
      complexity,
      category,
      capabilities,
      estimatedTokens: Math.min(2000, messageLength * 3),
      reasoning: 'Fallback analysis due to analyzer failure'
    };
  }
}
