// src/hooks/useConversationStore.ts
import { useState, useEffect } from 'react';
import { Conversation, Message } from '../types'; // Adjust path as needed

interface UseConversationStore {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  saveConversation: (conversation: Conversation) => void;
  deleteConversation: (id: string) => void;
  getConversation: (id: string) => Conversation | undefined;
  createNewConversation: () => Conversation;
  updateConversationMessages: (conversationId: string, messages: Message[]) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
}

// Define proper types for the parsed data
interface StoredConversation {
  id: string;
  title: string;
  messages: StoredMessage[];
  tags: string[];
  createdAt: string; // Will be string when parsed from JSON
  updatedAt: string; // Will be string when parsed from JSON
}

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // Will be string when parsed from JSON
  model?: string;
  cost?: number;
}

export const useConversationStore = (): UseConversationStore => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('chatConversations');
      console.log('Raw saved ', saved);

      if (saved && saved !== 'NaN') {
        const parsed: StoredConversation[] = JSON.parse(saved); // Specify type instead of any
        console.log('Parsed data type:', typeof parsed, 'value:', parsed);

        // Check if parsed is an array
        if (Array.isArray(parsed)) {
          // Convert date strings back to Date objects
          const withDates: Conversation[] = parsed
            .map((conv: StoredConversation) => {
              // Specify type instead of any
              // Validate that conv is an object
              if (typeof conv !== 'object' || conv === null) {
                console.warn('Invalid conversation object:', conv);
                return null;
              }

              return {
                ...conv,
                createdAt: new Date(conv.createdAt),
                updatedAt: new Date(conv.updatedAt),
                messages: Array.isArray(conv.messages)
                  ? conv.messages
                      .map((msg: StoredMessage) => {
                        // Specify type instead of any
                        // Validate that msg is an object
                        if (typeof msg !== 'object' || msg === null) {
                          console.warn('Invalid message object:', msg);
                          return null;
                        }

                        return {
                          ...msg,
                          timestamp: new Date(msg.timestamp),
                        };
                      })
                      .filter((msg): msg is Message => msg !== null)
                  : [],
              };
            })
            .filter((conv): conv is Conversation => conv !== null); // Remove any null conversations

          console.log('Processed conversations:', withDates);
          setConversations(withDates);
        } else {
          console.warn('Stored conversations is not an array, initializing with empty array');
          setConversations([]);
        }
      } else {
        // No data or invalid data, initialize with empty array
        setConversations([]);
      }
    } catch (e) {
      console.error('Failed to parse conversations', e);
      // Initialize with empty array if parsing fails
      setConversations([]);
    }
  }, []);

  const saveToStorage = (convs: Conversation[]) => {
    try {
      localStorage.setItem('chatConversations', JSON.stringify(convs));
    } catch (e) {
      console.error('Failed to save conversations to localStorage', e);
    }
  };

  const saveConversation = (conversation: Conversation) => {
    // Validate conversation object
    if (!conversation || typeof conversation !== 'object') {
      console.warn('Invalid conversation object passed to saveConversation');
      return;
    }

    const updated = conversations.some((c) => c.id === conversation.id)
      ? conversations.map((c) => (c.id === conversation.id ? conversation : c))
      : [...conversations, conversation];

    setConversations(updated);
    saveToStorage(updated);
    setCurrentConversation(conversation);
  };

  const deleteConversation = (id: string) => {
    const filtered = conversations.filter((c) => c.id !== id);
    setConversations(filtered);
    saveToStorage(filtered);
    if (currentConversation?.id === id) {
      setCurrentConversation(null);
    }
  };

  const getConversation = (id: string) => {
    return conversations.find((c) => c.id === id);
  };

  const createNewConversation = (): Conversation => {
    const newConversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Conversation',
      messages: [],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    saveConversation(newConversation);
    return newConversation;
  };

  const updateConversationMessages = (conversationId: string, messages: Message[]) => {
    // Validate inputs
    if (!conversationId || !Array.isArray(messages)) {
      console.warn('Invalid inputs to updateConversationMessages');
      return;
    }

    const updatedConversations = conversations.map((conv) => {
      if (conv.id === conversationId) {
        // Generate title from first user message if it's the first message
        const title =
          messages.length > 0 && messages[0].role === 'user'
            ? messages[0].content.substring(0, 50) + (messages[0].content.length > 50 ? '...' : '')
            : conv.title;

        return {
          ...conv,
          messages,
          title,
          updatedAt: new Date(),
        };
      }
      return conv;
    });

    setConversations(updatedConversations);
    saveToStorage(updatedConversations);

    // Update current conversation if it's the one being updated
    if (currentConversation?.id === conversationId) {
      const updatedConv = updatedConversations.find((c) => c.id === conversationId);
      if (updatedConv) {
        setCurrentConversation(updatedConv);
      }
    }
  };

  return {
    conversations,
    currentConversation,
    saveConversation,
    deleteConversation,
    getConversation,
    createNewConversation,
    updateConversationMessages,
    setCurrentConversation,
  };
};
