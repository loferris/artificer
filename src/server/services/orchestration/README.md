# Chain Orchestrator System

Intelligent chain-of-models orchestration for optimal AI response quality and cost efficiency.

## Overview

The Chain Orchestrator implements a 4-stage pipeline that automatically:
1. **Analyzes** user queries to understand complexity and requirements
2. **Routes** to the optimal model(s) based on the analysis
3. **Executes** the query using the selected model
4. **Validates** the response and retries if needed

## Architecture

```
User Query
    ↓
┌─────────────────────────────────────┐
│  1. ANALYZER AGENT                  │
│  - Determines complexity (1-10)     │
│  - Categorizes task type            │
│  - Estimates token requirements     │
│  Model: Fast/cheap (DeepSeek)       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  2. ROUTER AGENT                    │
│  - Selects optimal execution model  │
│  - Chooses strategy (single/etc)    │
│  - Estimates costs                  │
│  Model: Fast (Claude Haiku)         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  3. EXECUTOR                        │
│  - Runs query with selected model   │
│  - Handles retries on failure       │
│  - Tracks performance metrics       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  4. VALIDATOR AGENT                 │
│  - Checks response quality          │
│  - Scores accuracy/completeness     │
│  - Triggers retry if needed         │
│  Model: Quality (Claude Sonnet)     │
└─────────────────────────────────────┘
    ↓
Final Response + Metadata
```

## Configuration

All configuration is via environment variables in `.env`:

```bash
# Enable/disable chain routing
CHAIN_ROUTING_ENABLED=true

# Agent models
ANALYZER_MODEL=deepseek/deepseek-chat
ROUTER_MODEL=anthropic/claude-3-haiku
VALIDATOR_MODEL=anthropic/claude-3-5-sonnet

# Available execution models
OPENROUTER_MODELS=deepseek/deepseek-chat,anthropic/claude-3-haiku,anthropic/claude-3-5-sonnet,openai/gpt-4o-mini

# Thresholds
CHAIN_ROUTING_MIN_COMPLEXITY=5  # Only use chain for complexity > 5
VALIDATION_ENABLED=true
MAX_RETRIES=2

# Cost optimization
PREFER_CHEAP_MODELS=false
```

## Usage

### Via tRPC

```typescript
// Client-side
import { trpc } from '@/lib/trpc';

const result = await trpc.orchestration.chainChat.mutate({
  content: 'Write a complex algorithm in Python',
  conversationId: 'conv-123',
});

// Result includes:
// - content: The AI response
// - model: Which model was used
// - cost: Total cost across all stages
// - chainMetadata: Complexity, retries, validation scores, etc.
```

### Programmatically

```typescript
import { ChainOrchestrator } from '@/server/services/orchestration/ChainOrchestrator';
import { createServiceContainer } from '@/server/services/ServiceFactory';

const services = createServiceContainer({ db, forceDemo: false });
const config = buildChainConfig(); // From env vars

const orchestrator = new ChainOrchestrator(
  config,
  services.assistant,
  db
);

const result = await orchestrator.orchestrate({
  userMessage: 'Your query here',
  conversationHistory: [],
  sessionId: 'session-123',
  config,
});
```

## How It Works

### 1. Query Analysis

The Analyzer Agent examines the query and returns:

```typescript
{
  complexity: 7,              // 1-10 scale
  category: 'code',           // code|research|creative|analysis|chat
  capabilities: ['reasoning', 'knowledge'],
  estimatedTokens: 2000,
  reasoning: 'Complex code generation requiring deep understanding'
}
```

**Complexity Scale:**
- 1-3: Simple chat, greetings, basic Q&A
- 4-6: Moderate tasks, explanations, simple code
- 7-9: Complex analysis, advanced coding, multi-step reasoning
- 10: Very complex requiring deep expertise

### 2. Model Routing

The Router Agent selects the best model(s):

```typescript
{
  primaryModel: 'anthropic/claude-3-5-sonnet',
  fallbackModels: ['openai/gpt-4o-mini'],
  strategy: 'single',         // single|ensemble|speculative
  estimatedCost: 0.006,
  shouldValidate: true,
  reasoning: 'Complex task requires capable reasoning model'
}
```

**Routing Strategies:**
- `single`: Use one model (most common)
- `ensemble`: Use multiple models and combine results
- `speculative`: Run models in parallel, use fastest

### 3. Execution

Executes the query using the selected model and tracks:
- Response content
- Token usage
- Cost
- Latency
- Model used

### 4. Validation

