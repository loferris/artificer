import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message } from '../types';

export interface ChatState {
  // Current conversation
  currentConversationId: string | null;

  // Loading states
  isLoading: boolean;
  isCreatingConversation: boolean;

  // Error state
  error: string | null;

  // Retry functionality
  retryCount: number;
  lastFailedMessage: string;

  // UI state
  input: string;
  sidebarOpen: boolean;

  // Demo mode state
  isDemoMode: boolean;
  demoMessages: Message[];
  demoConversations: Map<string, { id: string; title: string; messages: Message[] }>;

  // Actions
  setCurrentConversation: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setCreatingConversation: (creating: boolean) => void;
  setError: (error: string | null) => void;
  setRetryCount: (count: number) => void;
  setLastFailedMessage: (message: string) => void;
  setInput: (input: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setDemoMode: (isDemo: boolean) => void;
  addDemoMessage: (message: Message) => void;
  createDemoConversation: (id: string, title?: string) => void;
  getDemoConversation: (
    id: string,
  ) => { id: string; title: string; messages: Message[] } | undefined;
  clearDemoData: () => void;

  // Combined actions
  clearError: () => void;
  resetRetry: () => void;
  startMessageSend: (message: string) => void;
  finishMessageSend: () => void;
  handleMessageError: (error: string) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentConversationId: null,
      isLoading: false,
      isCreatingConversation: false,
      error: null,
      retryCount: 0,
      lastFailedMessage: '',
      input: '',
      sidebarOpen: true,
      isDemoMode: false,
      demoMessages: [],
      demoConversations: new Map(),

      // Basic setters
      setCurrentConversation: (id) =>
        set({ currentConversationId: id }, false, 'setCurrentConversation'),
      setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
      setCreatingConversation: (creating) =>
        set({ isCreatingConversation: creating }, false, 'setCreatingConversation'),
      setError: (error) => set({ error }, false, 'setError'),
      setRetryCount: (count) => set({ retryCount: count }, false, 'setRetryCount'),
      setLastFailedMessage: (message) =>
        set({ lastFailedMessage: message }, false, 'setLastFailedMessage'),
      setInput: (input) => set({ input }, false, 'setInput'),
      setSidebarOpen: (open) => set({ sidebarOpen: open }, false, 'setSidebarOpen'),
      setDemoMode: (isDemo) => set({ isDemoMode: isDemo }, false, 'setDemoMode'),
      addDemoMessage: (message) =>
        set(
          (state) => {
            // Also add to current demo conversation if it exists
            const currentId = state.currentConversationId;
            if (currentId && state.demoConversations.has(currentId)) {
              const conv = state.demoConversations.get(currentId)!;
              const updatedConv = {
                ...conv,
                messages: [...conv.messages, message],
              };
              const updatedConversations = new Map(state.demoConversations);
              updatedConversations.set(currentId, updatedConv);
              return {
                demoMessages: [...state.demoMessages, message],
                demoConversations: updatedConversations,
              };
            }
            return { demoMessages: [...state.demoMessages, message] };
          },
          false,
          'addDemoMessage',
        ),

      createDemoConversation: (id, title) =>
        set(
          (state) => {
            const newConversation = {
              id,
              title: title || `Demo Conversation ${Date.now()}`,
              messages: [],
            };
            const updatedConversations = new Map(state.demoConversations);
            updatedConversations.set(id, newConversation);
            return {
              demoConversations: updatedConversations,
              currentConversationId: id,
            };
          },
          false,
          'createDemoConversation',
        ),

      getDemoConversation: (id) => {
        return get().demoConversations.get(id);
      },

      clearDemoData: () =>
        set(
          {
            demoMessages: [],
            demoConversations: new Map(),
            isDemoMode: false,
          },
          false,
          'clearDemoData',
        ),

      // Combined actions
      clearError: () => set({ error: null }, false, 'clearError'),

      resetRetry: () =>
        set(
          {
            retryCount: 0,
            lastFailedMessage: '',
          },
          false,
          'resetRetry',
        ),

      startMessageSend: (message) => {
        set(
          {
            input: '',
            error: null,
            isLoading: true,
            lastFailedMessage: message,
          },
          false,
          'startMessageSend',
        );
      },

      finishMessageSend: () => {
        set(
          {
            isLoading: false,
            retryCount: 0,
            lastFailedMessage: '',
            error: null,
          },
          false,
          'finishMessageSend',
        );
      },

      handleMessageError: (error) => {
        set(
          (state) => ({
            isLoading: false,
            error,
            retryCount: state.retryCount + 1,
          }),
          false,
          'handleMessageError',
        );
      },
    }),
    {
      name: 'chat-store', // DevTools name
    },
  ),
);

// Selectors for common state combinations
export const useIsConversationReady = () => {
  return useChatStore(
    (state) => state.currentConversationId !== null && !state.isCreatingConversation,
  );
};

export const useCanSendMessage = () => {
  return useChatStore(
    (state) =>
      !!state.input.trim() &&
      !state.isLoading &&
      state.currentConversationId !== null &&
      !state.isCreatingConversation,
  );
};

export const useShouldShowRetry = () => {
  return useChatStore(
    (state) => !!state.error && state.error.includes('try again') && !!state.lastFailedMessage,
  );
};
