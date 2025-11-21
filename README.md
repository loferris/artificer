# AI Workflow Engine

A structured conversation system for AI models that transforms scattered chat sessions into organized, exportable knowledge. Built to solve workflow fragmentation across multiple AI models and interfaces while preserving conversation context and insights.

## What This System Does

This is a **conversation orchestration platform** that treats AI interactions as structured data rather than ephemeral chat logs. It provides:

- **Intelligent model routing** with automatic complexity analysis and adaptive model selection
- **Chain orchestration** using specialized agents (Analyzer → Router → Execute → Validate)
- **Unified multi-model access** through OpenRouter API integration
- **Real-time streaming** with WebSocket and SSE endpoints
- **Project-based organization** for grouping related conversations and documents
- **RAG (Retrieval-Augmented Generation)** with transparent source attribution
- **Structured export system** for knowledge management workflows
- **Document management** with vector search and semantic retrieval
- **Cost optimization** with dynamic model selection and usage monitoring

The system is designed API-first with a clean service layer, making it suitable for integration with CLI tools, Obsidian plugins, and other knowledge management workflows.

## Current Features

**Core Infrastructure**
- PostgreSQL database with Prisma ORM for conversation persistence
- **Chroma vector database** for semantic search and embeddings storage
- **OpenAI API integration** for embedding generation (text-embedding-3-small)
- OpenRouter API integration supporting multiple AI models
- **Chain orchestration system** with intelligent model routing and quality validation
- **Dynamic Model Registry** with 3-tier fallback (OpenRouter API → Config → Inference)
- Real-time streaming via WebSocket subscriptions and SSE endpoints
- Type-safe API layer with tRPC
- **Standalone orchestration server** for external integrations (Python, CLI tools, etc.)
- Comprehensive rate limiting and session management
- **880+ tests** with full test coverage for critical components
- **Project & document management** for organizing conversations and knowledge

**User Interface**
- **Modern Simplified UI**: Single focused interface optimized for research and writing workflows
- **Project-First Navigation**: Left sidebar with projects and conversations organized hierarchically
- **RAG Source Attribution**: Inline display of document sources with expandable context view
- **Real-time Streaming**: Visual streaming indicators for AI responses
- **Export Functionality**: Markdown and JSON export from dropdown menu
- **Project Management**: Create projects, upload documents, search content, organize conversations
- **Document Storage**: PostgreSQL-based document storage with vector embeddings and semantic search

**Service Architecture**
- Clean service layer with dependency injection for business logic
- Database scheme for conversation lifecycle management with branching support ready
- Message operations with token tracking and cost calculation
- Export services optimized for knowledge management workflows

## Technical Stack

- **Backend**: Next.js 15.5 + Custom WebSocket Server + tRPC 11.5 for type-safe APIs
- **Database**: PostgreSQL with Prisma 6.15 ORM
- **Vector Database**: Chroma 3.1 for embeddings and semantic search
- **Frontend**: React 18.3 + Tailwind CSS 3.4 + Zustand state management
- **Real-time**: WebSocket subscriptions + SSE endpoints with unified ChatService backend
- **AI Integration**: OpenRouter API supporting multiple models (Claude, DeepSeek, Qwen, etc.) + OpenAI for embeddings
- **Token Management**: tiktoken for accurate token counting and context window management
- **Testing**: Vitest with 880+ tests and comprehensive coverage
- **Styling**: Tailwind CSS 3.4 with responsive design
- **Logging**: Centralized clientLogger (frontend) + structured pino logger (backend)

## Architecture Design

**API-First Service Layer**
- Strict separation between UI and business logic
- Dependency injection for testable service architecture
- Type-safe APIs with runtime validation using Zod schemas
- Unified streaming infrastructure for both WebSocket and HTTP clients

**Integration Ready**
The service layer is designed for integration with external tools:
- **CLI tools** via SSE endpoints (`/api/stream/chat`)
- **Browser extensions** via tRPC subscriptions
- **Knowledge management tools** via structured export formats
- **Automation scripts** via HTTP APIs with proper CORS support

## Feature Status

