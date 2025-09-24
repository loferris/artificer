import { useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import {
  DEMO_CONVERSATIONS,
  DEMO_MESSAGES,
  isStaticDemo,
  generateDemoResponse,
} from '../utils/staticDemo';

export const useStaticDemo = () => {
  // Temporarily disabled demo functionality for build
  return {
    demoAPI: {
      sendMessage: async () => ({ success: true }),
      createConversation: async () => ({ id: 'demo' }),
    },
    initializeDemo: () => {},
    isDemoInitialized: false,
  };

  // Temporarily disabled demo functionality - all commented out for build
  // const {
  //   // setDemoMode,
  //   createDemoConversation,
  //   addDemoMessage,
  //   setCurrentConversation,
  //   isDemoMode,
  //   currentConversationId,
  // } = useChatStore();

  // // Initialize demo mode on mount if in static demo environment
  // useEffect(() => {
  //   if (isStaticDemo()) {
  //     // setDemoMode(true);

  //     // Initialize demo conversations (matching API structure)
  //     DEMO_CONVERSATIONS.forEach((conv) => {
  //       createDemoConversation(conv.id, conv.title);
  //     });

  //     // Add demo messages
  //     DEMO_MESSAGES.forEach((message) => {
  //       addDemoMessage(message);
  //     });

  //     // Set the first conversation as current
  //     if (DEMO_CONVERSATIONS.length > 0) {
  //       setCurrentConversation(DEMO_CONVERSATIONS[0].id);
  //     }
  //   }
  // }, [/* setDemoMode, */ createDemoConversation, addDemoMessage, setCurrentConversation]);

  // // Mock API functions for demo mode
  // const demoAPI = {
  //   sendMessage: async (message: string, conversationId: string) => {
  //     if (!isDemoMode) return null;

  //     // Add user message
  //     const userMessage = {
  //       id: `user-${Date.now()}`,
  //       role: 'user' as const,
  //       content: message,
  //       timestamp: new Date(),
  //       model: undefined,
  //       cost: 0,
  //       conversationId,
  //     };

  //     addDemoMessage(userMessage);

  //     // Simulate AI response delay
  //     await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

  //     // Add AI response
  //     const aiResponse = generateDemoResponse(message);
  //     addDemoMessage(aiResponse);

  //     return aiResponse;
  //   },

  //   createConversation: async () => {
  //     if (!isDemoMode) return null;

  //     const newId = `demo-${Date.now()}`;
  //     createDemoConversation(newId, 'New Demo Conversation');
  //     setCurrentConversation(newId);

  //     return {
  //       id: newId,
  //       title: 'New Demo Conversation',
  //       model: 'demo-assistant-v1',
  //       systemPrompt: 'You are a helpful AI assistant.',
  //       temperature: 0.7,
  //       maxTokens: 1000,
  //       createdAt: new Date(),
  //       updatedAt: new Date(),
  //     };
  //   },

  //   getConversations: async () => {
  //     if (!isDemoMode) return [];

  //     return DEMO_CONVERSATIONS.map((conv) => ({
  //       id: conv.id,
  //       title: conv.title,
  //       model: 'demo-assistant-v1',
  //       systemPrompt: 'You are a helpful AI assistant.',
  //       temperature: 0.7,
  //       maxTokens: 1000,
  //       createdAt: new Date(Date.now() - Math.random() * 86400000 * 7), // Random time in last week
  //       updatedAt: new Date(Date.now() - Math.random() * 86400000),
  //       messages: [],
  //     }));
  //   },

  //   getMessages: async (conversationId: string) => {
  //     if (!isDemoMode) return [];

  //     // Return demo messages for the demo conversation
  //     return conversationId === 'demo-1' ? DEMO_MESSAGES : [];
  //   },
  // };

  // return {
  //   isDemoMode,
  //   demoAPI,
  //   isStaticDemo: isStaticDemo(),
  // };
};
