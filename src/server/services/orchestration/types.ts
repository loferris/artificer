/**
 * Type definitions for Chain Orchestrator system
 */

export type TaskCategory =
  | 'code'
  | 'research'
  | 'creative'
  | 'analysis'
  | 'chat';

export type RequiredCapability =
  | 'reasoning'
  | 'speed'
  | 'knowledge'
  | 'creativity'
  | 'tool-use'        // Requires tool/function calling
  | 'multi-tool';     // Requires orchestrating multiple tools

export type RoutingStrategy =
  | 'single'        // Use single model
  | 'ensemble'      // Use multiple models and combine
  | 'speculative';  // Hedge bets with parallel execution

/**
 * Output from the Analyzer Agent
 */
export interface AnalysisResult {
  complexity: number;           // 1-10 scale
  category: TaskCategory;       // Task type
  capabilities: RequiredCapability[];  // Required model capabilities
  estimatedTokens: number;      // Estimated token count
  reasoning: string;            // Explanation of analysis
}

/**
 * Output from the Router Agent
 */
export interface RoutingPlan {
  primaryModel: string;         // Main model to use
  fallbackModels?: string[];    // Backup models
  strategy: RoutingStrategy;    // Routing strategy
  estimatedCost: number;        // Expected cost in USD
  reasoning: string;            // Explanation of routing decision
  shouldValidate: boolean;      // Whether to run validation
}

/**
 * Output from the Validator Agent
 */
export interface ValidationResult {
  isValid: boolean;             // Whether response is acceptable
  score: number;                // Quality score 0-10
  accuracy: number;             // Accuracy score 0-10
  completeness: number;         // Completeness score 0-10
  shouldRetry: boolean;         // Whether to retry with different model
  suggestedModel?: string;      // Model to retry with
  reasoning: string;            // Explanation of validation decision
  issues: string[];             // Specific issues found
}

/**
 * Execution result from the model
 */
export interface ExecutionResult {
  content: string;              // Generated response
  model: string;                // Model that generated it
  tokens: number;               // Tokens used
  cost: number;                 // Cost in USD
  latency: number;              // Response time in ms
  metadata?: Record<string, unknown>;
}

/**
 * Complete chain orchestration result
 */
export interface ChainResult {
  response: string;             // Final response to user
  model: string;                // Model used for final response
  totalCost: number;            // Total cost across all stages
  totalTokens: number;          // Total tokens across all stages
  successful: boolean;          // Whether chain completed successfully
  retryCount: number;           // Number of retries

  // Stage results
  analysis: AnalysisResult;
  routingPlan: RoutingPlan;
  execution: ExecutionResult;
  validation?: ValidationResult;

  // Metadata
  totalLatency: number;         // Total time in ms
  timestamp: Date;
  conversationId?: string;
}

/**
 * Configuration for chain orchestration
 */
export interface ChainConfig {
  analyzerModel: string;
  routerModel: string;
  validatorModel: string;
  availableModels: string[];

  // Thresholds
  minComplexityForChain: number;
  maxRetries: number;
  validationEnabled: boolean;

  // Cost settings
  maxCostPerRequest?: number;
  preferCheapModels?: boolean;
}

/**
 * Context for chain execution
 */
export interface ChainContext {
  userMessage: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  conversationId?: string;
  sessionId: string;
  config: ChainConfig;
  signal?: AbortSignal;
}

/**
 * Streaming event types
 */
export type StreamEventType =
  | 'analyzing'
  | 'routing'
  | 'executing'
  | 'validating'
  | 'retrying'
  | 'complete'
  | 'error';

/**
 * Streaming progress event
 */
export interface StreamEvent {
  type: StreamEventType;
  stage: string;
  message: string;
  progress: number; // 0-1
  metadata?: {
    analysis?: AnalysisResult;
    routingPlan?: RoutingPlan;
    model?: string;
    retryCount?: number;
    content?: string; // Partial content during execution
    finished?: boolean;
  };
}

/**
 * Cache key for routing decisions
 */
export interface RouteCacheKey {
  messageHash: string; // Hash of message content
  complexity: number;
  category: TaskCategory;
}

/**
 * Cached routing decision
 */
export interface CachedRoute {
  key: RouteCacheKey;
  routingPlan: RoutingPlan;
  timestamp: Date;
  hitCount: number;
}

// ============================================================================
// MCP (Model Context Protocol) Integration Types
// ============================================================================

/**
 * MCP tool types - common tool categories
 */
export type MCPToolType =
  | 'filesystem'      // File system operations (read, write, list)
  | 'search'          // Web search (Brave, Google, etc.)
  | 'database'        // Database queries
  | 'api'             // External API calls
  | 'git'             // Git operations
  | 'shell'           // Shell command execution
  | 'browser'         // Browser automation
  | 'code-analysis'   // Code parsing and analysis
  | 'calculator'      // Mathematical computations
  | 'custom';         // Custom/unknown tools

/**
 * MCP tool capability definition
 */
export interface MCPToolCapability {
  type: MCPToolType;
  name: string;                   // Tool name (e.g., 'brave-search')
  description: string;            // What the tool does
  requiredParams?: string[];      // Required parameters
  cost?: number;                  // Cost per invocation (if applicable)
  latency?: number;               // Expected latency in ms
}

/**
 * MCP server configuration
 */
export interface MCPServer {
  id: string;                     // Unique server ID
  name: string;                   // Display name
  enabled: boolean;               // Whether server is active
  tools: MCPToolCapability[];     // Available tools
  healthStatus?: 'healthy' | 'degraded' | 'down';
  lastHealthCheck?: Date;
}

/**
 * MCP context - available tools and servers
 */
export interface MCPContext {
  servers: MCPServer[];           // Available MCP servers
  enabledTools: MCPToolType[];    // Currently enabled tool types
  toolPreferences?: {             // Preferences for tool selection
    preferredSearch?: string;     // e.g., 'brave-search' over 'google'
    maxCostPerTool?: number;      // Cost limit per tool call
    timeoutMs?: number;           // Tool invocation timeout
  };
}

/**
 * Tool requirement detected in query
 */
export interface ToolRequirement {
  toolType: MCPToolType;
  confidence: number;             // 0-1 confidence score
  reasoning: string;              // Why this tool is needed
  priority: 'required' | 'optional' | 'nice-to-have';
  estimatedCalls?: number;        // Expected number of tool calls
}

/**
 * Extended analysis result with MCP tool detection
 * Backward compatible - all MCP fields are optional
 */
export interface AnalysisResultWithTools extends AnalysisResult {
  toolRequirements?: ToolRequirement[];   // Detected tool needs
  requiresMCP?: boolean;                   // Whether MCP is needed
  toolComplexity?: number;                 // 1-10 scale for tool orchestration complexity
}
