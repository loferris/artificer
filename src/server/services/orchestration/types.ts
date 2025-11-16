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
  | 'creativity';

export type RoutingStrategy =
  | 'single'        // Use single model
  | 'ensemble'      // Use multiple models and combine
  | 'speculative';  // Hedge bets with parallel execution

/**
 * File attachment for structured queries
 */
export interface FileAttachment {
  filename: string;
  content: string;
  mimeType?: string;
  size?: number;
}

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

  // Security and data separation
  uploadedFiles?: FileAttachment[];  // User-uploaded files (treated as untrusted data)
  projectId?: string;                // Project context (if querying project documents)
  useStructuredQuery?: boolean;      // Enable/disable StructuredQueryService (default: true)
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
