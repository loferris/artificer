# AI Orchestration & Knowledge Management System

**[View UI Demo](https://ai-workflow-engine.vercel.app/) - See the live interface in action**

An intelligent routing layer for AI models that transforms scattered conversations into structured, exportable knowledge. Built to solve my own workflow fragmentation problem - tired of tab-switching between Claude, DeepSeek, and local models while losing track of insights buried in long conversations.

## What I've Learned Building This

The real problem isn't having access to AI models - it's **orchestrating them effectively** and **capturing the knowledge they help generate**. When you're researching complex topics or planning technical projects, conversations naturally span multiple models and sessions. The valuable insights get lost in chat histories that aren't designed for knowledge work.

This system treats AI conversations as **structured data** to be organized, compressed, and exported rather than ephemeral chat logs.

## Current Implementation

**Foundation Layer**

- AI conversation persistence with PostgreSQL database
- OpenRouter API integration for multi-model access
- Rate limiting and session management
- Type-safe API layer with tRPC
- **Real-time streaming**: WebSocket subscriptions + SSE endpoints

**Conversation Management**

- Service layer handling conversation lifecycle
- Message operations with token tracking and cost calculation
- Database schema designed for conversation branching
- Export to structured formats (Markdown, JSON, with basic Notion/Obsidian/HTML support)

**Knowledge Capture**

- Structured conversation data optimized for export
- Service layer architecture for UI-agnostic business logic
- Export system ready for PKM workflows
- Clean separation of concerns with dependency injection

## Technical Implementation

- **Backend**: Next.js + Custom Server + tRPC for type-safe APIs  
- **Real-time**: WebSocket subscriptions for frontend + SSE streaming for CLI tools
- **Database**: PostgreSQL with Prisma ORM
- **AI Integration**: OpenRouter API for multi-model access
- **Export System**: Structured data optimized for knowledge management tools

## Architecture Philosophy

This is built **API-first** as a headless orchestration service with a clean service layer architecture. The React interface is scaffolding - the real value is in the business logic services and export capabilities that can integrate with:

- **CLI tools** for quick queries and automation
- **Obsidian plugins** for seamless PKM integration
- **org-mode functions** for programmable knowledge management
- **Shell scripts** for development workflow integration

## Development Status & Planned Features

**Currently Implemented**
- ✅ Real-time streaming (WebSocket + SSE)
- ✅ Multi-model API access via OpenRouter
- ✅ Conversation persistence with PostgreSQL
- ✅ Export to Markdown and JSON formats
- ✅ Rate limiting and session management
- ✅ Type-safe API layer with tRPC
- ✅ **Dual UI modes**: Terminal interface with slash commands + Classic chat interface
- ✅ **Theme system**: Multiple responsive themes (Dark, Amber, Light) with CSS custom properties
- ✅ **Integrated cost tracking**: Real-time usage and cost monitoring widget

**Schema-Ready (Backend Complete, UI Pending)**
- 🔄 **Conversation branching**: Database schema and service layer support message trees with `parentId` relationships, but UI implementation needed
- 🔄 **Advanced message threading**: Backend infrastructure ready for conversation branching workflows

**Planned Features**
- 📋 **Intelligent Model Routing**: Cost-aware switching between models based on task complexity
- 📋 **Context Compression Agents**: AI-powered conversation summarization and insight extraction
- 📋 **Enhanced Export Formats**: Full Notion, Obsidian, and Google Docs integration (basic implementations exist)
- 📋 **Cross-session context preservation**: Advanced conversation state management

## Getting Started

```bash
git clone [repo]
cd chat-app
npm install
cp .env.example .env
# Add your OPENROUTER_API_KEY and other config

# Start PostgreSQL database (Docker)
npm run db:up

# Run database migrations
npm run db:migrate

# Start development server (with WebSocket support)
npm run dev

# Optional: Open database GUI
npm run db:studio
```

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

## Development Status

**Implemented**: Conversation persistence, OpenRouter integration, structured exports, rate limiting, service layer architecture, **real-time streaming (WebSocket + SSE)**
**In Development**: Conversation branching UI, enhanced export formats
**Next Phase**: Intelligent model routing, context compression agents, advanced PKM integrations

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

### **Slash Commands (Terminal Mode Only)**
```bash
/man                           # Show command manual
/new                          # Create new conversation
/list                         # Show 10 recent conversations
/list-all                     # Show all conversations
/export-current [markdown|json] # Export current conversation
/export-all [markdown|json]     # Export all conversations
/theme [dark|amber|light]       # Switch terminal theme
/view [chat|terminal]          # Switch interface mode
/streaming [yes|no]            # Toggle streaming (terminal only)
/reset                        # Reset session
```

## Streaming Integration

The system supports real-time streaming for both interactive frontends and CLI automation:

- **WebSocket Subscriptions**: Real-time streaming for React frontends via `trpc.subscriptions.chatStream.useSubscription()`
- **SSE Endpoints**: HTTP streaming for CLI tools and third-party integrations via `POST /api/stream/chat`
- **Unified Backend**: Both approaches use the same ChatService streaming infrastructure

See `docs/SSE_STREAMING.md` for CLI usage examples and `docs/API.md` for complete API documentation.

This is a build-in-public project documenting the journey of creating better AI workflows for knowledge work. The development process itself is becoming content for [my DevRel blog](https://the-hacker-screen.ghost.io) about AI-assisted development.
