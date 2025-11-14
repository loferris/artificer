// Static demo data and utilities for UI demonstration
import type { Message } from '../types';
import { DEMO_CONFIG } from '../server/config/demo';

// Convert demo config conversations to API format
export const DEMO_CONVERSATIONS = DEMO_CONFIG.SAMPLE_CONVERSATIONS.map(conv => ({
  id: conv.id,
  title: conv.title,
  model: 'demo-assistant-v1',
  systemPrompt: 'You are a helpful AI assistant showcasing the demo features.',
  temperature: 0.7,
  maxTokens: 1000,
  createdAt: new Date(Date.now() - 60000 * Math.random()),
  updatedAt: new Date(Date.now() - 10000 * Math.random()),
  messages: [], // Empty in conversation list, populated separately
}));

// Convert demo config messages to API format
export const DEMO_MESSAGES = DEMO_CONFIG.SAMPLE_CONVERSATIONS.flatMap(conv => 
  conv.messages.map((msg, index) => ({
    id: `${conv.id}-msg-${index + 1}`,
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
    model: msg.role === 'assistant' ? 'demo-assistant-v1' : undefined,
    cost: msg.role === 'assistant' ? Math.random() * 0.01 : undefined,
    conversationId: conv.id,
  }))
);

export const isStaticDemo = (): boolean => {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    (typeof window !== 'undefined' && window.location?.hostname?.includes('vercel.app')) ||
    false
  );
};

export const initializeStaticDemo = () => {
  if (typeof window !== 'undefined' && isStaticDemo()) {
    // Store demo data in localStorage for persistence across page reloads
    localStorage.setItem('static-demo-conversations', JSON.stringify(DEMO_CONVERSATIONS));
  }
};

export const getStaticDemoData = () => {
  return {
    conversations: DEMO_CONVERSATIONS,
    messages: DEMO_MESSAGES,
  };
};

export const generateDemoResponse = (userMessage: string): Message => {
  const input = userMessage.toLowerCase();
  
  let response: string;
  
  // Command-specific responses
  if (input.startsWith('/')) {
    response = `Great! You tried a command: "${userMessage}". Commands are processed by the built-in command system. Try /help to see all available commands, or use the interface features like theme switching and export functionality!`;
  }
  // Feature-specific responses
  else if (input.includes('theme') || input.includes('color')) {
    response = `🎨 The app supports multiple beautiful themes! Try clicking the floating toolbar (→) in terminal mode to switch between Purple Rich, Amber Forest, and Cyan Light themes. Each theme is optimized for different coding environments!`;
  }
  else if (input.includes('export') || input.includes('download')) {
    response = `📁 Export features are fully functional in this demo! You can export conversations as Markdown, JSON, or plain text. Use the export buttons in chat mode or try the /export command. All formatting and metadata is preserved!`;
  }
  else if (input.includes('terminal') || input.includes('interface')) {
    response = `⌨️ This app features dual interfaces! Switch between Terminal mode (command-line style) and Chat mode (modern bubbles) using the floating toolbar. Each interface has unique features and styling!`;
  }
  else if (input.includes('feature') || input.includes('demo')) {
    response = `✨ This demo showcases: dual interfaces, live theme switching, conversation management, export functionality, command processing, cost tracking, and responsive design. Try the floating toolbar (→) to explore!`;
  }
  // General responses
  else {
    const responses = [
      `That's interesting! This demo showcases a full-featured AI chat application. Try switching between terminal and chat modes using the floating toolbar (→), or explore the command system with "/help".`,
      `Great question! The app includes advanced features like real-time streaming, conversation export (Markdown/JSON), theme switching, and usage tracking. All working in this demo without any APIs!`,
      `Nice! You can explore the dual interface system - terminal mode for command-line enthusiasts and chat mode for modern conversations. The floating toolbar lets you switch instantly!`,
      `Excellent! This demo shows off the export functionality, theme system, and responsive design. Try different screen sizes, switch themes, or export this conversation to see the features in action!`,
    ];
    response = responses[Math.floor(Math.random() * responses.length)];
  }

  return {
    id: `demo-response-${Date.now()}`,
    role: 'assistant',
    content: response,
    timestamp: new Date(),
    model: 'demo-assistant-v1',
    cost: Math.random() * 0.02 + 0.001, // Vary costs for realism
  };
};
