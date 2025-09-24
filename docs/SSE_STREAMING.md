# SSE Streaming API

Server-Sent Events (SSE) endpoint for streaming chat responses. Intended for CLI tools, scripts, and third-party integrations.

## Endpoint

```
POST /api/stream/chat
```

## Request Format

```json
{
  "content": "Your message here",
  "conversationId": "conversation-id"
}
```

## Response Format

The endpoint returns a Server-Sent Events stream with the following event types:

### Connection Event
```
event: connection
data: {"type":"connected","timestamp":"2025-09-10T21:45:00.000Z"}
```

### Chunk Events (streaming response)
```
event: chunk
data: {"content":"Hello","finished":false}

event: chunk
data: {"content":" world","finished":false}

event: chunk
data: {"content":"!","finished":true,"metadata":{"messageId":"msg-123","tokenCount":15,"cost":0.001}}
```

### Completion Event
```
event: complete
data: {"type":"completed","timestamp":"2025-09-10T21:45:05.000Z"}
```

### Error Events
```
event: error
data: {"type":"error","error":"Conversation not found","timestamp":"2025-09-10T21:45:01.000Z"}
```

## Usage Examples

### cURL
```bash
curl -X POST http://localhost:3000/api/stream/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "content": "Hello, how are you?",
    "conversationId": "conv-123"
  }' \
  --no-buffer
```

### Node.js
```javascript
import fetch from 'node-fetch';

const response = await fetch('http://localhost:3000/api/stream/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  },
  body: JSON.stringify({
    content: 'Hello, how are you?',
    conversationId: 'conv-123'
  })
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log('Received:', data);
    }
  }
}
```

### Python
```python
import requests
import json

def stream_chat(content, conversation_id):
    url = "http://localhost:3000/api/stream/chat"
    headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }
    data = {
        "content": content,
        "conversationId": conversation_id
    }
    
    with requests.post(url, headers=headers, json=data, stream=True) as response:
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data = json.loads(line[6:])
                    print(f"Received: {data}")

# Usage
stream_chat("Hello, how are you?", "conv-123")
```

### Bash Script
```bash
#!/bin/bash

CONTENT="$1"
CONVERSATION_ID="$2"

curl -X POST http://localhost:3000/api/stream/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d "{\"content\":\"$CONTENT\",\"conversationId\":\"$CONVERSATION_ID\"}" \
  --no-buffer | while IFS= read -r line; do
    if [[ $line == data:* ]]; then
      echo "Received: ${line#data: }"
    fi
  done
```

## Rate Limiting

The endpoint uses the same rate limiting as the chat API:
- Headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- 429 status code when rate limit exceeded

## Error Handling

### Client Errors (4xx)
- **400**: Invalid input (missing content, invalid conversationId)
- **405**: Method not allowed (only POST supported)
- **429**: Rate limit exceeded

### Server Errors (5xx)
- **500**: Internal server error

Errors during streaming are sent as SSE error events rather than HTTP status codes.

## Connection Management

- The server automatically handles client disconnection
- Use proper SSE client libraries for automatic reconnection
- The stream will close when the response is complete or an error occurs

## Authentication

Currently uses session-based authentication via:
- Browser sessions (cookies)
- `x-session-id` header for API clients

## Demo Mode

Works in demo mode with mock responses when `DEMO_MODE=true`.
