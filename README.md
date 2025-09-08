# AI Orchestration & Knowledge Management System

An intelligent routing layer for AI models that transforms scattered conversations into structured, exportable knowledge. Built to solve my own workflow fragmentation problem - tired of tab-switching between Claude, DeepSeek, and local models while losing track of insights buried in long conversations.

## What I've Learned Building This

The real problem isn't having access to AI models - it's **orchestrating them effectively** and **capturing the knowledge they help generate**. When you're researching complex topics or planning technical projects, conversations naturally span multiple models and sessions. The valuable insights get lost in chat histories that aren't designed for knowledge work.

This system treats AI conversations as **structured data** to be organized, compressed, and exported rather than ephemeral chat logs.

## Current Implementation

**Foundation Layer**
- AI conversation persistence with SQLite database
- OpenRouter API integration for multi-model access
- Rate limiting and session management
- Type-safe API layer with tRPC

**Conversation Management**
- Persistent conversation storage with metadata
- Message threading with token tracking
- Database schema designed for future conversation branching
- Export to structured formats (Markdown, JSON)

**Knowledge Capture**
- Structured conversation data optimized for export
- Foundation for knowledge management tool integration
- Export system ready for PKM workflows

## Technical Implementation

- **Backend**: Next.js + tRPC for type-safe APIs
- **Database**: SQLite with Prisma (designed for easy migration to Postgres)
- **AI Integration**: OpenRouter API for multi-model access
- **Export System**: Structured data optimized for knowledge management tools

## Architecture Philosophy

This is built **API-first** as a headless orchestration service. The current React interface is scaffolding - the real value is in the routing logic and export capabilities that can integrate with:

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
npx prisma generate
npx prisma migrate dev
npm run dev
```

## Development Status

**Implemented**: Conversation persistence, OpenRouter integration, structured exports, rate limiting
**In Development**: Advanced routing logic, conversation branching UI, cost optimization
**Next Phase**: Agent-based context compression, advanced PKM integrations

This is a build-in-public project documenting the journey of creating better AI workflows for knowledge work. The development process itself is becoming content for [my DevRel blog](https://thehackerscreen.com) about AI-assisted development.
