# Context Compression & Conversation Summarization

This system implements **AI-powered rolling summaries** to enable unlimited conversation length by automatically compressing old messages while preserving context and continuity.

## Overview

Long conversations eventually exceed model context windows (e.g., Claude's 200k tokens). Context compression solves this by:

1. **Automatic Detection**: Monitors conversation length (messages and tokens)
2. **Background Summarization**: Generates AI summaries of old messages non-blocking
3. **Token-Based Windowing**: Retrieves recent messages + summaries within budget
4. **Rolling Updates**: New summaries build on previous ones for continuity

## Architecture

```
User sends message
       ↓
ChatService processes
       ↓
[Background] Check if summarization needed (100 msgs or 50k tokens)
       ↓
[If needed] ConversationSummarizationService
       ↓
Generate summary with DeepSeek (cost-optimized)
       ↓
Store in conversation_summaries table
       ↓
MessageService.getConversationHistory()
       ↓
Returns: [Summaries as system messages] + [Recent messages]
```

## Key Components

### 1. ConversationSummarizationService

**Location**: `src/server/services/summarization/ConversationSummarizationService.ts`

**Responsibilities**:
- Check if conversation needs summarization
- Generate AI-powered summaries using cheap model (DeepSeek)
- Store summaries with metadata (token savings, message range)
- Build rolling summaries that incorporate previous summaries

**Configuration**:
```typescript
{
  messageTriggerThreshold: 100,    // Summarize after 100 messages
  tokenTriggerThreshold: 50000,    // Or after 50k tokens
  recentMessageWindow: 50,         // Keep last 50 messages verbatim
  summaryModel: 'deepseek/deepseek-chat', // Cost-effective model
  enabled: true,                   // Toggle via ENABLE_SUMMARIZATION
}
```

**Key Methods**:
- `needsSummarization(conversationId)`: Check if thresholds exceeded
- `summarizeConversation(conversationId)`: Generate and store summary
- `getActiveSummaries(conversationId)`: Retrieve current summaries
- `getStats(conversationId)`: Get compression statistics

### 2. Token Counting Utilities

**Location**: `src/server/utils/tokenCounter.ts`

**Uses**: [tiktoken](https://github.com/openai/tiktoken) library for accurate token counting

**Key Functions**:
```typescript
// Count tokens in a single message
countMessageTokens(content: string, model: string): number

// Count tokens in entire conversation (includes overhead)
countConversationTokens(messages: Message[], model: string): number

// Estimate how many messages fit within budget
estimateMessageFit(messages: Message[], maxTokens: number): { count, totalTokens }

// Calculate optimal context window allocation
calculateContextWindow(modelContextWindow, outputTokens): ContextWindowConfig
```

**Model Support**:
- Claude models (cl100k_base encoding)
- GPT models (model-specific encoding)
- DeepSeek, Qwen (cl100k_base fallback)
- Unknown models (cl100k_base fallback)

### 3. MessageService Integration

**Location**: `src/server/services/message/MessageService.ts`

**Updated Method**: `getConversationHistory(conversationId, options?)`

**New Behavior**:
1. Calculate context window budget (default: 25% of available for recent messages)
2. Fetch active summaries from database
3. Fetch all messages
4. Determine which messages are already summarized
5. Use `estimateMessageFit()` to select recent messages within budget
6. Return: summaries (as system messages) + recent messages

**Context Window Allocation** (for Claude 200k):
```
Total: 200,000 tokens
- Reserved for output: 4,096 tokens
- Reserved for system/RAG: 2,000 tokens
- Available for history: 193,904 tokens
  - Recent messages (25%): ~48,476 tokens
  - Summaries (75%): ~145,428 tokens
```

### 4. ChatService Integration

**Location**: `src/server/services/chat/ChatService.ts`

**Automatic Triggers**:
- After each message (both `sendMessage()` and `createMessageStream()`)
- Calls `checkAndTriggerSummarization()` in background (non-blocking)
- No impact on user experience or response time

**Process**:
```typescript
// Non-blocking background check
private checkAndTriggerSummarization(conversationId: string): void {
  this.summarizationService
    .needsSummarization(conversationId)
    .then(needed => {
      if (needed) {
        return this.summarizationService.summarizeConversation(conversationId);
      }
    })
    .catch(error => logger.error('Summarization failed', error));
}
```

### 5. Database Schema

**New Table**: `conversation_summaries`

```prisma
model ConversationSummary {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(...)

  summaryContent String       // The actual summary text
  messageRange   Json         // { startMessageId, endMessageId, startIndex, endIndex }
  tokensSaved    Int          // Approximate tokens saved
  messageCount   Int          // Number of messages summarized

  createdAt      DateTime     @default(now())
  supersededBy   String?      // For re-summarization/versioning

  @@index([conversationId])
  @@index([conversationId, supersededBy])
}
```

**Indexes**:
- `conversationId`: Fast lookups for conversation summaries
- `conversationId + supersededBy`: Efficient active summary queries

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Enable automatic conversation summarization
ENABLE_SUMMARIZATION=true
```

### Service Configuration

Modify defaults in `ConversationSummarizationService.ts`:

```typescript
const DEFAULT_CONFIG: SummarizationConfig = {
  messageTriggerThreshold: 100,  // Adjust based on your needs
  tokenTriggerThreshold: 50000,  // Claude context is 200k
  recentMessageWindow: 50,       // Recent messages kept verbatim
  summaryModel: 'deepseek/deepseek-chat', // Cost-effective
  enabled: process.env.ENABLE_SUMMARIZATION === 'true',
};
```

## Usage Examples

### Automatic Background Summarization

Summarization happens automatically—no code changes needed:

```typescript
// User sends message
await chatService.sendMessage({
  content: "What did we discuss about authentication?",
  conversationId: "conv-123"
});

// Background (non-blocking):
// 1. Check if conversation exceeds thresholds
// 2. If yes, generate summary of old messages
// 3. Store summary in database
// 4. Future calls to getConversationHistory() include summary
```

### Manual Triggering

For administrative tools or batch processing:

```typescript
import { ConversationSummarizationService } from './services/summarization';

const summarizationService = new ConversationSummarizationService(db, assistant);

// Manually trigger summarization
const result = await summarizationService.summarizeConversation('conv-123');

if (result) {
  console.log('Summary created:', result.summaryId);
  console.log('Messages summarized:', result.messagesSummarized);
  console.log('Tokens saved:', result.tokensSaved);
}
```

### Get Compression Statistics

```typescript
const stats = await summarizationService.getStats('conv-123');

console.log({
  totalMessages: stats.totalMessages,           // 250
  summarizedMessages: stats.summarizedMessages, // 150
  unsummarizedMessages: stats.unsummarizedMessages, // 100
  summaryCount: stats.summaryCount,             // 3
  totalTokensSaved: stats.totalTokensSaved      // 75,000
});
```

## Performance & Costs

### Token Savings

Example conversation with 200 messages (avg 100 tokens each = 20,000 tokens):

**Without Compression**:
- All messages sent every request: 20,000 tokens
- Cost per request: ~$0.02 (at $1/M tokens)

**With Compression** (after first summary at message 100):
- Summary of first 50 messages: ~500 tokens (90% compression)
- Recent 50 messages verbatim: 5,000 tokens
- Total: 5,500 tokens
- Cost per request: ~$0.0055
- **Savings: 72.5%**

### Summarization Costs

Using DeepSeek for summarization:

| Messages Summarized | Input Tokens | Output Tokens | Cost (DeepSeek) |
|---------------------|--------------|---------------|-----------------|
| 50 messages | ~5,000 | ~500 | $0.001 |
| 100 messages | ~10,000 | ~800 | $0.002 |
| 200 messages | ~20,000 | ~1,500 | $0.004 |

**ROI**: Summarization pays for itself after 2-3 subsequent messages in the conversation.

### Background Processing

- Summarization runs asynchronously (non-blocking)
- No impact on message response time
- Typical summarization time: 1-3 seconds
- Happens after user receives their response

## Monitoring & Logging

### Structured Logs

```typescript
// When summarization is triggered
logger.info('Triggering background summarization', { conversationId });

// When summary is created
logger.info('Conversation summarized', {
  conversationId,
  summaryId,
  messagesSummarized: 50,
  tokensSaved: 4500,
  compressionRatio: '90.0%'
});

// If no context found
logger.debug('No messages to summarize', {
  conversationId,
  totalMessages: 20,
  recentWindow: 50
});

// On errors
logger.error('Summarization failed', error, { conversationId });
```

### Metrics to Track

1. **Summarization Rate**: How often summaries are created
2. **Compression Ratio**: Average tokens saved per summary
3. **Error Rate**: Failed summarization attempts
4. **Cost Savings**: Aggregate token reduction
5. **Latency**: Summary generation time

## Best Practices

### 1. Threshold Tuning

Adjust thresholds based on your use case:

**High-frequency conversations** (customer support):
```typescript
messageTriggerThreshold: 50,   // Summarize more often
tokenTriggerThreshold: 25000,
recentMessageWindow: 25,       // Keep less verbatim
```

**Long-form discussions** (research, brainstorming):
```typescript
messageTriggerThreshold: 200,  // Summarize less often
tokenTriggerThreshold: 100000,
recentMessageWindow: 100,      // Keep more verbatim
```

### 2. Model Selection

**For Summarization**:
- Use **DeepSeek** for cost (~$0.14/M tokens)
- Use **Claude Haiku** for quality/speed balance
- Avoid expensive models (GPT-4, Claude Opus)

**For Main Conversation**:
- Use any model—summarization adapts to context window

### 3. Testing Summarization

```typescript
// In tests, use explicit config
const testService = new ConversationSummarizationService(
  mockDb,
  mockAssistant,
  {
    messageTriggerThreshold: 10,  // Lower for tests
    tokenTriggerThreshold: 1000,
    recentMessageWindow: 5,
    summaryModel: 'deepseek/deepseek-chat',
    enabled: true,
  }
);
```

### 4. Handling Errors

Summarization failures are non-critical:

```typescript
// System logs error but continues without summary
// Conversation still works, just with all messages
try {
  await summarizationService.summarizeConversation(id);
} catch (error) {
  logger.error('Summarization failed', error);
  // Don't throw—conversation continues normally
}
```

## Troubleshooting

### Issue: Summaries Not Being Created

**Check**:
1. `ENABLE_SUMMARIZATION=true` in `.env`
2. Conversation has exceeded thresholds (100 messages or 50k tokens)
3. Assistant service is available
4. No errors in logs

**Debug**:
```typescript
const needed = await summarizationService.needsSummarization('conv-123');
console.log('Needs summarization:', needed);

const stats = await summarizationService.getStats('conv-123');
console.log('Conversation stats:', stats);
```

### Issue: Context Still Exceeds Limits

**Causes**:
1. Recent message window too large
2. Summaries themselves are too long
3. RAG context using too many tokens

**Solutions**:
```typescript
// Reduce recent message window
recentMessageWindow: 30, // Instead of 50

// Or pass custom maxTokens
await messageService.getConversationHistory(conversationId, {
  maxTokens: 40000 // Custom limit
});
```

### Issue: Poor Summary Quality

**Improvements**:
1. Use a better model (Claude Haiku instead of DeepSeek)
2. Adjust summary prompt in `ConversationSummarizationService.generateSummary()`
3. Increase `recentMessageWindow` to preserve more context

## Future Enhancements

### Planned Features

- **Hierarchical Summaries**: Multi-level compression for very long conversations
- **Semantic Clustering**: Group related topics for better summaries
- **Custom Summary Prompts**: Per-project summary instructions
- **Manual Summary Editing**: Allow users to refine AI summaries
- **Summary Versioning**: Track summary history and allow rollback
- **Export Summaries**: Include summaries in conversation exports

### Experimental Ideas

- **Hybrid Approach**: Semantic search + summaries for optimal context
- **Selective Summarization**: Keep technical details verbatim, summarize casual chat
- **Multi-Model Summaries**: Different models for different conversation types
- **Real-time Compression**: Compress during conversation instead of after

## API Reference

### ConversationSummarizationService

```typescript
class ConversationSummarizationService {
  // Check if summarization needed
  async needsSummarization(conversationId: string): Promise<boolean>

  // Generate and store summary
  async summarizeConversation(conversationId: string): Promise<SummarizationResult | null>

  // Get active summaries
  async getActiveSummaries(conversationId: string): Promise<ConversationSummary[]>

  // Get compression statistics
  async getStats(conversationId: string): Promise<SummarizationStats>

  // Manually trigger summarization
  async triggerSummarization(conversationId: string): Promise<SummarizationResult | null>
}
```

### Token Counter Utilities

```typescript
// Count tokens in message
countMessageTokens(content: string, model?: string): number

// Count conversation tokens
countConversationTokens(
  messages: Array<{ role: string; content: string }>,
  model?: string
): number

// Estimate message fit
estimateMessageFit(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  model?: string
): { count: number; totalTokens: number }

// Calculate context window
calculateContextWindow(
  modelContextWindow?: number,
  outputTokens?: number
): ContextWindowConfig
```

## Resources

- [OpenAI tiktoken](https://github.com/openai/tiktoken) - Token counting library
- [Claude Context Windows](https://docs.anthropic.com/claude/docs/models-overview#context-windows) - Model limits
- [RAG Best Practices](https://www.anthropic.com/index/retrieval-augmented-generation-best-practices) - Context management patterns
