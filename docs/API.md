# API Reference

Complete API documentation for integrating with the AI Workflow Engine.

**Last Updated**: September 15, 2025  
**API Status**: Production Ready (390+ tests passing, TypeScript strict mode)

## Base URL

```
Development: http://localhost:3000
Production: <your-deployment-url>
```

## Authentication

Currently uses session-based authentication:
- **Browser**: Automatic session cookies
- **API clients**: Include `x-session-id` header
- **CLI tools**: Generated automatically per request

## tRPC API Endpoints

### Chat Operations

#### Send Message
```typescript
// Frontend (React)
const result = await trpc.chat.sendMessage.mutate({
  content: "Your message here",
  conversationId: "conv-123"
});
```

#### Stream Message (WebSocket)
```typescript
// Frontend real-time streaming
const { data } = trpc.subscriptions.chatStream.useSubscription({
  content: "Your message here", 
  conversationId: "conv-123"
});
```

### Conversation Management

#### List Conversations
```typescript
const conversations = await trpc.conversations.list.query();
```

#### Create Conversation
```typescript
const conversation = await trpc.conversations.create.mutate({
  title: "New Conversation",
  model: "anthropic/claude-3-5-sonnet"
});
```

#### Get Conversation
```typescript
const conversation = await trpc.conversations.get.query({
  id: "conv-123"
});
```

#### Update Conversation
```typescript
const updated = await trpc.conversations.update.mutate({
  id: "conv-123",
  title: "Updated Title",
  model: "openai/gpt-4o"
});
```

#### Delete Conversation
```typescript
await trpc.conversations.delete.mutate({
  id: "conv-123"
});
```

### Message Operations

#### List Messages
```typescript
const messages = await trpc.messages.list.query({
  conversationId: "conv-123"
});
```

#### Get Message
```typescript
const message = await trpc.messages.get.query({
  id: "msg-123"
});
```

### Export Operations

#### Export Conversation
```typescript
const exported = await trpc.export.conversation.query({
  conversationId: "conv-123",
  format: "markdown" // "json", "obsidian", "notion", "google-docs", "html"
});
```

**Export Format Status:**
- ✅ **Markdown**: Full implementation
- ✅ **JSON**: Full implementation  
- 🔄 **Obsidian**: Basic implementation (may need enhancement)
- 🔄 **Notion**: Basic implementation (returns JSON structure)
- 🔄 **Google Docs**: Basic HTML export
- 🔄 **HTML**: Basic implementation

#### Export All Conversations
```typescript
const exported = await trpc.export.all.query({
  format: "markdown" // Same format options as above
});
```

### Usage Tracking

#### Get Usage Stats
```typescript
const usage = await trpc.usage.stats.query();
```

## HTTP Streaming (SSE)

### Stream Chat Response

**Endpoint**: `POST /api/stream/chat`

**Headers**:
```
Content-Type: application/json
Accept: text/event-stream
```

**Request Body**:
```json
{
  "content": "Your message here",
  "conversationId": "conv-123"
}
```

**Response**: Server-Sent Events stream

```
: SSE stream connected

event: connection
data: {"type":"connected","timestamp":"2025-09-10T21:45:00.000Z"}

event: chunk
data: {"content":"Hello","finished":false}

event: chunk  
data: {"content":" world","finished":false}

event: chunk
data: {"content":"!","finished":true,"metadata":{"messageId":"msg-123"}}

event: complete
data: {"type":"completed","timestamp":"2025-09-10T21:45:05.000Z"}
```

### CLI Examples

#### cURL
```bash
curl -X POST http://localhost:3000/api/stream/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"content":"Hello","conversationId":"conv-123"}' \
  --no-buffer
```

#### Python
```python
import requests
import json

def stream_chat(content, conversation_id):
    url = "http://localhost:3000/api/stream/chat"
    headers = {"Content-Type": "application/json"}
    data = {"content": content, "conversationId": conversation_id}
    
    with requests.post(url, headers=headers, json=data, stream=True) as r:
        for line in r.iter_lines():
            if line and line.startswith(b'data: '):
                data = json.loads(line[6:])
                print(f"Received: {data}")
```

#### Node.js
```javascript
const response = await fetch('http://localhost:3000/api/stream/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Hello',
    conversationId: 'conv-123'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // Parse SSE format...
}
```

## Rate Limiting

All endpoints include rate limiting:

- **Chat endpoints**: 30 requests per minute
- **Export endpoints**: 10 requests per minute  
- **General API**: 100 requests per minute

Rate limit headers:
```
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 2025-09-10T21:53:16.211Z
```

## Error Handling

### HTTP Errors
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

### tRPC Errors
```typescript
try {
  await trpc.chat.sendMessage.mutate({...});
} catch (error) {
  console.log(error.message);
  console.log(error.code); // TRPC error code
}
```

### Streaming Errors
```
event: error
data: {"type":"error","error":"Conversation not found","timestamp":"..."}
```

## Data Types

### Conversation
```typescript
interface Conversation {
  id: string;
  title: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  totalCost: number;
}
```

### Message
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  conversationId: string;
  model?: string;
  cost?: number;
  tokens?: number;
}
```

### Streaming Chunk
```typescript
interface ChatStreamChunk {
  content: string;
  finished: boolean;
  error?: string;
  metadata?: {
    messageId?: string;
    tokenCount?: number;
    model?: string;
    cost?: number;
  };
}
```

## WebSocket Connection

**URL**: `ws://localhost:3000/api/trpc-ws`

**Protocol**: tRPC WebSocket protocol with JSON messages

The WebSocket connection is automatically managed by the tRPC client when using subscriptions.

## Integration Examples

See `SSE_STREAMING.md` for detailed CLI integration examples and `CONTRIBUTING.md` for development setup.