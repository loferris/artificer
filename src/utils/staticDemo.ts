// Static demo data and utilities for UI demonstration
import type { Message } from '../types';

export const DEMO_CONVERSATIONS = [
  {
    id: 'demo-1',
    title: 'Simple Demo Chat',
    messages: [
      {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello, world!',
        timestamp: new Date(Date.now() - 30000),
        model: undefined,
        cost: 0,
      },
      {
        id: 'msg-2',
        role: 'assistant' as const,
        content: 'Goodnight moon! 🌙\n\nThis is a static demo of TeddyBox Chat - an AI orchestration and knowledge management system. The real version connects to AI models via OpenRouter for dynamic conversations.',
        timestamp: new Date(Date.now() - 10000),
        model: 'demo-assistant-v1',
        cost: 0.001,
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