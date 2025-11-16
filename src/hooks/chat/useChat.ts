import { useCallback, useEffect, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { trpc } from '../../lib/trpc/client';
import { useExportManager } from '../../components/ExportManager';
import { useStreamingChat } from '../useStreamingChat';
import { clientLogger } from '../../utils/clientLogger';
import type { Message } from '../../types';

/**
 * A comprehensive hook for managing chat functionality.
 *
 * This hook orchestrates the entire chat experience, integrating state management (via Zustand),
 * API communication (via tRPC), and user interaction logic. It handles conversations,
 * messages, streaming, command processing, and exporting.
 *
 * @returns An object containing all the necessary state and handlers for the chat UI.
 */
export function useChat() {
  const store = useChatStore();

  // tRPC queries and mutations
  const conversationsQuery = trpc.conversations.list.useQuery();
  const messagesQuery = trpc.messages.getByConversation.useQuery(
    { conversationId: store.currentConversationId || '' },
    {
      enabled: !!store.currentConversationId,
      refetchOnWindowFocus: false,
    }
  );
  const createConversationMutation = trpc.conversations.create.useMutation();
  const deleteConversationMutation = trpc.conversations.delete.useMutation();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  const streamingChat = useStreamingChat();

  // Effects to sync tRPC data with the store
  useEffect(() => {
    if (messagesQuery.data) {
      store.setMessages(messagesQuery.data);
    }
  }, [messagesQuery.data, store.setMessages]);

  const exportManager = useExportManager({
    currentConversationId: store.currentConversationId,
  });

  const handleSendMessage = useCallback(async (content: string) => {
    clientLogger.debug('handleSendMessage called', { content, streamingMode: store.streamingMode, conversationId: store.currentConversationId }, 'useChat');

    if (store.streamingMode) {
        handleStreamingMessage(content, store.currentConversationId);
    } else {
        try {
            if (!store.currentConversationId) {
                clientLogger.debug('Creating new conversation', {}, 'useChat');
                const newConversation = await createConversationMutation.mutateAsync({
                    projectId: store.currentProjectId || undefined,
                });
                if (newConversation?.id) {
                    clientLogger.debug('New conversation created', { conversationId: newConversation.id }, 'useChat');
                    store.setCurrentConversation(newConversation.id);
                    await sendMessageMutation.mutateAsync({ content, conversationId: newConversation.id });
                    messagesQuery.refetch();
                    store.setInput('');
                    clientLogger.debug('Message sent to new conversation', {}, 'useChat');
                }
            } else {
                clientLogger.debug('Sending to existing conversation', { conversationId: store.currentConversationId }, 'useChat');
                await sendMessageMutation.mutateAsync({ content, conversationId: store.currentConversationId });
                messagesQuery.refetch();
                store.setInput('');
                clientLogger.debug('Message sent to existing conversation', {}, 'useChat');
            }
        } catch (error) {
            clientLogger.error('Error in handleSendMessage', error as Error, {}, 'useChat');
        }
    }
  }, [store.streamingMode, store.currentConversationId, createConversationMutation, store.setCurrentConversation, sendMessageMutation]);

  const handleMessageSubmit = useCallback(async (content: string) => {
    clientLogger.debug('handleMessageSubmit called', { content }, 'useChat');
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      clientLogger.debug('Empty content, skipping', {}, 'useChat');
      return;
    }

    await handleSendMessage(trimmedContent);
  }, [handleSendMessage]);

  const handleStreamingMessage = useCallback(async (content: string, conversationId: string | null): Promise<void> => {
    if (!conversationId) {
      try {
        const newConversation = await createConversationMutation.mutateAsync({
          projectId: store.currentProjectId || undefined,
        });
        if (newConversation?.id) {
          store.setCurrentConversation(newConversation.id);
          setTimeout(async () => {
            try {
              await streamingChat.sendMessage(content, newConversation.id);
              store.setInput('');
              store.setStreamingError(null);
            } catch (error) {
              clientLogger.error('Failed to stream first message', error as Error, { content: content.substring(0, 100), conversationId: newConversation.id }, 'StreamingManager');
              store.setStreamingError((error as Error).message);
            }
          }, 100);
        }
      } catch (error) {
        clientLogger.error('Failed to create conversation for streaming', error as Error, { content: content.substring(0, 100) }, 'StreamingManager');
        store.setStreamingError('Failed to create conversation for streaming');
      }
      return;
    }
    
    try {
      await streamingChat.sendMessage(content, conversationId);
      store.setInput('');
      store.setStreamingError(null);
    } catch (error) {
      clientLogger.error('Failed to send streaming message', error as Error, { content: content.substring(0, 100), conversationId }, 'StreamingManager');
      store.setStreamingError((error as Error).message);
    }
  }, [createConversationMutation, streamingChat, store.setCurrentConversation, store.setInput, store.setStreamingError]);

  const combinedMessages = useCallback((): Message[] => {
    if (!store.streamingMode) {
      return store.currentConversationId ? store.messages : store.localMessages;
    }

    // In streaming mode, prioritize streaming messages
    if (streamingChat.messages.length > 0) {
      const baseMessages = store.currentConversationId ? store.messages : store.localMessages;
      const deduplicatedStreamingMessages = streamingChat.messages.filter(streamMsg => 
        !baseMessages.some(baseMsg => baseMsg.id === streamMsg.id)
      );
      
      return [
        ...baseMessages,
        ...deduplicatedStreamingMessages
      ];
    }
    
    // Fallback to base messages
    return store.currentConversationId ? store.messages : store.localMessages;
  }, [store.streamingMode, store.currentConversationId, store.messages, store.localMessages, streamingChat.messages]);

  const handleNewConversation = async () => {
    const newConversation = await createConversationMutation.mutateAsync({
      projectId: store.currentProjectId || undefined,
    });
    if (newConversation?.id) {
        store.setCurrentConversation(newConversation.id);
        conversationsQuery.refetch();
    }
  };

  return {
    ...store,
    conversations: conversationsQuery.data || [],
    conversationsLoading: conversationsQuery.isLoading,
    conversationsError: conversationsQuery.error ? new Error(conversationsQuery.error.message) : null,
    refreshConversations: conversationsQuery.refetch,
    messagesLoading: messagesQuery.isLoading,
    messagesError: messagesQuery.error ? new Error(messagesQuery.error.message) : null,
    combinedMessages: combinedMessages(),
    handleMessageSubmit,
    handleDeleteConversation: async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await deleteConversationMutation.mutateAsync(id);
        conversationsQuery.refetch();
    },
    handleNewConversation,
    onExportAll: exportManager.exportAll,
    onExportCurrent: exportManager.exportCurrent,
  };
}
