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
      utils.conversations.list.invalidate();
      // Manually insert the new conversation into the cache
      utils.messages.getByConversation.setData({ conversationId: data.id }, data.messages);
      setCurrentConversation(data.id);
      setCreatingConversation(false);
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

  

  const handleNewConversation = (callbacks?: { onSuccess?: (data: any) => void; onError?: (error: any) => void; }) => {
    setInput('');
    clearError();

    if (isStaticDemo) {
      // Simplified demo handling for now
      demoAPI.createConversation().then(callbacks?.onSuccess).catch(callbacks?.onError);
      return;
    }

    createConversationMutation.mutate(undefined, {
      onSuccess: callbacks?.onSuccess,
      onError: callbacks?.onError,
    });
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
    createConversationMutation,
    isCreating: createConversationMutation.isPending,
    isDeleting: deleteConversationMutation.isPending,
  };
};
