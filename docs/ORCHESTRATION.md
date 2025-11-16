# Chain Orchestration & Model Registry

This document describes the intelligent chain-of-models orchestration system and the dynamic ModelRegistry that powers adaptive model selection.

## Overview

The orchestration system automatically analyzes user queries, routes them to appropriate AI models, validates responses, and retries with different models if needed - all transparently to the user.

**Key Benefits:**
- **Cost Optimization**: Use cheaper models for simple tasks, expensive models only when needed
- **Quality Assurance**: Automatic validation and retry with better models if responses are inadequate
- **Adaptive Routing**: Dynamic model selection based on task complexity and requirements
- **Real-time Updates**: Model metadata automatically refreshed from OpenRouter API

## Architecture

The system operates in 4 stages:

```
User Query → Analyze → Route → Execute → Validate
                ↓        ↓        ↓         ↓
             Complexity  Model   Response  Quality
             Assessment Selection  Stream   Check
                                             ↓
                                          Retry?
```

### 1. **Analyzer Agent** (`AnalyzerAgent.ts`)
- **Purpose**: Analyzes user query to determine complexity and requirements
- **Model Used**: Fast/cheap model (e.g., `deepseek/deepseek-chat`)
- **Output**: Task analysis with complexity (1-10), category, required capabilities

**Example Analysis:**
```json
{
  "complexity": 7,
  "category": "code",
  "capabilities": ["reasoning", "knowledge"],
  "estimatedTokens": 1500,
  "reasoning": "Complex coding task requiring multi-step implementation"
}
```

### 2. **Router Agent** (`RouterAgent.ts`)
- **Purpose**: Selects optimal model(s) based on analysis
- **Model Used**: Fast model (e.g., `anthropic/claude-3-haiku`)
- **Output**: Routing plan with primary model, fallbacks, strategy, estimated cost

**Example Routing Plan:**
```json
{
  "primaryModel": "anthropic/claude-3-5-sonnet",
  "fallbackModels": ["deepseek/deepseek-chat"],
  "strategy": "single",
  "estimatedCost": 0.0045,
  "reasoning": "Complex code task requires capable model",
  "shouldValidate": true
}
```

**Routing Strategies:**
- `single`: Use one model (most common)
- `ensemble`: Use multiple models and combine results (for critical tasks)
- `speculative`: Run multiple models in parallel, use fastest (time-sensitive)

### 3. **Execution**
- Executes user query with selected model
- Streams response to client in real-time
- Tracks tokens, latency, cost

### 4. **Validator Agent** (`ValidatorAgent.ts`)
- **Purpose**: Validates response quality
- **Model Used**: Quality model (e.g., `anthropic/claude-3-5-sonnet`)
- **Output**: Validation result with quality scores and retry recommendation

**Example Validation:**
```json
{
  "isValid": false,
  "score": 5.5,
  "accuracy": 6,
  "completeness": 5,
  "shouldRetry": true,
  "suggestedModel": "anthropic/claude-3-5-sonnet",
  "reasoning": "Response lacks implementation details",
  "issues": ["Missing error handling", "Incomplete example"]
}
```

**Retry Logic:**
- If validation fails (`score < 7`) and better model available → retry
- Maximum retries configurable (default: 2)
- Each retry uses progressively better model

## Model Registry

The `ModelRegistry` provides dynamic model metadata using a 3-tier fallback system:

### 1. **OpenRouter API** (Primary Source)
- Fetches real-time model data from `https://openrouter.ai/api/v1/models`
- Updates pricing, capabilities, context windows automatically
- 1-hour cache with background refresh
- Handles API failures gracefully

### 2. **Config File** (Fallback)
- `config/models.json` contains pattern-based metadata
- Matches model families using glob patterns (e.g., `deepseek/*`)
- Easy to update without code changes

**Example Configuration:**
```json
{
  "models": [
    {
      "pattern": "deepseek/*",
      "tier": "cheap",
      "strengths": ["code", "analysis", "speed"],
      "costPer1kTokens": 0.00014,
      "maxTokens": 8000
    },
    {
      "pattern": "anthropic/claude-3-5-sonnet*",
      "tier": "mid",
      "strengths": ["code", "reasoning", "analysis", "creative"],
      "costPer1kTokens": 0.003,
      "maxTokens": 8000
    }
  ],
  "defaults": {
    "tier": "mid",
    "strengths": ["chat"],
    "costPer1kTokens": 0.001,
    "maxTokens": 4096
  }
}
```

