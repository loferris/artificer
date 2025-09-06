import { useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { DEMO_CONVERSATIONS, isStaticDemo, generateDemoResponse } from '../utils/staticDemo';

export const useStaticDemo = () => {
  const {
    setDemoMode,
    createDemoConversation, 
    addDemoMessage,
    setCurrentConversation,
    isDemoMode,
    currentConversationId
  } = useChatStore();

  // Initialize demo mode on mount if in static demo environment
  useEffect(() => {
    if (isStaticDemo()) {
      setDemoMode(true);
      
      // Initialize demo conversations
      DEMO_CONVERSATIONS.forEach(conv => {
        createDemoConversation(conv.id, conv.title);
        
        // Add messages to the demo conversation
        conv.messages.forEach(message => {
          addDemoMessage({
            ...message,
            conversationId: conv.id,
          });
        });
      });
      
      // Set the first conversation as current
      if (DEMO_CONVERSATIONS.length > 0) {
        setCurrentConversation(DEMO_CONVERSATIONS[0].id);
      }
    }
  }, [setDemoMode, createDemoConversation, addDemoMessage, setCurrentConversation]);

  // Mock API functions for demo mode
  const demoAPI = {
    sendMessage: async (message: string, conversationId: string) => {
      if (!isDemoMode) return null;
      
      // Add user message
      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user' as const,
        content: message,
        timestamp: new Date(),
        model: undefined,
        cost: 0,
        conversationId,
      };
      
      addDemoMessage(userMessage);
      
      // Simulate AI response delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      // Add AI response
      const aiResponse = generateDemoResponse(message);
      addDemoMessage({
        ...aiResponse,
        conversationId,
      });
      
      return aiResponse;
    },
    
    createConversation: async () => {
      if (!isDemoMode) return null;
      
      const newId = `demo-${Date.now()}`;
      createDemoConversation(newId, 'New Demo Conversation');
      setCurrentConversation(newId);
      
      return {
        id: newId,
        title: 'New Demo Conversation',
        model: 'demo-assistant-v1',
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        maxTokens: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
    
    getConversations: async () => {
      if (!isDemoMode) return [];
      
      return DEMO_CONVERSATIONS.map(conv => ({
        id: conv.id,
        title: conv.title,
        model: 'demo-assistant-v1',
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        maxTokens: 1000,
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 7), // Random time in last week
        updatedAt: new Date(Date.now() - Math.random() * 86400000),
        messages: [],
      }));
    },
    
    getMessages: async (conversationId: string) => {
      if (!isDemoMode) return [];
      
      const conv = DEMO_CONVERSATIONS.find(c => c.id === conversationId);
      return conv ? conv.messages.map(msg => ({
        ...msg,
        conversationId,
      })) : [];
    }
  };

  return {
    isDemoMode,
    demoAPI,
    isStaticDemo: isStaticDemo(),
  };
};