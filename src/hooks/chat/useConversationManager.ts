import { useEffect } from 'react';
import { trpc } from '../../lib/trpc/client';
import { useChatStore } from '../../stores/chatStore';
import { useStaticDemo } from '../useStaticDemo';

export const useConversationManager = () => {
  const { isDemoMode: isStaticDemo, demoAPI } = useStaticDemo();

  // Store state and actions
  const {
    currentConversationId,
    isCreatingConversation,
    isDemoMode,
    demoConversations,
    setCurrentConversation,
    setCreatingConversation,
    setError,
    setInput,
    clearError,
    setDemoMode,
  } = useChatStore();

  // tRPC hooks
  const utils = trpc.useUtils();

  // Get conversations with better error handling
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    error: conversationsError,
  } = trpc.conversations.list.useQuery(undefined, {
    enabled: !isStaticDemo, // Disable when in static demo mode
    retry: 1, // Only retry once
    retryDelay: 1000,
  });

  // Use demo conversations from store when in static demo mode
  const displayConversations = isStaticDemo
    ? Array.from(demoConversations.values())
    : conversations;

  // Create conversation mutation with fallback
  const createConversationMutation = trpc.conversations.create.useMutation({
    onMutate: () => {
      setCreatingConversation(true);
      clearError();
    },
    onSuccess: (data) => {
      setCurrentConversation(data.id);
      setCreatingConversation(false);
      utils.conversations.list.invalidate();
    },
    onError: (error) => {
      console.error('Failed to create conversation:', error);

      // Fallback: create a local conversation ID for demo mode
      if (
        error?.data?.code === 'INTERNAL_SERVER_ERROR' ||
        error?.message?.includes('JSON.parse') ||
        error?.message?.includes('405')
      ) {
        console.log('Using fallback conversation creation for demo mode');
        const fallbackId = `demo-${Date.now()}`;
        setCurrentConversation(fallbackId);
        setCreatingConversation(false);
        return;
      }

      setError('Failed to create conversation. Please try again.');
      setCreatingConversation(false);
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = trpc.conversations.delete.useMutation({
    onSuccess: () => {
      clearError();
      utils.conversations.list.invalidate();
      if (currentConversationId === displayConversations[0]?.id) {
        const nextConversation = displayConversations.find(
          (c: any) => c.id !== currentConversationId,
        );
        setCurrentConversation(nextConversation?.id || null);
      }
    },
    onError: (error) => {
      console.error('Failed to delete conversation:', error);
      setError('Failed to delete conversation. Please try again.');
    },
  });

  // Auto-create first conversation on app load
  useEffect(() => {
    // Only try to create if we don't have a conversation and aren't creating one
    if (
      !currentConversationId &&
      !isCreatingConversation &&
      displayConversations.length === 0 &&
      !createConversationMutation.isPending
    ) {
      console.log('Attempting to create conversation');
      createConversationMutation.mutate();
    }
    // Set current conversation if we have conversations but no current one
    else if (
      !currentConversationId &&
      !isCreatingConversation &&
      displayConversations.length > 0 &&
      !createConversationMutation.isPending
    ) {
      console.log('Setting current conversation to first conversation');
      setCurrentConversation(displayConversations[0].id);
    }
  }, [
    displayConversations,
    currentConversationId,
    isCreatingConversation,
    createConversationMutation.isPending,
  ]);

  const handleNewConversation = async () => {
    setInput('');
    clearError();

    // Use static demo API if in demo mode
    if (isStaticDemo) {
      try {
        setCreatingConversation(true);
        await demoAPI.createConversation();
        setCreatingConversation(false);
      } catch (error) {
        setCreatingConversation(false);
        setError('Failed to create demo conversation.');
      }
      return;
    }

    createConversationMutation.mutate();
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversation(conversationId);
    setInput('');
    clearError();
  };

  const handleDeleteConversation = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      deleteConversationMutation.mutate(conversationId);
    }
  };

  const refreshConversations = () => {
    utils.conversations.list.invalidate();
  };

  return {
    // Data
    conversations: displayConversations,
    currentConversationId,

    // Loading states
    conversationsLoading,
    isCreatingConversation,

    // Errors
    conversationsError,

    // Actions
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation,
    refreshConversations,

    // Mutation states
    isCreating: createConversationMutation.isPending,
    isDeleting: deleteConversationMutation.isPending,
  };
};
