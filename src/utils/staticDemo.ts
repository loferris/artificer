// Static demo data and utilities for UI demonstration
import type { Message } from '../types';

// Mock conversation data matching API response structure
export const DEMO_CONVERSATIONS = [
  {
    id: 'demo-1',
    title: 'Simple Demo Chat',
    model: 'demo-assistant-v1',
    systemPrompt: 'You are a helpful AI assistant.',
    temperature: 0.7,
    maxTokens: 1000,
    createdAt: new Date(Date.now() - 60000),
    updatedAt: new Date(Date.now() - 10000),
    messages: [], // Empty in conversation list, populated separately
  }
];

// Mock messages data matching API response structure  
export const DEMO_MESSAGES = [
  {
    id: 'msg-1',
    role: 'user' as const,
    content: 'Hello, world!',
    timestamp: new Date(Date.now() - 30000), // API maps createdAt to timestamp
    model: undefined, // API returns undefined for messages
    cost: undefined,  // API returns undefined for messages
  },
  {
    id: 'msg-2', 
    role: 'assistant' as const,
    content: 'Goodnight moon! 🌙\n\nThis is a static demo of TeddyBox Chat - an AI orchestration and knowledge management system. The real version connects to AI models via OpenRouter for dynamic conversations.',
    timestamp: new Date(Date.now() - 10000),
    model: undefined,
    cost: undefined,
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
  return {
    conversations: DEMO_CONVERSATIONS,
    messages: DEMO_MESSAGES
  };
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