**✅ Production Ready**
- **Chain orchestration** with 4-stage pipeline (Analyze → Route → Execute → Validate)
- **Intelligent model routing** based on task complexity and requirements
- **Dynamic Model Registry** with real-time updates from OpenRouter API
- **Automatic quality validation** with smart retry logic
- Real-time streaming (WebSocket + SSE with unified backend)
- Multi-model AI access via OpenRouter API
- PostgreSQL conversation persistence with Prisma ORM
- **API key authentication** with SHA-256 hashing, IP whitelisting, and expiration
- **Project & document management** (create projects, upload documents, full-text search)
- **Vector embeddings & semantic search** (Chroma vector database + OpenAI embeddings)
- **RAG (Retrieval-Augmented Generation)** - Automatic context retrieval for project-linked conversations
- **Context compression & summarization** - AI-powered rolling summaries for unlimited conversation length
- Export system (Markdown, JSON)
- Comprehensive rate limiting and session management
- Type-safe API layer with tRPC and Zod validation
- Modern simplified chat UI with RAG source attribution and orchestration progress
- Project-first conversation organization
- Cost optimization and tracking with real-time usage monitoring
- Professional logging (clientLogger + pino)
- 880+ automated tests with comprehensive coverage

**🔄 Backend Complete, Frontend In Progress**
- Conversation branching system (database schema and services ready)
- Message threading with `parentId` relationships (service layer complete)
- Advanced export format support (services implemented, UI integration needed)

**📋 Planned Enhancements**
- Learning from user feedback to improve routing decisions
- Cost budgets and advanced cost optimization strategies
- Custom routing rules and multi-stage task execution
- Enhanced PKM tool integrations (full Notion, Obsidian, Google Docs integrations)
- Cross-session context preservation and conversation merging
- Fine-grained permission scopes for API keys
- OAuth provider support and JWT tokens for web UI

## Getting Started

### Standard Next.js Application

```bash
git clone https://github.com/yourusername/ai-workflow-engine.git
cd ai-workflow-engine
npm install
cp .env.example .env
# Configure OPENROUTER_API_KEY and DATABASE_URL in .env

# Start PostgreSQL and Chroma databases (Docker)
npm run db:up

# Run database migrations
npm run db:migrate

# Seed database with sample projects and documents (optional)
npm run db:seed

# Start development server with WebSocket support
npm run dev

# Optional: Open Prisma Studio database GUI
npm run db:studio
```

### Standalone Orchestration Server

Run as a standalone API server for integration with external applications (Python, CLI tools, etc.):

```bash
# Development mode
npm run dev:standalone

# Production mode
npm run start:standalone
```

**Documentation:**
- [Chain Orchestration Guide](./docs/ORCHESTRATION.md) - Intelligent model routing, Model Registry, cost optimization
- [Standalone API Guide](./docs/STANDALONE_API.md) - Complete API reference with Python examples
- [Authentication Guide](./docs/AUTHENTICATION.md) - API key authentication, IP whitelisting, and security
- [SSE Streaming Guide](./docs/SSE_STREAMING.md) - Real-time streaming implementation details
- [Implementation Status](./docs/internal/STANDALONE_STATUS.md) - Current capabilities and limitations
- [Security Considerations](./SECURITY.md) - Authentication requirements for production

**🔐 Security:** API key authentication is available with IP whitelisting and expiration. See [AUTHENTICATION.md](./docs/AUTHENTICATION.md) for setup.

### Environment Configuration

Required environment variables in `.env`:
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_workflow_engine"
OPENROUTER_API_KEY="your_openrouter_api_key"

# Optional: Enable authentication for production
REQUIRE_AUTH=false  # Set to 'true' for production with API keys
IP_WHITELIST=       # Comma-separated IPs (leave empty to allow all)
ADMIN_EMAIL=admin@example.com

# Model Configuration
CHAT_MODEL="anthropic/claude-sonnet-4.5"
CHAT_FALLBACK_MODEL="deepseek/deepseek-chat-v3.1"

# Optional: Enable dynamic model discovery (recommended for production)
# Automatically selects best models based on requirements and pricing
USE_DYNAMIC_MODEL_DISCOVERY=false

# Chain Orchestration (optional but recommended)
CHAIN_ROUTING_ENABLED=true
ANALYZER_MODEL="deepseek/deepseek-chat"
ROUTER_MODEL="anthropic/claude-3-haiku"
VALIDATOR_MODEL="anthropic/claude-3-5-sonnet"
OPENROUTER_MODELS="deepseek/deepseek-chat,anthropic/claude-3-haiku,anthropic/claude-3-5-sonnet,openai/gpt-4o-mini"
VALIDATION_ENABLED=true
PREFER_CHEAP_MODELS=false

