import {
  AnalysisResult,
  AnalysisResultWithTools,
  TaskCategory,
  RequiredCapability,
  ToolRequirement,
  MCPToolType,
  MCPContext,
} from '../types';

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

  // ============================================================================
  // MCP Tool Detection (Future Enhancement)
  // ============================================================================

  /**
   * Analyzes query with MCP tool detection
   * Backward compatible - returns extended result with optional tool fields
   */
  async analyzeWithToolDetection(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    openRouterFetch: (model: string, messages: Array<{ role: string; content: string }>) => Promise<{ content: string }>,
    mcpContext?: MCPContext
  ): Promise<AnalysisResultWithTools> {
    // Get base analysis first
    const baseAnalysis = await this.analyze(userMessage, conversationHistory, openRouterFetch);

    // If no MCP context provided, return base analysis
    if (!mcpContext) {
      return {
        ...baseAnalysis,
        requiresMCP: false,
      };
    }

    // Detect tool requirements using pattern matching
    const toolRequirements = this.detectToolRequirements(userMessage, mcpContext);

    // If tools detected, add tool-use capability
    if (toolRequirements.length > 0) {
      const requiresMultiTool = toolRequirements.length > 1;
      const updatedCapabilities = [...baseAnalysis.capabilities];

      if (requiresMultiTool && !updatedCapabilities.includes('multi-tool')) {
        updatedCapabilities.push('multi-tool');
      } else if (!updatedCapabilities.includes('tool-use')) {
        updatedCapabilities.push('tool-use');
      }

      return {
        ...baseAnalysis,
        capabilities: updatedCapabilities,
        toolRequirements,
        requiresMCP: true,
        toolComplexity: this.calculateToolComplexity(toolRequirements),
      };
    }

    return {
      ...baseAnalysis,
      requiresMCP: false,
    };
  }

  /**
   * Detects tool requirements using pattern matching
   * Future: This could be enhanced with LLM-based detection
   */
  private detectToolRequirements(userMessage: string, mcpContext: MCPContext): ToolRequirement[] {
    const requirements: ToolRequirement[] = [];
    const message = userMessage.toLowerCase();

    // Search tool patterns
    if (
      /search|find|look up|latest|current|news|what's happening|research/i.test(userMessage) &&
      mcpContext.enabledTools.includes('search')
    ) {
      requirements.push({
        toolType: 'search',
        confidence: 0.8,
        reasoning: 'Query requests current information or web search',
        priority: 'required',
        estimatedCalls: 1,
      });
    }

    // Filesystem tool patterns
    if (
      /read file|write file|list files|directory|folder|file system|create file|delete file/i.test(userMessage) &&
      mcpContext.enabledTools.includes('filesystem')
    ) {
      requirements.push({
        toolType: 'filesystem',
        confidence: 0.9,
        reasoning: 'Query requires file system operations',
        priority: 'required',
        estimatedCalls: message.includes('all files') || message.includes('multiple') ? 5 : 1,
      });
    }

    // Git tool patterns
    if (
      /git|commit|branch|merge|pull|push|repository|repo/i.test(userMessage) &&
      mcpContext.enabledTools.includes('git')
    ) {
      requirements.push({
        toolType: 'git',
        confidence: 0.85,
        reasoning: 'Query involves git operations',
        priority: message.includes('must') || message.includes('need') ? 'required' : 'optional',
        estimatedCalls: 1,
      });
    }

    // Database tool patterns
    if (
      /database|query|sql|table|select|insert|update|delete from/i.test(userMessage) &&
      mcpContext.enabledTools.includes('database')
    ) {
      requirements.push({
        toolType: 'database',
        confidence: 0.9,
        reasoning: 'Query involves database operations',
        priority: 'required',
        estimatedCalls: 1,
      });
    }

    // Shell/command execution patterns
    if (
      /run command|execute|shell|terminal|command line|npm|yarn|pip|install/i.test(userMessage) &&
      mcpContext.enabledTools.includes('shell')
    ) {
      requirements.push({
        toolType: 'shell',
        confidence: 0.75,
        reasoning: 'Query requests command execution',
        priority: 'optional', // Commands are risky, mark as optional
        estimatedCalls: 1,
      });
    }

    // Browser automation patterns
    if (
      /screenshot|navigate|browser|web page|click|fill form/i.test(userMessage) &&
      mcpContext.enabledTools.includes('browser')
    ) {
      requirements.push({
        toolType: 'browser',
        confidence: 0.8,
        reasoning: 'Query requires browser automation',
        priority: 'required',
        estimatedCalls: 2,
      });
    }

    // Code analysis patterns
    if (
      /analyze code|parse|ast|syntax tree|code structure/i.test(userMessage) &&
      mcpContext.enabledTools.includes('code-analysis')
    ) {
      requirements.push({
        toolType: 'code-analysis',
        confidence: 0.85,
        reasoning: 'Query requires code parsing or analysis',
        priority: 'required',
        estimatedCalls: 1,
      });
    }

    // Calculator patterns
    if (
      /calculate|compute|math|arithmetic|formula|equation/i.test(userMessage) &&
      mcpContext.enabledTools.includes('calculator')
    ) {
      requirements.push({
        toolType: 'calculator',
        confidence: 0.9,
        reasoning: 'Query requires mathematical computation',
        priority: 'optional', // LLMs can do basic math
        estimatedCalls: 1,
      });
    }

    return requirements;
  }

  /**
   * Calculates tool orchestration complexity
   */
  private calculateToolComplexity(toolRequirements: ToolRequirement[]): number {
    if (toolRequirements.length === 0) return 0;
    if (toolRequirements.length === 1) return 3;

    // Multiple tools = higher complexity
    const baseComplexity = 5;
    const requiredTools = toolRequirements.filter(t => t.priority === 'required').length;
    const totalCalls = toolRequirements.reduce((sum, t) => sum + (t.estimatedCalls || 1), 0);

    // Add complexity for:
    // - Multiple required tools (+1 each)
    // - Multiple calls (+0.5 per call)
    const complexity = baseComplexity + requiredTools + (totalCalls * 0.5);

    return Math.min(10, Math.round(complexity));
  }
}
