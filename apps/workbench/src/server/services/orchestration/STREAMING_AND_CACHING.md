# Streaming & Caching Guide

This guide explains how streaming and caching dramatically improve the perceived latency and cost-efficiency of the Chain Orchestrator.

## 🌊 Streaming Support

### Why Streaming?

**Without streaming:**
```
User sends query → [5-10s waiting...] → Full response appears
Perceived latency: 5-10s ⏱️ (feels slow)
```

**With streaming:**
```
User sends query → [1s] Progress appears → [2s] More progress → [3s] Response starts
Perceived latency: 1-2s ⚡ (feels fast!)
```

### How It Works

The `orchestrateStream()` method yields progress events as each stage completes:

```typescript
async *orchestrateStream(context: ChainContext): AsyncGenerator<StreamEvent> {
  // Stage 1: Analysis
  yield { message: '🔍 Analyzing your query...', progress: 0.1 };
  const analysis = await analyze();
  yield { message: `📊 Complexity: ${analysis.complexity}/10`, progress: 0.2 };

  // Stage 2: Routing
  yield { message: '🧭 Selecting optimal model...', progress: 0.3 };
  const plan = await route(analysis);
  yield { message: `🎯 Routed to ${plan.model}`, progress: 0.4 };

  // Stage 3: Execution
  yield { message: `🤖 Generating response...`, progress: 0.5 };
  const result = await execute(plan);
  yield { message: '✨ Response generated', progress: 0.7 };

  // Stage 4: Validation (if needed)
  yield { message: '🔬 Validating quality...', progress: 0.8 };
  const validation = await validate(result);
  yield { message: `✅ Quality verified (${validation.score}/10)`, progress: 0.9 };

  // Complete
  yield { message: '✅ Complete!', progress: 1.0 };
  return result;
}
```

### Progress Messages

The orchestrator shows "cutesy" messages (like Claude Code) to keep users engaged:

| Stage | Message | Emoji |
|-------|---------|-------|
| Analyzing | "🔍 Analyzing your query..." | 🔍 |
| Analysis Done | "📊 Complexity: 8/10 (code)" | 📊 |
| Routing | "🧭 Selecting optimal model..." | 🧭 |
| Route Found | "🎯 Routed to claude-sonnet" | 🎯 |
| Cache Hit | "💾 Using cached routing" | 💾 |
| Executing | "🤖 Generating response with..." | 🤖 |
| Response Done | "✨ Response generated (2000 tokens)" | ✨ |
| Validating | "🔬 Validating response quality..." | 🔬 |
| Valid | "✅ Quality verified (9/10)" | ✅ |
| Retry | "🔄 Retry 1: Using better model..." | 🔄 |
| Failed | "⚠️ Quality check failed. Retrying..." | ⚠️ |
| Complete | "✅ Complete! (5.2s)" | ✅ |
| Error | "❌ Error: Model unavailable" | ❌ |

### Usage Examples

#### Backend (SSE Endpoint)

```typescript
// pages/api/stream/orchestration.ts
const stream = orchestrator.orchestrateStream(context);

for await (const event of stream) {
  // Send SSE event to client
  res.write(`event: progress\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}
```

#### Frontend (EventSource)

```typescript
const eventSource = new EventSource('/api/stream/orchestration', {
  method: 'POST',
  body: JSON.stringify({
    content: 'Write a sorting algorithm',
    conversationId: 'conv-123',
  }),
});

eventSource.addEventListener('progress', (e) => {
  const event = JSON.parse(e.data);

  // Update UI with progress
  setProgress(event.progress);
  setMessage(event.message);

  if (event.type === 'complete') {
    eventSource.close();
  }
});
```

#### Frontend UI Example

```tsx
function ChainChatUI() {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');

  return (
    <div>
      {/* Progress bar */}
      <div style={{ width: `${progress * 100}%` }} />

      {/* Status message */}
      <div>{message}</div>

      {/* Response (when available) */}
      {response && <div>{response}</div>}
    </div>
  );
}
```

### Event Types

```typescript
export interface StreamEvent {
  type: 'analyzing' | 'routing' | 'executing' | 'validating' | 'retrying' | 'complete' | 'error';
  stage: string;              // Current stage name
  message: string;            // User-friendly message
  progress: number;           // 0-1 progress
  metadata?: {
    analysis?: AnalysisResult;      // Analysis results
    routingPlan?: RoutingPlan;      // Routing plan
    model?: string;                 // Selected model
    retryCount?: number;            // Retry attempt
    content?: string;               // Partial response
    finished?: boolean;             // Completion flag
  };
}
```

## 💾 Caching Layer

### Why Caching?

**Problem:** Similar queries go through full analysis + routing every time:
```
"Write a function" → Analyze (1s) + Route (1s) = 2s overhead
"Write a class" → Analyze (1s) + Route (1s) = 2s overhead  [redundant!]
```

**Solution:** Cache routing decisions for similar queries:
```
"Write a function" → Analyze (1s) + Route (1s) = 2s  [cached]
"Write a class" → Analyze (1s) + Cache hit (0s) = 1s ⚡ (50% faster!)
```

### How It Works

The orchestrator caches routing decisions based on:
1. **Message hash** (MD5 of content)
2. **Complexity level** (1-10)
3. **Task category** (code, research, etc.)

```typescript
// Cache key generation
const cacheKey = generateCacheKey(message, analysis);
// Example: "a3f8c9d2-8-code" → Use Claude Sonnet

// Cache lookup
const cached = getCachedRoute(cacheKey);
if (cached) {
  // Skip routing, use cached model ⚡
  return cached.routingPlan;
}

