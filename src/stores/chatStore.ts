import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message } from '../types';

export type ViewMode = 'chat' | 'terminal';

export interface ChatState {
  // View mode
  viewMode: ViewMode;
  streamingMode: boolean;
  sidebarOpen: boolean;

  // Current conversation
  currentConversationId: string | null;
  messages: Message[];
  localMessages: Message[];
  selectableConversations: any[];

  // Loading states
  isLoading: boolean;
  isCreatingConversation: boolean;

  // Error state
  error: string | null;
  streamingError: string | null;

  // Input state
  input: string;

  // Retry functionality
  retryCount: number;
  lastFailedMessage: string;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setStreamingMode: (enabled: boolean) => void;
  toggleSidebar: () => void;
  toggleStreaming: () => void;
  setCurrentConversation: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setLocalMessages: (messages: Message[]) => void;
  addLocalMessage: (message: Message) => void;
  setSelectableConversations: (conversations: any[]) => void;
  setLoading: (loading: boolean) => void;
  setCreatingConversation: (creating: boolean) => void;
  setError: (error: string | null) => void;
  setStreamingError: (error: string | null) => void;
  clearStreamingError: () => void;
  setInput: (input: string) => void;
  clearMessages: () => void;
  resetConversation: () => void;
  setRetryCount: (count: number) => void;
  setLastFailedMessage: (message: string) => void;
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
      viewMode: 'terminal',
      streamingMode: false,
      sidebarOpen: true,
      currentConversationId: null,
      messages: [],
      localMessages: [],
      selectableConversations: [],
      isLoading: false,
      isCreatingConversation: false,
      error: null,
      streamingError: null,
      input: '',
      retryCount: 0,
      lastFailedMessage: '',

      // Actions
      setViewMode: (mode) => set({ viewMode: mode }, false, 'setViewMode'),
      setStreamingMode: (enabled) => set({ streamingMode: enabled }, false, 'setStreamingMode'),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }), false, 'toggleSidebar'),
      toggleStreaming: () => set((state) => ({ streamingMode: !state.streamingMode }), false, 'toggleStreaming'),
      setCurrentConversation: (id) => set({ currentConversationId: id, messages: [], localMessages: [] }, false, 'setCurrentConversation'),
      setMessages: (messages) => set({ messages }, false, 'setMessages'),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] }), false, 'addMessage'),
      setLocalMessages: (messages) => set({ localMessages: messages }, false, 'setLocalMessages'),
      addLocalMessage: (message) => set((state) => ({ localMessages: [...state.localMessages, message] }), false, 'addLocalMessage'),
      setSelectableConversations: (conversations) => set({ selectableConversations: conversations }, false, 'setSelectableConversations'),
      setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
      setCreatingConversation: (creating) => set({ isCreatingConversation: creating }, false, 'setCreatingConversation'),
      setError: (error) => set({ error }, false, 'setError'),
      setStreamingError: (error) => set({ streamingError: error }, false, 'setStreamingError'),
      clearStreamingError: () => set({ streamingError: null }, false, 'clearStreamingError'),
      setInput: (input) => set({ input }, false, 'setInput'),
      clearMessages: () => set({ messages: [], localMessages: [] }, false, 'clearMessages'),
      resetConversation: () => set({ currentConversationId: null, messages: [], localMessages: [], selectableConversations: [] }, false, 'resetConversation'),
      setRetryCount: (count) => set({ retryCount: count }, false, 'setRetryCount'),
      setLastFailedMessage: (message) => set({ lastFailedMessage: message }, false, 'setLastFailedMessage'),
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
      name: 'chat-store',
    },
  ),
);