### 3. **Smart Inference** (Last Resort)
- Infers metadata from model name
- Recognizes common model families (Claude, GPT, DeepSeek, etc.)
- Assigns reasonable defaults based on naming patterns

**Model Metadata Structure:**
```typescript
interface ModelMetadata {
  tier: 'cheap' | 'mid' | 'expensive';
  strengths: string[];          // ['code', 'reasoning', 'creative', etc.]
  costPer1kTokens: number;      // USD per 1k tokens
  maxTokens: number;            // Context window size
}
```

**Usage in Code:**
```typescript
// Initialize global registry (singleton pattern)
const registry = new ModelRegistry();
await registry.initialize(); // Non-blocking, uses fallback if fails

// Get metadata for specific model
const metadata = registry.getMetadata('anthropic/claude-3-5-sonnet');
// Returns: { tier: 'mid', strengths: [...], costPer1kTokens: 0.003, ... }

// Get metadata map for multiple models
const availableModels = ['deepseek/deepseek-chat', 'anthropic/claude-3-haiku'];
const metadataMap = registry.getMetadataMap(availableModels);
// Returns: Map<string, ModelMetadata>
```

## Configuration

### Environment Variables

Add to `.env` (see `.env.example` for full reference):

```bash
# Enable/disable chain orchestration
CHAIN_ROUTING_ENABLED=true

# Models for each orchestration stage
ANALYZER_MODEL=deepseek/deepseek-chat
ROUTER_MODEL=anthropic/claude-3-haiku
VALIDATOR_MODEL=anthropic/claude-3-5-sonnet

# Available models for execution (comma-separated)
OPENROUTER_MODELS=deepseek/deepseek-chat,anthropic/claude-3-haiku,anthropic/claude-3-5-sonnet,openai/gpt-4o-mini

# Routing thresholds
CHAIN_ROUTING_MIN_COMPLEXITY=5  # Only use orchestration for complexity > 5

# Quality settings
VALIDATION_ENABLED=true
MAX_RETRIES=2

# Cost optimization
PREFER_CHEAP_MODELS=false  # Prefer cheaper models when quality difference is minimal
```

### Model Selection Guidelines

**Analyzer Model:**
- Should be: Fast, cheap, good at classification
- Recommended: `deepseek/deepseek-chat`, `anthropic/claude-3-haiku`
- Not recommended: Expensive models (overkill for simple analysis)

**Router Model:**
- Should be: Fast, good reasoning, familiar with model landscape
- Recommended: `anthropic/claude-3-haiku`, `openai/gpt-4o-mini`
- Not recommended: Very cheap models (routing quality matters)

**Validator Model:**
- Should be: High quality, good at evaluation
- Recommended: `anthropic/claude-3-5-sonnet`, `openai/gpt-4o`
- Not recommended: Cheap models (validation quality is critical)

**Execution Models:**
- Include range of models across tiers
- Recommended mix: 1-2 cheap, 2-3 mid-tier, 1 expensive
- Example: `deepseek/deepseek-chat` (cheap), `claude-3-haiku` (cheap), `claude-3-5-sonnet` (mid), `gpt-4o` (mid), `claude-opus` (expensive)

## Usage

### Frontend Integration

The orchestration system is integrated into the chat UI with real-time progress visibility:

```typescript
import { useOrchestrationStreaming } from '@/hooks/chat/useOrchestrationStreaming';

function ChatComponent() {
  const { sendMessage, orchestrationState } = useOrchestrationStreaming();

  // Send message using orchestration
  await sendMessage({
    content: "Write a React component for user authentication",
    conversationId: "conv-123"
  });

  // Display orchestration progress
  return (
    <OrchestrationProgress
      stage={orchestrationState.stage}
      message={orchestrationState.message}
      progress={orchestrationState.progress}
      metadata={orchestrationState.metadata}
    />
  );
}
```

**Orchestration Stages (UI):**
- `analyzing`: Analyzing query complexity...
- `routing`: Selecting optimal model...
- `executing`: Generating response...
- `validating`: Validating response quality...
- `retrying`: Retrying with better model... (if validation fails)
- `complete`: Complete

### Backend API

