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

**Conversation Management**

- Service layer handling conversation lifecycle
- Message operations with token tracking and cost calculation
- Database schema designed for conversation branching
- Export to structured formats (Markdown, JSON)

**Knowledge Capture**

- Structured conversation data optimized for export
- Service layer architecture for UI-agnostic business logic
- Export system ready for PKM workflows
- Clean separation of concerns with dependency injection

## Technical Implementation

- **Backend**: Next.js + tRPC for type-safe APIs
- **Database**: PostgreSQL with Prisma ORM
- **AI Integration**: OpenRouter API for multi-model access
- **Export System**: Structured data optimized for knowledge management tools

## Architecture Philosophy

This is built **API-first** as a headless orchestration service with a clean service layer architecture. The React interface is scaffolding - the real value is in the business logic services and export capabilities that can integrate with:

- **CLI tools** for quick queries and automation
- **Obsidian plugins** for seamless PKM integration
- **org-mode functions** for programmable knowledge management
- **Shell scripts** for development workflow integration

## Planned Features

**Intelligent Model Routing**

- Cost-aware switching between Claude, DeepSeek, and local models
- Task complexity analysis to route queries appropriately
- Dynamic fallback strategies

**Advanced Conversation Management**

- Conversation branching for exploring tangents without losing main thread
- Cross-session context preservation
- Multi-model conversation threading

**Context Compression Agents**

- Identify key insights and decisions from long research conversations
- Generate structured summaries with proper context preservation
- Extract actionable items and next steps automatically
- Format exports based on conversation type (research, planning, brainstorming)

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

# Start development server
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

**Implemented**: Conversation persistence, OpenRouter integration, structured exports, rate limiting, service layer architecture
**In Development**: Advanced routing logic, conversation branching UI, cost optimization
**Next Phase**: Agent-based context compression, advanced PKM integrations

This is a build-in-public project documenting the journey of creating better AI workflows for knowledge work. The development process itself is becoming content for [my DevRel blog](https://the-hacker-screen.ghost.io) about AI-assisted development.
