# Standalone API Server

The AI Workflow Engine can run as a standalone orchestration server, providing both **tRPC** (for TypeScript clients) and **REST/OpenAPI** endpoints (for any HTTP client, including Python).

## Quick Start

### 1. Start the Server

```bash
# Development mode
npm run dev:standalone

# Production mode (with .env.local)
npm run start:standalone

# Custom port
STANDALONE_PORT=4000 npm run dev:standalone
```

### 2. Verify It's Running

```bash
curl http://localhost:3001/health
```

## Available Endpoints

### Core Endpoints

| Endpoint | Description |
|----------|-------------|
| `http://localhost:3001/` | tRPC endpoint (for TypeScript clients) |
| `http://localhost:3001/api/*` | REST/OpenAPI endpoints (for any client) |
| `http://localhost:3001/health` | Health check |
| `http://localhost:3001/docs` | Interactive API documentation (Swagger UI) |
| `http://localhost:3001/openapi.json` | OpenAPI specification |

## REST API Reference

### Conversations

#### List Conversations
```bash
GET /api/conversations
```

**Example:**
```bash
curl http://localhost:3001/api/conversations
```

**Response:**
```json
[
  {
    "id": "cm4abc123",
    "title": "My Conversation",
    "model": "deepseek-chat",
    "messageCount": 5,
    "createdAt": "2025-10-20T12:00:00Z",
    "updatedAt": "2025-10-20T12:30:00Z"
  }
]
```

#### Create Conversation
```bash
POST /api/conversations
Content-Type: application/json

{
  "title": "New Conversation",
  "model": "deepseek-chat",
  "projectId": "cm4xyz789",
  "systemPrompt": "You are a helpful assistant",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

**Python Example:**
```python
import requests

response = requests.post(
    "http://localhost:3001/api/conversations",
    json={
        "title": "Python Integration Test",
        "model": "deepseek-chat",
        "projectId": "cm4xyz789"
    }
)

conversation = response.json()
print(f"Created conversation: {conversation['id']}")
```

#### Get Conversation
```bash
GET /api/conversations/{id}
```

#### Update Conversation
```bash
PATCH /api/conversations/{id}
Content-Type: application/json

{
  "title": "Updated Title",
  "temperature": 0.8
}
```

#### Delete Conversation
```bash
DELETE /api/conversations/{id}
```

### Projects

#### List Projects
```bash
GET /api/projects
```

**Response:**
```json
[
  {
    "id": "cm4xyz789",
    "name": "My Project",
    "description": "Project for organizing conversations",
    "stats": {
      "conversationCount": 10,
      "documentCount": 5,
      "knowledgeEntityCount": 20
    },
    "createdAt": "2025-10-15T10:00:00Z"
  }
]
```

#### Create Project
```bash
POST /api/projects
Content-Type: application/json

{
  "name": "New Project",
  "description": "For building RAG vector DB",
  "settings": {
    "embeddingModel": "text-embedding-3-small"
  }
}
```

**Python Example:**
```python
import requests

response = requests.post(
    "http://localhost:3001/api/projects",
    json={
        "name": "Python RAG Project",
        "description": "Vector DB for my Python app",
        "settings": {"chunkSize": 512}
    }
)

project = response.json()
```

#### Get Project
```bash
GET /api/projects/{id}
```

#### Update Project
```bash
PATCH /api/projects/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "settings": {"newSetting": "value"}
}
```

#### Delete Project
```bash
DELETE /api/projects/{id}
```

#### Associate Conversation with Project
```bash
POST /api/projects/{projectId}/conversations/{conversationId}
```

#### Get Project Conversations
```bash
GET /api/projects/{projectId}/conversations
```

**Python Example:**
```python
import requests

# Get all conversations for a project
response = requests.get(
    "http://localhost:3001/api/projects/cm4xyz789/conversations"
)

conversations = response.json()
for conv in conversations:
    print(f"{conv['title']}: {conv['messageCount']} messages")
```

## Python Integration Example

### Full Workflow Example

```python
import requests
import json

BASE_URL = "http://localhost:3001/api"

