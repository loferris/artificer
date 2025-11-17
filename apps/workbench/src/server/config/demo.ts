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
      title: 'Welcome - Interface Features Demo',
      messages: [
        {
          role: 'user' as const,
          content: 'What makes this chat application special?',
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          role: 'assistant' as const,
          content: `Welcome to the AI Workflow Engine! ✨ This demo showcases:

**🎯 Dual Interface System**
• **Terminal Mode**: Command-line style interface with themes
• **Chat Mode**: Modern conversation UI with bubbles
• Switch seamlessly between both views!

**💬 Advanced Chat Features**
• Real-time streaming responses
• Smart command processing (try typing "/help")
• Conversation management & organization
• Export conversations (Markdown, JSON, TXT formats)

**🎨 Customization**
• Multiple terminal themes (Purple Rich, Amber Forest, Cyan Light)
• Live theme switching without refresh
• Responsive design for all devices

**⚡ Modern Architecture**
• Next.js 15 + React 18 + TypeScript
• tRPC for type-safe APIs
• Zustand for state management
• Real-time cost tracking

Try the **floating toolbar** (→) to switch views, or use commands like "/themes" to explore!`,
          timestamp: new Date(Date.now() - 3599000),
        },
      ],
    },
    {
      id: 'demo-2',
      title: 'Command System Demo',
      messages: [
        {
          role: 'user' as const,
          content: '/help',
          timestamp: new Date(Date.now() - 1800000),
        },
        {
          role: 'assistant' as const,
          content: `**Available Commands:**

• **/help** - Show this help message
• **/clear** - Clear the current conversation
• **/conversations** - List all conversations
• **/themes** - Show available terminal themes
• **/export** - Export current conversation
• **/cost** - Show usage costs and statistics
• **/new** - Create a new conversation

**Interface Commands:**
• **/terminal** - Switch to terminal view
• **/chat** - Switch to chat view
• **/toggle** - Toggle between interfaces

**Pro Tips:**
✨ Use the floating toolbar (→) for quick access to controls
🎨 Try different terminal themes for various coding environments
📊 Monitor your usage with the cost tracker
💾 Export conversations to share or backup your chats

Type any command to try it out!`,
          timestamp: new Date(Date.now() - 1799000),
        },
        {
          role: 'user' as const,
          content: '/themes',
          timestamp: new Date(Date.now() - 1700000),
        },
        {
          role: 'assistant' as const,
          content: `**Available Terminal Themes:**

🟣 **Purple Rich** - Default dark theme with purple accents
🟤 **Amber Forest** - Warm amber theme with forest green highlights  
🔵 **Cyan Light** - Light theme with cyan blue accents

**Theme Features:**
• Syntax highlighting optimized for each theme
• Carefully crafted color palettes for readability
• Consistent across terminal and chat modes
• Instant switching without page reload

To change themes:
1. Use the floating toolbar (→) in terminal mode
2. Click the theme selector in the top toolbar
3. Changes apply immediately to the interface

Each theme is designed for different coding environments and personal preferences!`,
          timestamp: new Date(Date.now() - 1699000),
        },
      ],
    },
    {
      id: 'demo-3',
      title: 'Export & Data Management',
      messages: [
        {
          role: 'user' as const,
          content: 'How do I export my conversations?',
          timestamp: new Date(Date.now() - 900000),
        },
        {
          role: 'assistant' as const,
          content: `**Export Options:**

📄 **Formats Available:**
• **Markdown** (.md) - Perfect for documentation and sharing
• **JSON** (.json) - For programmatic access and backups
• **Plain Text** (.txt) - Simple text format for any use

🎯 **Export Methods:**
• **/export** - Export current conversation
• **Export Button** - In chat mode sidebar
• **Export All** - Download all conversations at once

**Export Features:**
• Preserves timestamps and message metadata
• Clean formatting with proper headers
• Includes conversation titles and context
• Instant download with proper file names

**Use Cases:**
• 📚 Create documentation from AI conversations
• 💾 Backup important discussions
• 🤝 Share conversations with team members
• 📊 Analyze conversation patterns and data

The exported files maintain full conversation history with proper formatting!`,
          timestamp: new Date(Date.now() - 899000),
        },
        {
          role: 'user' as const,
          content: 'What about cost tracking?',
          timestamp: new Date(Date.now() - 600000),
        },
        {
          role: 'assistant' as const,
          content: `**Cost Tracking Features:**

📊 **Real-time Monitoring:**
• Token usage tracking per message
• Cost calculation based on model pricing
• Session totals and running costs
• Historical usage patterns

💰 **Cost Breakdown:**
• Input tokens (your messages)
• Output tokens (AI responses)  
• Total cost per conversation
• Daily/weekly/monthly summaries

⚙️ **Smart Features:**
• Automatic model detection
• Rate limiting awareness
• Usage predictions and warnings
• Export cost reports with conversations

**Demo Mode Note:**
This demo uses mock pricing data to showcase the cost tracking interface. In production, costs are calculated using real API pricing from your configured AI provider.

Use **/cost** command or check the floating toolbar for current session statistics!`,
          timestamp: new Date(Date.now() - 599000),
        },
      ],
    },
  ],

  // Demo environment detection
  IS_DEMO: process.env.VERCEL_ENV === 'preview' || process.env.DEMO_MODE === 'true',
} as const;