For complex tasks (complexity ≥ 7), validates the response:

```typescript
{
  isValid: true,
  score: 9,                   // 0-10
  accuracy: 9,
  completeness: 9,
  shouldRetry: false,
  issues: [],
  reasoning: 'Response is comprehensive and accurate'
}
```

If validation fails (`score < 7`), the orchestrator:
1. Selects a more capable model
2. Retries the query
3. Validates again
4. Repeats up to `MAX_RETRIES` times

## Cost Optimization

The system automatically optimizes costs by:

1. **Cheap Analyzers/Routers**: Uses inexpensive models for analysis/routing
2. **Complexity Gating**: Only uses expensive models for complex tasks
3. **Smart Retries**: Only retries when validation suggests it's needed
4. **Model Selection**: Chooses cheapest model that meets quality requirements

**Example Cost Breakdown:**
```
Simple query (complexity 3):
  - Analyzer: $0.00001
  - No routing/validation (below threshold)
  - Executor: $0.0001 (cheap model)
  - Total: ~$0.00011

Complex query (complexity 8):
  - Analyzer: $0.00001
  - Router: $0.00003
  - Executor: $0.003 (premium model)
  - Validator: $0.0001
  - Total: ~$0.00314
```

## Analytics

### Routing Decisions Table

All routing decisions are stored in the database:

```sql
routing_decisions
  - id: Unique ID
  - prompt: Original user query
  - analysis: Full analyzer output (JSON)
  - routingPlan: Full router output (JSON)
  - executedModel: Model that was used
  - validationResult: Full validator output (JSON)
  - totalCost: Total cost in USD
  - successful: Whether it succeeded
  - retryCount: Number of retries
  - conversationId: Link to conversation
  - createdAt: Timestamp
```

### Query Analytics

```typescript
const analytics = await trpc.orchestration.getRoutingAnalytics.query({
  limit: 50,
  conversationId: 'conv-123', // optional
});

// Returns:
// - decisions: Array of routing decisions
// - summary:
//   - total: Total decisions
//   - successful: Success count
//   - averageCost: Average cost per request
//   - averageRetries: Average retries
//   - modelDistribution: Usage by model
```

## Testing

Comprehensive test suite in `__tests__/ChainOrchestrator.test.ts`:

```bash
npm test orchestration
```

**Test Scenarios:**
- ✅ Simple query (low complexity)
- ✅ Complex query (high complexity)
- ✅ Failed validation with retry
- ✅ Code generation routing
- ✅ Database integration
- ✅ Configuration options
- ✅ Error handling

## Integration with Existing Chat

The orchestration system is **completely optional** and runs alongside the existing chat:

- `chat.sendMessage`: Original simple routing (still works)
- `orchestration.chainChat`: New intelligent routing

Both endpoints:
- Use the same services (OpenRouter, Database, etc.)
- Return the same message format
- Store messages in the same tables
- Support the same features (streaming, RAG, etc.)

## Migration

To enable chain orchestration:

1. **Update Environment:**
   ```bash
   cp .env.example .env
   # Add chain orchestration config
   ```

2. **Run Migration:**
   ```bash
   npx prisma migrate dev
   ```

3. **Update Client (Optional):**
   ```typescript
   // Change from:
   trpc.chat.sendMessage.mutate({ ... })

   // To:
   trpc.orchestration.chainChat.mutate({ ... })
   ```

## Performance Considerations

**Latency:**
- Simple queries: ~2-3s (single model call)
- Complex queries: ~5-10s (analyzer + router + executor + validator)
- With retries: +3-5s per retry

**Cost:**
- Adds ~$0.00005 per request (analyzer + router)
- Validation adds ~$0.0001
- Total overhead: ~$0.00015 per request
- Savings: Can be 10-100x by using optimal model selection

**When to Use:**
- ✅ Production apps with cost concerns
- ✅ Apps needing high quality responses
- ✅ Variable complexity workloads
- ❌ Latency-critical apps (<1s requirement)
- ❌ All queries are similar complexity

## Future Enhancements

- [ ] Ensemble strategy implementation
- [ ] Speculative execution strategy
- [ ] Learning from routing decisions (ML-based routing)
- [ ] A/B testing different routing strategies
- [ ] User feedback integration into validation
- [ ] Real-time cost optimization
- [ ] Streaming support for long responses

## Support

For issues or questions:
- Check logs: `[ChainOrchestrator]` prefix
- Review analytics: `getRoutingAnalytics` endpoint
- Test locally: `npm test orchestration`