```typescript
import { orchestrationRouter } from '@/server/routers/orchestration';

// Send message with orchestration
const result = await trpc.orchestration.chainChat.mutate({
  content: "Explain quantum computing",
  conversationId: "conv-123"
});

// Result includes orchestration metadata
console.log(result.chainMetadata);
/*
{
  complexity: 6,
  category: "research",
  strategy: "single",
  retryCount: 0,
  successful: true,
  totalLatency: 1834,
  validationScore: 8.5
}
*/
```

### Analytics

Query routing decisions and performance:

```typescript
const analytics = await trpc.orchestration.getRoutingAnalytics.query({
  limit: 50,
  conversationId: "conv-123" // Optional: filter by conversation
});

console.log(analytics.summary);
/*
{
  total: 50,
  successful: 48,
  averageCost: 0.0023,
  averageRetries: 0.12,
  modelDistribution: {
    "deepseek/deepseek-chat": 20,
    "anthropic/claude-3-5-sonnet": 18,
    "anthropic/claude-3-haiku": 12
  }
}
*/
```

## Cost Analysis

### Example Cost Breakdown

**Simple Chat Query (Complexity 3):**
```
Analyzer:  $0.00001  (deepseek, ~100 tokens)
Router:    $0.00002  (haiku, ~150 tokens)
Execution: $0.00005  (deepseek, ~500 tokens)
Validation: SKIPPED (complexity < 5)
─────────────────────────────────────
Total:     $0.00008
```

**Complex Code Task (Complexity 8):**
```
Analyzer:   $0.00002  (deepseek, ~200 tokens)
Router:     $0.00003  (haiku, ~200 tokens)
Execution:  $0.00450  (sonnet, ~1500 tokens)
Validation: $0.00030  (sonnet, ~100 tokens)
─────────────────────────────────────
Total:      $0.00485

Traditional (always using Sonnet): $0.00500
Savings: ~3% (but with quality assurance!)
```

**Failed Validation + Retry:**
```
Analyzer:    $0.00002
Router:      $0.00003
Execution 1: $0.00010  (haiku, failed validation)
Validation:  $0.00030
Execution 2: $0.00450  (sonnet, passed)
─────────────────────────────────────
Total:       $0.00495

Traditional (always Sonnet): $0.00500
Result: Same cost, but tried cheaper model first!
```

### Cost Optimization Tips

1. **Set appropriate complexity threshold**: Higher `CHAIN_ROUTING_MIN_COMPLEXITY` → fewer orchestration calls
2. **Enable PREFER_CHEAP_MODELS**: Routes to cheaper models when quality difference is minimal
3. **Tune VALIDATION_ENABLED**: Disable for simple tasks (complexity < 5) to save validation costs
4. **Choose analyzer wisely**: Use cheapest reliable model (DeepSeek, Haiku)
5. **Monitor analytics**: Review `modelDistribution` to ensure sensible routing

## Troubleshooting

### Orchestration Not Working

**Check if enabled:**
```bash
# In .env
CHAIN_ROUTING_ENABLED=true
```

**Check complexity threshold:**
```bash
# Lower threshold to test with simple queries
CHAIN_ROUTING_MIN_COMPLEXITY=3
```

**Check logs:**
```bash
# Backend logs show orchestration flow
[AnalyzerAgent] Analysis complete: complexity=7, category=code
[RouterAgent] Selected model: anthropic/claude-3-5-sonnet
[ValidatorAgent] Validation score: 8.5, isValid=true
```

### Model Registry Not Updating

**Check OpenRouter API key:**
```bash
# In .env
OPENROUTER_API_KEY=sk-or-v1-...
```

**Check logs for initialization:**
```bash
[ModelRegistry] Initialized with 150 models from OpenRouter API
# OR
[ModelRegistry] API fetch failed, using config fallback
```

**Manually refresh registry:**
```typescript
// In orchestration router
globalModelRegistry = null; // Clear singleton
await getModelRegistry();   // Re-initialize
```

### Validation Always Failing

**Check validator model quality:**
```bash
# Use high-quality model for validation
VALIDATOR_MODEL=anthropic/claude-3-5-sonnet
```

**Increase retry limit:**
```bash
MAX_RETRIES=3  # Allow more retry attempts
```