# Vector Database & Embeddings
CHROMA_URL="http://localhost:8000"
OPENAI_API_KEY="your_openai_api_key"
EMBEDDING_MODEL="text-embedding-3-small"
EMBEDDING_DIMENSIONS="1536"

# Enable RAG (Retrieval-Augmented Generation)
# When enabled, conversations linked to projects automatically retrieve context
ENABLE_RAG=true
```

**Authentication:** See [docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md) for complete setup guide.

## Database Management

```bash
# Database lifecycle
npm run db:up          # Start PostgreSQL container
npm run db:down        # Stop database container
npm run db:reset       # Reset database (removes all data)

# Database operations
npm run db:migrate     # Apply schema migrations
npm run db:studio      # Open Prisma Studio GUI

# See docs/DATABASE_SETUP.md for detailed setup options
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run specific test file
npm test -- src/components/__tests__/CostTracker.test.tsx
```

**Current Test Coverage**: 800+ tests across 55+ test files covering:
- Component functionality and rendering
- Service layer business logic (70-100% coverage for core services)
- API endpoints and error handling
- Real-time streaming infrastructure
- Theme system and responsive design
- Project & document management services (100% coverage)
- Logging infrastructure

## User Interface Features

The system provides a **modern, simplified interface** optimized for research and writing workflows:

### **Main Chat Interface**
- **Project-First Navigation**: Left sidebar displays all projects with active indicator
- **Conversation Organization**: Conversations automatically grouped by their associated project
- **Real-time Streaming**: Visual streaming indicators with smooth message rendering
- **Clean Message Display**: User and assistant messages with clear visual distinction
- **Responsive Design**: Adapts seamlessly to desktop, tablet, and mobile screens

### **RAG Transparency**
- **Inline Source Attribution**: Each AI response shows which documents were used
- **Expandable Context View**: Click to see the actual retrieved text chunks
- **Relevance Scores**: View similarity scores for each source document
- **Source Filenames**: Clear indication of which files provided context
- **Multiple Sources**: Display all contributing documents with their content

### **Export Functionality**
From the header dropdown menu:
- **Export Current**: Save active conversation as Markdown or JSON
- **Export All**: Download all conversations in selected format
- **Format Options**: Markdown (.md) or JSON (.json)
- **Include Metadata**: Option to include RAG sources in exports

### **Project Management**
**Available at `/projects` route:**
- Create and organize projects by topic/workflow
- Upload documents (text, markdown, JSON, CSV files)
- Full-text search across document content and filenames
- Associate conversations with projects
- View project statistics (conversation count, document count, last activity)
- Document metadata tracking (filename, size, upload date, content type)

**Capabilities:**
- PostgreSQL-based document storage with text extraction
- **Vector embeddings with Chroma database** (automatic on upload)
- **Semantic search** using OpenAI text-embedding-3-small (1536 dimensions)
- **Document chunking** (1000 chars with 200 char overlap)
- **RAG (Retrieval-Augmented Generation)** - Conversations linked to projects automatically retrieve relevant context
- Case-insensitive content search
- Project-conversation associations
- Document management (upload, view, delete)
- Statistics and activity tracking

**Current Capabilities:**
- Automatic RAG context retrieval for project-linked conversations
- Inline source attribution showing which documents were used
- Document upload and management through project panel
- Vector embeddings and semantic search via Chroma

**Limitations (Planned for Future):**
- Text files only (no PDF/Word/Excel parsing)
- No file versioning
- Manual RAG parameter tuning (currently uses defaults: 5 chunks max, 0.3 min score)

## API Integration

### Real-time Streaming
The system provides multiple endpoints for real-time AI conversation streaming:

**WebSocket Subscriptions** (Frontend)
```typescript
const { data: streamData } = trpc.subscriptions.chatStream.useSubscription({
  content: "Your message",
  conversationId: "conv-123"
});
```

**Server-Sent Events** (CLI/Automation)
```bash
curl -X POST http://localhost:3000/api/stream/chat \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello", "conversationId": "conv-123"}' \
  --no-buffer
```

### API Endpoints
- `POST /api/stream/chat` - SSE streaming endpoint
- `GET /api/trpc/[trpc]` - tRPC HTTP endpoint
- `WS /api/trpc-ws` - WebSocket subscriptions
- `GET /api/health` - Health check endpoint

For complete API documentation and CLI examples, see `docs/internal/` directory.

## Project Status

This is a working system with features for conversation management and AI model orchestration for an individual user.