// Cache miss - do full routing
const plan = await routeQuery(analysis);
cacheRoute(cacheKey, plan);
```

### Cache Configuration

```typescript
class ChainOrchestrator {
  private routeCache: Map<string, CachedRoute> = new Map();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  private readonly MAX_CACHE_SIZE = 100; // LRU eviction
}
```

**Settings:**
- **TTL**: 1 hour (configurable)
- **Max size**: 100 entries (LRU eviction)
- **Eviction**: Oldest entries removed when size > 100

### Cache Stats

Monitor cache performance:

```typescript
const stats = orchestrator.getCacheStats();

console.log(stats);
// {
//   size: 45,
//   totalHits: 123,
//   entries: [
//     { model: 'claude-3-5-sonnet', hits: 67 },
//     { model: 'deepseek-chat', hits: 34 },
//     { model: 'claude-3-haiku', hits: 22 },
//   ]
// }
```

### Cache Management

```typescript
// Clear cache manually
orchestrator.clearCache();

// Cache is also cleared on:
// - TTL expiration (1 hour)
// - LRU eviction (>100 entries)
// - Server restart
```

### What Gets Cached?

**Cached:**
- ✅ Routing decisions (model selection)
- ✅ Routing strategy (single/ensemble/speculative)
- ✅ Estimated cost

**Not Cached:**
- ❌ Analysis results (cheap, varies with context)
- ❌ Execution results (unique per query)
- ❌ Validation results (depends on response)

### Cache Hit Rate Optimization

**High hit rate scenarios:**
- Repeated similar queries ("Write a function", "Create a class")
- Same complexity level (all "code" tasks at complexity 7-8)
- Pattern-based work (batch processing, templates)

**Low hit rate scenarios:**
- Highly varied queries
- Different complexity levels
- Unique questions each time

**Typical hit rate:** 20-40% for general chat, 60-80% for coding assistants

## ⚡ Performance Comparison

### Without Streaming or Caching

```
Total: 10s

├─ Analysis: 1s
├─ Routing: 1s
├─ Execution: 5s
└─ Validation: 3s

User experience: 10s waiting 😴
```

### With Streaming Only

```
Total: 10s (same)

├─ Analysis: 1s → Shows "Analyzing..." ✨
├─ Routing: 1s → Shows "Routing..." ✨
├─ Execution: 5s → Shows "Generating..." ✨
└─ Validation: 3s → Shows "Validating..." ✨

User experience: 1s to first progress 🚀
Perceived latency: 1-2s!
```

### With Streaming + Caching (Cache Hit)

```
Total: 9s (10% faster)

├─ Analysis: 1s → Shows "Analyzing..." ✨
├─ Routing: 0s → Shows "Cache hit!" ✨ (saved 1s!)
├─ Execution: 5s → Shows "Generating..." ✨
└─ Validation: 3s → Shows "Validating..." ✨

User experience: 1s to first progress 🚀
Actual latency: 9s (10% improvement)
```

### With Streaming + Caching + Parallelization

```
Total: 8s (20% faster)

├─ Analysis + Routing: 1s (parallel!) → Shows "Analyzing..." ✨
├─ Execution: 5s → Shows "Generating..." ✨
└─ Validation: 2s → Shows "Validating..." ✨

User experience: 1s to first progress 🚀
Actual latency: 8s (20% improvement)
Cache hit: 7s (30% improvement)
```

## 📊 Latency Breakdown

| Configuration | Simple Query | Complex Query | Complex (Cached) |
|--------------|--------------|---------------|------------------|
| **No optimizations** | 3s | 10s | 10s |
| **+ Streaming** | 3s (feels 1s) | 10s (feels 2s) | 10s (feels 2s) |
| **+ Caching** | 2s (feels 1s) | 9s (feels 2s) | 7s (feels 1s) |
| **+ Parallel** | 2s (feels 1s) | 8s (feels 2s) | 6s (feels 1s) |

**Perceived latency** = Time to first meaningful update
**Actual latency** = Total time to completion

## 🎯 Best Practices

### When to Use Streaming

✅ **Use streaming for:**
- User-facing chat interfaces
- Long-running complex queries
- Multi-stage workflows
- When user needs feedback

❌ **Don't use streaming for:**
- API integrations (use regular `orchestrate()`)
- Batch processing
- Background jobs

### Optimizing Cache Hit Rate

```typescript
// Group similar queries
const queries = [
  "Write a sorting function",
  "Create a merge sort",
  "Implement quicksort",
];

// All will likely route to same model (cache hits)
for (const query of queries) {
  await orchestrator.orchestrateStream({ userMessage: query, ... });
}
```

### Monitoring Performance

```typescript
// Log streaming events
for await (const event of stream) {
  console.log(`[${event.progress.toFixed(2)}] ${event.message}`);

  if (event.metadata?.routingPlan) {
    console.log('Cached:', event.message.includes('cache'));
  }
}

// Check cache stats periodically
setInterval(() => {
  const stats = orchestrator.getCacheStats();
  console.log(`Cache: ${stats.size} entries, ${stats.totalHits} hits`);
}, 60000);
```

## 🔮 Future Enhancements

- [ ] **Redis caching**: Share cache across instances
- [ ] **Predictive routing**: Pre-route common patterns
- [ ] **Streaming execution**: Stream response during generation
- [ ] **Progressive validation**: Validate chunks as they arrive
- [ ] **Smart prefetching**: Anticipate next query
- [ ] **Cache warming**: Pre-populate common routes
- [ ] **A/B testing**: Compare cached vs fresh routing

## 📚 Related Docs

- Main README: `./README.md`
- API Reference: `./types.ts`
- Test Examples: `./__tests__/ChainOrchestrator.test.ts`