**Review validation logs:**
```bash
[ValidatorAgent] Validation failed: score=5.5, issues=["Missing details"]
```

## Database Schema

The orchestration system tracks all routing decisions for analytics using a **PII-safe schema** that stores only metadata and aggregated metrics:

```prisma
model RoutingDecision {
  id               String    @id @default(cuid())

  // PII-safe prompt analytics (no user content stored)
  promptHash       String    // SHA-256 hash for deduplication
  promptLength     Int       // Character count for analytics
  complexity       Int       // 1-10 scale from analyzer
  category         String    // Task category: code, research, creative, analysis, chat

  // Metadata (no PII)
  executedModel    String    // The model that was actually used
  totalCost        Decimal   @db.Decimal(10, 6) // Total cost in USD
  successful       Boolean   // Whether the final response was successful
  retryCount       Int       @default(0) // Number of retries attempted
  latencyMs        Int       // Total latency in milliseconds

  // Optional fields
  conversationId   String?   // Link to conversation (indirect PII - consider removing for full anonymization)
  strategy         String?   // Routing strategy: single, ensemble, speculative
  validationScore  Int?      // Validation score 1-10 (if validated)

  // Timestamps
  createdAt        DateTime  @default(now())
  expiresAt        DateTime  @default(dbgenerated("NOW() + INTERVAL '30 days'")) // Auto-cleanup after 30 days

  @@map("routing_decisions")
  @@index([conversationId])
  @@index([executedModel])
  @@index([successful])
  @@index([createdAt])
  @@index([complexity])
  @@index([category])
  @@index([expiresAt]) // For efficient cleanup queries
}
```

**Privacy & Compliance:**
- ❌ **No PII stored**: User prompts and AI responses are never stored
- ✅ **Hash-based deduplication**: SHA-256 hashing prevents duplicate analysis
- ✅ **30-day TTL**: Automatic data expiration for compliance
- ✅ **Metadata-only tracking**: Only aggregate metrics and performance data

**Access analytics:**
```sql
-- Most used models
SELECT executedModel, COUNT(*) as usage
FROM routing_decisions
GROUP BY executedModel
ORDER BY usage DESC;

-- Average cost by complexity
SELECT
  complexity,
  AVG(totalCost) as avg_cost,
  COUNT(*) as request_count
FROM routing_decisions
GROUP BY complexity
ORDER BY complexity;

-- Average cost by category
SELECT
  category,
  AVG(totalCost) as avg_cost,
  AVG(latencyMs) as avg_latency_ms,
  COUNT(*) as request_count
FROM routing_decisions
GROUP BY category
ORDER BY avg_cost DESC;

-- Retry rate and success rate
SELECT
  AVG(retryCount) as avg_retries,
  SUM(CASE WHEN retryCount > 0 THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as retry_rate,
  SUM(CASE WHEN successful THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as success_rate
FROM routing_decisions;

-- Performance metrics by model
SELECT
  executedModel,
  COUNT(*) as usage,
  AVG(latencyMs) as avg_latency_ms,
  AVG(totalCost) as avg_cost,
  SUM(CASE WHEN successful THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as success_rate
FROM routing_decisions
GROUP BY executedModel
ORDER BY usage DESC;
```

## Future Enhancements

**Planned Features:**
- **Learning from feedback**: Track user satisfaction to improve routing
- **Cost budgets**: Set maximum cost per query, route accordingly
- **Custom routing rules**: User-defined rules for specific query patterns
- **Multi-stage execution**: Break complex tasks into sub-tasks with different models
- **Ensemble voting**: Combine responses from multiple models for critical decisions
- **Streaming validation**: Validate responses as they stream, cancel early if quality poor
- **Model performance tracking**: Track latency, quality, cost per model over time
- **A/B testing**: Compare routing strategies for optimization

## Related Documentation

- [SSE Streaming](./SSE_STREAMING.md) - Real-time streaming implementation
- [UI Orchestration Integration](./UI_ORCHESTRATION_INTEGRATION.md) - Frontend integration details
- [API Documentation](./API.md) - Complete API reference
- [Authentication](./AUTHENTICATION.md) - API key setup for production

## References

- **OpenRouter API**: https://openrouter.ai/docs
- **Model Pricing**: https://openrouter.ai/models
- **tRPC Documentation**: https://trpc.io/docs
- **Prisma Schema**: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference
