import {
  useChatStore,
  useIsConversationReady,
  useCanSendMessage,
  useShouldShowRetry,
} from '../../stores/chatStore';

/**
 * Centralized hook for all chat state management
 * This hook provides a clean interface to the Zustand store
 * and computed selectors, making it easier to test and maintain
 */
export const useChatState = () => {
  // Basic state
  const currentConversationId = useChatStore((state) => state.currentConversationId);
  const isLoading = useChatStore((state) => state.isLoading);
  const isCreatingConversation = useChatStore((state) => state.isCreatingConversation);
  const error = useChatStore((state) => state.error);
  const retryCount = useChatStore((state) => state.retryCount);
  const lastFailedMessage = useChatStore((state) => state.lastFailedMessage);
  const input = useChatStore((state) => state.input);
  const sidebarOpen = useChatStore((state) => state.sidebarOpen);

  // Demo mode state
  const isDemoMode = useChatStore((state) => state.isDemoMode);
  const demoMessages = useChatStore((state) => state.demoMessages);
  const demoConversations = useChatStore((state) => state.demoConversations);

  // Basic actions
  const setCurrentConversation = useChatStore((state) => state.setCurrentConversation);
  const setLoading = useChatStore((state) => state.setLoading);
  const setCreatingConversation = useChatStore((state) => state.setCreatingConversation);
  const setError = useChatStore((state) => state.setError);
  const setInput = useChatStore((state) => state.setInput);
  const setSidebarOpen = useChatStore((state) => state.setSidebarOpen);
  
  // Demo mode actions
  const setDemoMode = useChatStore((state) => state.setDemoMode);
  const addDemoMessage = useChatStore((state) => state.addDemoMessage);
  const createDemoConversation = useChatStore((state) => state.createDemoConversation);
  const getDemoConversation = useChatStore((state) => state.getDemoConversation);
  const clearDemoData = useChatStore((state) => state.clearDemoData);

  // Combined actions
  const clearError = useChatStore((state) => state.clearError);
  const resetRetry = useChatStore((state) => state.resetRetry);
  const startMessageSend = useChatStore((state) => state.startMessageSend);
  const finishMessageSend = useChatStore((state) => state.finishMessageSend);
  const handleMessageError = useChatStore((state) => state.handleMessageError);

  // Computed selectors
  const isConversationReady = useIsConversationReady();
  const canSendMessage = useCanSendMessage();
  const shouldShowRetry = useShouldShowRetry();

  // UI state helpers
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Input helpers
  const updateInput = (value: string) => setInput(value);
  const clearInput = () => setInput('');

  // Error helpers
  const hasError = !!error;
  const displayError = error || '';

  return {
    // Basic state
    currentConversationId,
    isLoading,
    isCreatingConversation,
    error,
    retryCount,
    lastFailedMessage,
    input,
    sidebarOpen,

    // Demo mode state
    isDemoMode,
    demoMessages,
    demoConversations,

    // Computed state
    isConversationReady,
    canSendMessage,
    shouldShowRetry,

    // UI helpers
    hasError,
    displayError,

    // Basic actions
    setCurrentConversation,
    setLoading,
    setCreatingConversation,
    setError,
    updateInput,
    clearInput,
    toggleSidebar,
    setSidebarOpen,

    // Demo mode actions
    setDemoMode,
    addDemoMessage,
    createDemoConversation,
    getDemoConversation,
    clearDemoData,

    // Combined actions
    clearError,
    resetRetry,
    startMessageSend,
    finishMessageSend,
    handleMessageError,
  };
};