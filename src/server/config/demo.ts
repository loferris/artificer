// Demo configuration for showcase deployment
export const DEMO_CONFIG = {
  // Force mock assistant in demo mode
  FORCE_MOCK_ASSISTANT: process.env.DEMO_MODE === 'true',
  
  // Demo rate limits (more generous for showcase)
  DEMO_RATE_LIMITS: {
    CHAT: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 messages per minute
    API: { maxRequests: 300, windowMs: 60 * 1000 }, // 300 API calls per minute
    EXPORT: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 exports per minute
  },
  
  // Demo sample conversations
  SAMPLE_CONVERSATIONS: [
    {
      id: 'demo-1',
      title: 'Welcome to the Chat App Demo!',
      messages: [
        {
          role: 'user' as const,
          content: 'Hello! Can you tell me what this chat application can do?',
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        },
        {
          role: 'assistant' as const,
          content: `Welcome to this AI chat application! 🎉 This is a showcase demo featuring:

• **Real-time AI conversations** - Chat with various AI models
• **Conversation management** - Create, organize, and delete chats  
• **Export functionality** - Download your conversations as Markdown or JSON
• **Beautiful UI** - Modern, responsive design with Tailwind CSS
• **Session persistence** - Your conversations are saved locally
• **Cost tracking** - Monitor API usage and costs

This demo uses a mock AI assistant to showcase the interface and functionality. In the full version, you can connect your own OpenRouter API key to chat with real AI models like Claude, GPT-4, and more!

Try asking me anything or explore the export feature! 🚀`,
          timestamp: new Date(Date.now() - 3599000),
        }
      ]
    },
    {
      id: 'demo-2', 
      title: 'Technical Features Demo',
      messages: [
        {
          role: 'user' as const,
          content: 'What technical features does this app have?',
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        },
        {
          role: 'assistant' as const,
          content: `This chat application is built with modern web technologies:

**Frontend:**
• Next.js 15 with React 18
• TypeScript for type safety
• Tailwind CSS for styling
• tRPC for type-safe APIs

**Backend:**
• Node.js server with tRPC
• Prisma ORM with SQLite database
• Rate limiting and security middleware
• Structured logging system

**Production Features:**
• Database transactions for data integrity
• Input validation and sanitization
• Session-based access control
• Health check endpoints
• Graceful error handling

**Deployment:**
• Vercel-ready configuration
• Docker support
• Environment-based configuration
• Production monitoring

The architecture is designed to be scalable, secure, and maintainable! 💪`,
          timestamp: new Date(Date.now() - 1799000),
        }
      ]
    }
  ],
  
  // Demo environment detection
  IS_DEMO: process.env.VERCEL_ENV === 'preview' || process.env.DEMO_MODE === 'true',
} as const;
