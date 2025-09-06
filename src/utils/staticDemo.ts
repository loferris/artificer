// Static demo data and utilities for UI demonstration
import type { Message } from '../types';

export const DEMO_CONVERSATIONS = [
  {
    id: 'demo-1',
    title: 'Welcome to TeddyBox Chat!',
    messages: [
      {
        id: 'msg-1',
        role: 'assistant' as const,
        content: `# Welcome to TeddyBox Chat! 🐻

This is a demo of an AI orchestration and knowledge management system. Here are some key features:

## 🚀 Features
- **Multi-model AI integration** via OpenRouter
- **Conversation management** with SQLite/Prisma
- **Real-time chat interface** with React + tRPC
- **Export capabilities** for knowledge management
- **Usage tracking** and analytics

## 🛠️ Tech Stack
- Next.js with TypeScript
- tRPC for type-safe APIs  
- Zustand for state management
- Tailwind CSS for styling
- Vitest for testing

Try asking me about the architecture or features!`,
        timestamp: new Date(Date.now() - 60000),
        model: 'demo-assistant-v1',
        cost: 0.001,
      },
      {
        id: 'msg-2', 
        role: 'user' as const,
        content: 'How does the tRPC integration work?',
        timestamp: new Date(Date.now() - 30000),
        model: undefined,
        cost: 0,
      },
      {
        id: 'msg-3',
        role: 'assistant' as const,
        content: `Great question! The tRPC integration provides type-safe client-server communication:

## tRPC Architecture

### Server Side (\`src/server/\`)
- **Routers** for different domains (chat, conversations, messages, export)
- **Type-safe procedures** with Zod validation
- **Middleware** for rate limiting and error handling
- **Context** provides database, user session, etc.

### Client Side (\`src/lib/trpc/client.ts\`)
- **React Query integration** for caching and mutations  
- **Automatic type inference** from server router types
- **Error handling** with custom fetch logic
- **Session management** via headers

### Benefits
✅ **Full-stack type safety** - changes to server automatically update client types
✅ **Built-in error handling** with structured error responses  
✅ **Optimistic updates** and caching via React Query
✅ **Real-time subscriptions** capability (though not used in this demo)

The \`AppRouter\` type is exported from the server and imported by the client, ensuring perfect type synchronization!`,
        timestamp: new Date(Date.now() - 5000),
        model: 'demo-assistant-v1',
        cost: 0.003,
      }
    ]
  },
  {
    id: 'demo-2', 
    title: 'Database & Export Features',
    messages: [
      {
        id: 'msg-4',
        role: 'user' as const,
        content: 'Tell me about the database schema and export functionality',
        timestamp: new Date(Date.now() - 120000),
        model: undefined,
        cost: 0,
      },
      {
        id: 'msg-5',
        role: 'assistant' as const, 
        content: `## Database Schema (Prisma + SQLite)

### Core Models
- **Conversation**: Stores chat metadata, model settings, system prompts
- **Message**: Individual messages with token tracking, tree structure for branching
- **Relationships**: One-to-many between conversations and messages

### Export System (\`src/server/services/export.ts\`)
The system treats AI conversations as structured data for knowledge management:

#### Supported Formats
- **Markdown**: Clean, readable format with conversation metadata
- **JSON**: Structured data with full message history and tokens
- **Future**: Obsidian, Notion, Org-mode integrations planned

#### Export Features  
- **Conversation filtering** by date range, model, or content
- **Token usage analytics** included in exports
- **Hierarchical structure** preserved (for branching conversations)
- **Metadata preservation** (timestamps, costs, model info)

This makes the chat app perfect for researchers, writers, and knowledge workers who want to capture and organize their AI interactions!`,
        timestamp: new Date(Date.now() - 90000),
        model: 'demo-assistant-v1', 
        cost: 0.004,
      }
    ]
  },
  {
    id: 'demo-3',
    title: 'Testing & Development',
    messages: [
      {
        id: 'msg-6',
        role: 'user' as const,
        content: 'What about testing and development workflow?',
        timestamp: new Date(Date.now() - 180000),
        model: undefined,
        cost: 0,
      },
      {
        id: 'msg-7',
        role: 'assistant' as const,
        content: `## Testing Strategy

### Unit Tests (Vitest + React Testing Library)
- **Service layer testing** for AI integration and export functions  
- **Utility testing** for demo mode, session management, etc.
- **Component testing** for UI interactions and state management

### Integration Tests
- **tRPC procedure testing** with realistic mocks
- **Database integration** with test database
- **End-to-end API flows** from client to server

### Development Tools
- **MSW (Mock Service Worker)** for HTTP mocking
- **Prisma Studio** for database inspection
- **tRPC DevTools** for query/mutation debugging
- **Zustand DevTools** for state inspection

### Scripts Available
\`\`\`bash
npm test          # Unit tests
npm run test:ui   # Tests with UI
npm run test:e2e  # End-to-end tests  
npm run dev       # Development server
npm run build     # Production build
\`\`\`

The architecture is API-first, making it easy to integrate with CLI tools, Obsidian plugins, and org-mode functions!`,
        timestamp: new Date(Date.now() - 150000),
        model: 'demo-assistant-v1',
        cost: 0.005,
      }
    ]
  }
];

export const isStaticDemo = (): boolean => {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || 
         (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'));
};

export const initializeStaticDemo = () => {
  if (typeof window !== 'undefined' && isStaticDemo()) {
    // Store demo data in localStorage for persistence across page reloads
    localStorage.setItem('static-demo-conversations', JSON.stringify(DEMO_CONVERSATIONS));
  }
};

export const getStaticDemoData = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('static-demo-conversations');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEMO_CONVERSATIONS;
      }
    }
  }
  return DEMO_CONVERSATIONS;
};

export const generateDemoResponse = (userMessage: string): Message => {
  // Simple demo response generator
  const responses = [
    "That's a great question! In this demo mode, I'm showing you the UI capabilities of TeddyBox Chat.",
    "This is a static demo response. The full version would connect to AI models via OpenRouter for real conversations.",
    "Thanks for trying out the demo! The actual app supports multiple AI models and real-time conversations.",
    "In the full version, this would be a real AI response. This demo showcases the chat interface and message handling.",
    "Great point! The production app includes features like conversation export, usage tracking, and model switching."
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return {
    id: `demo-response-${Date.now()}`,
    role: 'assistant',
    content: randomResponse,
    timestamp: new Date(),
    model: 'demo-assistant-v1',
    cost: 0.001,
  };
};