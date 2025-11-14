# AI Workflow Engine

**[View Live Demo](https://ai-workflow-engine.vercel.app/) - Full-featured demo without API dependencies**

A structured conversation system for AI models that transforms scattered chat sessions into organized, exportable knowledge. Built to solve workflow fragmentation across multiple AI models and interfaces while preserving conversation context and insights.

## 🎯 Demo Features

The **live demo** showcases all major features without requiring API keys or database setup:

- **🎨 Dual Interface System**: Switch between Terminal mode (command-line style) and Chat mode (modern bubbles)
- **⌨️ Command Processing**: Try `/help`, `/themes`, `/export`, `/cost`, and other slash commands
- **🖼️ Theme Switching**: Three beautiful themes (Purple Rich, Amber Forest, Cyan Light) with instant switching
- **📱 Responsive Design**: Works seamlessly across desktop, tablet, and mobile devices
- **💾 Export Functionality**: Download conversations in Markdown, JSON, or plain text formats
- **📊 Cost Tracking**: Real-time usage monitoring with detailed breakdowns (demo data)
- **✨ Floating Toolbar**: Quick access to controls and interface switching

**Try the demo**: Use the floating toolbar (→) to explore features, switch interfaces, change themes, or export conversations!

## What This System Does

This is a **conversation orchestration platform** that treats AI interactions as structured data rather than ephemeral chat logs. It provides:

- **Unified multi-model access** through OpenRouter API integration
- **Real-time streaming** with WebSocket and SSE endpoints
- **Dual interface modes** (terminal with slash commands + traditional chat)
- **Structured export system** for knowledge management workflows
- **Theme system** with multiple responsive designs
- **Cost tracking** and usage monitoring

The system is designed API-first with a distinct service layer, making it suitable for integration with CLI tools, Obsidian plugins, and other knowledge management workflows.

## Current Features

**Core Infrastructure**
- PostgreSQL database with Prisma ORM for conversation persistence
- **Chroma vector database** for semantic search and embeddings storage
- **OpenAI API integration** for embedding generation (text-embedding-3-small)
- OpenRouter API integration supporting multiple AI models
- Real-time streaming via WebSocket subscriptions and SSE endpoints
- Type-safe API layer with tRPC
- **Standalone orchestration server** for external integrations (Python, CLI tools, etc.)
- Comprehensive rate limiting and session management
- **529 tests** with full test coverage for critical components
- **Project & document management** for organizing conversations and knowledge

**User Interface**
- **Dual Interface System**: Terminal mode with slash commands + traditional chat interface
- **Theme System**: Three responsive themes ("purple-rich" dark, "amber," and cyan-rich light) with CSS custom properties
- **Real-time Streaming**: Visual streaming indicators with typing effects in terminal mode
- **Cost Tracking Widget**: Live usage monitoring with theme-responsive styling
- **Export Functionality**: Markdown and JSON export with basic support for Notion/Obsidian formats
- **Project Management**: Create projects, upload documents, search content, organize conversations
- **Document Storage**: PostgreSQL-based document storage with text extraction and full-text search

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
- **Testing**: Vitest with 529 tests and comprehensive coverage
- **Styling**: CSS custom properties with theme system and responsive design
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
- Real-time streaming (WebSocket + SSE with unified backend)
- Multi-model AI access via OpenRouter API
- PostgreSQL conversation persistence with Prisma ORM
- **API key authentication** with SHA-256 hashing, IP whitelisting, and expiration
- **Project & document management** (create projects, upload documents, full-text search)
- **Vector embeddings & semantic search** (Chroma vector database + OpenAI embeddings)
- **RAG-ready architecture** with document chunking and similarity search
- Export system (Markdown, JSON)
- Comprehensive rate limiting and session management
- Type-safe API layer with tRPC and Zod validation
- Dual UI system (terminal mode with slash commands + traditional chat)
- Theme system (3 responsive themes with CSS custom properties)
- Cost tracking widget with real-time usage monitoring
- Professional logging (clientLogger + pino)
- 529 automated tests with comprehensive coverage

**🔄 Backend Complete, Frontend In Progress**
- Conversation branching system (database schema and services ready)
- Message threading with `parentId` relationships (service layer complete)
- Advanced export format support (services implemented, UI integration needed)

**📋 Planned Enhancements**
- Intelligent model routing based on cost and task complexity
- Context compression and conversation summarization
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
- [Standalone API Guide](./docs/STANDALONE_API.md) - Complete API reference with Python examples
- [Authentication Guide](./docs/AUTHENTICATION.md) - API key authentication, IP whitelisting, and security
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

# Vector Database & Embeddings
CHROMA_URL="http://localhost:8000"
OPENAI_API_KEY="your_openai_api_key"
EMBEDDING_MODEL="text-embedding-3-small"
EMBEDDING_DIMENSIONS="1536"
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

**Current Test Coverage**: 529 tests across 45 test files covering:
- Component functionality and rendering
- Service layer business logic (70-100% coverage for core services)
- API endpoints and error handling
- Real-time streaming infrastructure
- Theme system and responsive design
- Project & document management services (100% coverage)
- Logging infrastructure

## User Interface Features

The system provides two distinct interfaces optimized for different workflows:

### **Terminal Interface**
- **Command-driven workflow** with slash commands (`/new`, `/list`, `/export`, `/theme`, etc.)
- **Real-time streaming** with visual indicators and typing effects
- **Theme system** with 3 responsive themes (Dark, Amber, Light)
- **Integrated cost tracking** with live usage monitoring
- **Session management** with conversation selection and welcome messages

### **Classic Chat Interface**
- **Traditional chat experience** with conversation sidebar
- **Standard messaging** (no streaming, optimized for reliability)
- **Export functionality** with multiple format options
- **Visual conversation management** with conversation cards and timestamps
- **Pink/purple gradient aesthetic** independent of terminal themes

### **Slash Commands (Terminal Mode)**
```bash
/man                             # Show command manual
/new                            # Create new conversation
/list                           # Show 10 recent conversations
/list-all                       # Show all conversations  
/export-current [markdown|json]  # Export current conversation
/export-all [markdown|json]     # Export all conversations
/theme [dark|amber|light]       # Switch terminal theme
/view [chat|terminal]           # Switch interface mode
/streaming [yes|no]             # Toggle streaming (terminal only)
/reset                          # Reset session
```

### **Theme System**
- **Purple-Rich**: Dark theme with purple gradients and rich contrast
- **Amber-Forest**: Warm earth tones with amber accents
- **Cyan-Rich**: Light theme with cyan highlights and clean typography
- All themes include responsive design and watercolor visual effects

### **Project Management** (New in this PR)
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
- Case-insensitive content search
- Project-conversation associations
- Document management (upload, view, delete)
- Statistics and activity tracking
- **RAG-ready architecture** for context-aware AI responses

**Limitations (Planned for Future PRs):**
- Text files only (no PDF/Word/Excel parsing)
- No file versioning
- Frontend UI for semantic search not yet implemented

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