class AIWorkflowClient:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()

    def create_project(self, name, description=None, settings=None):
        """Create a new project for organizing conversations."""
        response = self.session.post(
            f"{self.base_url}/projects",
            json={
                "name": name,
                "description": description,
                "settings": settings or {}
            }
        )
        response.raise_for_status()
        return response.json()

    def create_conversation(self, title, project_id=None, **kwargs):
        """Create a new conversation."""
        data = {"title": title, **kwargs}
        if project_id:
            data["projectId"] = project_id

        response = self.session.post(
            f"{self.base_url}/conversations",
            json=data
        )
        response.raise_for_status()
        return response.json()

    def get_project_conversations(self, project_id):
        """Get all conversations in a project."""
        response = self.session.get(
            f"{self.base_url}/projects/{project_id}/conversations"
        )
        response.raise_for_status()
        return response.json()

    def get_conversation(self, conversation_id):
        """Get conversation with all messages."""
        response = self.session.get(
            f"{self.base_url}/conversations/{conversation_id}"
        )
        response.raise_for_status()
        return response.json()

# Usage
client = AIWorkflowClient()

# Create a project for your vector DB
project = client.create_project(
    name="My RAG System",
    description="Conversations for building vector embeddings",
    settings={"embeddingModel": "text-embedding-3-small"}
)

print(f"Created project: {project['id']}")

# Create conversations in the project
conv1 = client.create_conversation(
    title="Product Documentation",
    project_id=project['id'],
    model="deepseek-chat"
)

conv2 = client.create_conversation(
    title="Customer Support Logs",
    project_id=project['id']
)

# Get all conversations for embedding
conversations = client.get_project_conversations(project['id'])

# Build your vector DB from conversation data
for conv in conversations:
    full_conv = client.get_conversation(conv['id'])
    messages = full_conv['messages']

    # Process messages for your vector DB
    for msg in messages:
        if msg['role'] == 'user':
            # Add to your vector store
            print(f"Embedding: {msg['content'][:50]}...")
```

## Configuration

### Environment Variables

```bash
# Server configuration
STANDALONE_PORT=3001          # Server port (default: 3001)
STANDALONE_HOST=0.0.0.0       # Server host (default: 0.0.0.0)
CORS_ORIGIN=*                 # CORS origin (default: *)

# Database
DATABASE_URL=postgresql://...  # PostgreSQL connection string
DEMO_MODE=false               # Set to 'true' for in-memory demo mode

# AI Models
OPENROUTER_API_KEY=...        # OpenRouter API key
OPENROUTER_MODEL=deepseek-chat # Default model
```

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:standalone"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  api-server:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/aiworkflow
      - STANDALONE_PORT=3001
      - CORS_ORIGIN=*
    depends_on:
      - postgres

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_DB=aiworkflow
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

## Use Cases

### 1. Python Backend Integration

Use the standalone server as a conversation/project management layer for your Python AI application:

```python
# Your Python app connects to the orchestration layer
from ai_workflow_client import AIWorkflowClient

client = AIWorkflowClient("http://localhost:3001/api")

# Create project-specific vector DBs
project = client.create_project("Customer Support KB")
conversations = client.get_project_conversations(project['id'])

# Build embeddings from conversations
embeddings = build_embeddings(conversations)
```

### 2. Microservices Architecture

```
┌─────────────────┐
│  Python Backend │
│  (Main App)     │
└────────┬────────┘
         │
         ├──HTTP/REST──┐
         │             │
         ▼             ▼
┌─────────────────┐   ┌──────────────┐
│  AI Workflow    │   │  Vector DB   │
│  Engine         │   │  (Pinecone)  │
│  (Standalone)   │   └──────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │
└─────────────────┘
```

### 3. Multi-Language Teams

- **TypeScript Frontend**: Uses tRPC for type-safe calls
- **Python Backend**: Uses REST API for data management
- **Go Services**: Uses REST API for integrations

## API Documentation

Once the server is running, visit:

- **Interactive Docs**: http://localhost:3001/docs
- **OpenAPI Spec**: http://localhost:3001/openapi.json

Import the OpenAPI spec into:
- Postman
- Insomnia
- Python `openapi-generator`
- Any OpenAPI-compatible tool

## Troubleshooting

### Server won't start

Check database connection:
```bash
# Test database
psql $DATABASE_URL -c "SELECT 1"

# Or use demo mode (no database required)
DEMO_MODE=true npm run dev:standalone
```

### CORS errors

Configure CORS origin:
```bash
CORS_ORIGIN=http://localhost:8000 npm run dev:standalone
```

### Port already in use

Use a different port:
```bash
STANDALONE_PORT=4000 npm run dev:standalone
```

## Next Steps

1. Start the standalone server: `npm run dev:standalone`
2. Visit the docs: http://localhost:3001/docs
3. Try the Python example above
4. Build your integration!

For more information, see the main README.md
