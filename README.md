# Building an AI Chat Interface with Memory

A TypeScript chat app for AI models that maintains conversation history locally. Started as a weekend project to solve my own problem, now turning into an interesting exploration of persistent AI interfaces.

## What I've learned building this

The biggest insight was that conversation persistence fundamentally changes how you use AI tools. When you know the context will be there tomorrow, you start having different kinds of conversations - more iterative, more exploratory. You can build on previous discussions instead of starting from scratch every time.

Cost tracking was another eye-opener. Seeing real token costs made me much more intentional about which models to use for different tasks.

## Technical implementation

- **Frontend**: Next.js + React with tRPC for type-safe API calls
- **Backend**: tRPC routers + Prisma ORM  
- **Database**: SQLite (local, easily swappable for Postgres)
- **State**: Zustand for client-side state management
- **AI**: OpenRouter API for multi-model access

## Current state

- Multi-model chat through OpenRouter
- Basic conversation persistence (SQLite foundation)
- Export to formatted Markdown and JSON
- Cost tracking to understand usage patterns

The persistence layer is just infrastructure - the interesting part is what you can do with organized conversation data. Right now the exports are clean but basic. The real work is coming in the next phase.

## Setup

```bash
git clone [repo]
cd ai-chat-app
npm install
cp .env.example .env.local
# Add your OPENROUTER_API_KEY
npx prisma generate
npx prisma migrate dev
npm run dev
```

## Next: Context compression via agents

Phase 2 is where it gets interesting. Planning to add agent-based context compression that can:

- Identify key insights and decisions from long conversations
- Generate structured summaries with proper context
- Extract actionable items and next steps
- Format exports based on conversation type (research, planning, brainstorming)

The goal is turning messy AI conversations into clean, usable documentation automatically.
