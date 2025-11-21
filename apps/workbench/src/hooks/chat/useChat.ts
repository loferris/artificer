import { useCallback, useEffect, useState, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { trpc } from '../../lib/trpc/client';
import { useExportManager } from '../../components/ExportManager';
import { useStreamingChat } from '../useStreamingChat';
import { useOrchestrationStreaming } from './useOrchestrationStreaming';
import { clientLogger } from '../../utils/clientLogger';
import type { Message } from '../../types';

/**
 * A comprehensive hook for managing chat functionality.
 *
 * This hook orchestrates the entire chat experience, integrating state management (via Zustand),
 * API communication (via tRPC), and user interaction logic. It handles conversations,
 * messages, streaming, orchestration, and exporting.
 *
 * @returns An object containing all the necessary state and handlers for the chat UI.
 */
export function useChat() {
  const store = useChatStore();

  // Check if orchestration is enabled (from env var)
  const orchestrationEnabled =
    typeof window !== 'undefined' &&
    (process.env.NEXT_PUBLIC_CHAIN_ROUTING_ENABLED !== 'false');

  // Orchestration mode state (can be toggled by user in future)
  const [useOrchestration, setUseOrchestration] = useState(orchestrationEnabled);

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
  const orchestrationStreaming = useOrchestrationStreaming();

  // Refs for stable callback references
  const messagesQueryRef = useRef(messagesQuery);
  const storeRef = useRef(store);
  const handleStreamingMessageRef = useRef<((content: string, conversationId: string | null) => Promise<void>) | null>(null);

  // Keep refs updated
  useEffect(() => {
    messagesQueryRef.current = messagesQuery;
    storeRef.current = store;
  });

  // Effects to sync tRPC data with the store
  useEffect(() => {
    if (messagesQuery.data) {
      store.setMessages(messagesQuery.data);
    }
  }, [messagesQuery.data, store.setMessages]);

  const exportManager = useExportManager({
    currentConversationId: store.currentConversationId,
  });

  /**
   * Decide whether to use orchestration based on message content
   * This heuristic looks for complexity indicators
   */
  const shouldUseOrchestration = useCallback((content: string): boolean => {
    if (!useOrchestration || !orchestrationEnabled) {
      return false;
    }

    // Heuristics for orchestration:
    // 1. Long messages (>200 chars) likely need more planning
    // 2. Code/technical keywords suggest complexity
    // 3. Analysis/comparison keywords suggest multi-step thinking

    const isLong = content.length > 200;

    const codeKeywords = /\b(write|create|implement|build|design|refactor|optimize|debug)\b/i;
    const analysisKeywords = /\b(explain|analyze|compare|evaluate|assess|review)\b/i;
    const complexKeywords = /\b(architecture|system|algorithm|strategy|approach)\b/i;

    const hasCodeKeywords = codeKeywords.test(content);
    const hasAnalysisKeywords = analysisKeywords.test(content);
    const hasComplexKeywords = complexKeywords.test(content);

    // Use orchestration if message is long OR has complexity indicators
    return isLong || hasCodeKeywords || hasAnalysisKeywords || hasComplexKeywords;
  }, [useOrchestration, orchestrationEnabled]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      const currentStore = storeRef.current;
      clientLogger.debug(
        'handleSendMessage called',
        { content, streamingMode: currentStore.streamingMode, conversationId: currentStore.currentConversationId },
        'useChat'
      );

      if (currentStore.streamingMode) {
        handleStreamingMessageRef.current?.(content, currentStore.currentConversationId);
      } else {
        try {
          if (!currentStore.currentConversationId) {
            clientLogger.debug('Creating new conversation', {}, 'useChat');
            const newConversation = await createConversationMutation.mutateAsync({
              projectId: currentStore.currentProjectId || undefined,
            });
            if (newConversation?.id) {
              clientLogger.debug('New conversation created', { conversationId: newConversation.id }, 'useChat');
              currentStore.setCurrentConversation(newConversation.id);
              await sendMessageMutation.mutateAsync({ content, conversationId: newConversation.id });
              messagesQueryRef.current.refetch();
              currentStore.setInput('');
              clientLogger.debug('Message sent to new conversation', {}, 'useChat');
            }
          } else {
            clientLogger.debug('Sending to existing conversation', { conversationId: currentStore.currentConversationId }, 'useChat');
            await sendMessageMutation.mutateAsync({ content, conversationId: currentStore.currentConversationId });
            messagesQueryRef.current.refetch();
            currentStore.setInput('');
            clientLogger.debug('Message sent to existing conversation', {}, 'useChat');
          }
        } catch (error) {
          clientLogger.error('Error in handleSendMessage', error as Error, {}, 'useChat');
        }
      }
    },
    [createConversationMutation, sendMessageMutation]
  );

  const handleMessageSubmit = useCallback(
    async (content: string) => {
      clientLogger.debug('handleMessageSubmit called', { content }, 'useChat');
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        clientLogger.debug('Empty content, skipping', {}, 'useChat');
        return;
      }

      await handleSendMessage(trimmedContent);
    },
    [handleSendMessage]
  );

  const handleStreamingMessage = useCallback(
    async (content: string, conversationId: string | null): Promise<void> => {
      const currentStore = storeRef.current;
      // Decide which streaming method to use
      const useOrch = shouldUseOrchestration(content);

      clientLogger.debug(
        'handleStreamingMessage',
        { useOrchestration: useOrch, contentLength: content.length },
        'useChat'
      );

      if (!conversationId) {
        try {
          const newConversation = await createConversationMutation.mutateAsync({
            projectId: currentStore.currentProjectId || undefined,
          });
          if (newConversation?.id) {
            currentStore.setCurrentConversation(newConversation.id);
            setTimeout(async () => {
              try {
                if (useOrch) {
                  await orchestrationStreaming.sendMessage(content, newConversation.id);
                } else {
                  await streamingChat.sendMessage(content, newConversation.id);
                }
                currentStore.setInput('');
                currentStore.setStreamingError(null);
              } catch (error) {
                clientLogger.error(
                  'Failed to stream first message',
                  error as Error,
                  { content: content.substring(0, 100), conversationId: newConversation.id },
                  'StreamingManager'
                );
                currentStore.setStreamingError((error as Error).message);
              }
            }, 100);
          }
        } catch (error) {
          clientLogger.error(
            'Failed to create conversation for streaming',
            error as Error,
            { content: content.substring(0, 100) },
            'StreamingManager'
          );
          currentStore.setStreamingError('Failed to create conversation for streaming');
        }
        return;
      }

      try {
        if (useOrch) {
          await orchestrationStreaming.sendMessage(content, conversationId);
        } else {
          await streamingChat.sendMessage(content, conversationId);
        }
        currentStore.setInput('');
        currentStore.setStreamingError(null);
      } catch (error) {
        clientLogger.error(
          'Failed to send streaming message',
          error as Error,
          { content: content.substring(0, 100), conversationId },
          'StreamingManager'
        );
        currentStore.setStreamingError((error as Error).message);
      }
    },
    [
      createConversationMutation,
      streamingChat,
      orchestrationStreaming,
      shouldUseOrchestration,
    ]
  );

  // Update ref after callback is defined
  useEffect(() => {
    handleStreamingMessageRef.current = handleStreamingMessage;
  }, [handleStreamingMessage]);

  const combinedMessages = useCallback((): Message[] => {
    if (!store.streamingMode) {
      return store.currentConversationId ? store.messages : store.localMessages;
    }

    // In streaming mode, combine messages from both streaming sources
    const baseMessages = store.currentConversationId ? store.messages : store.localMessages;

    // Check which streaming source has messages
    const activeStreamingMessages =
      orchestrationStreaming.messages.length > 0
        ? orchestrationStreaming.messages
        : streamingChat.messages;

    if (activeStreamingMessages.length > 0) {
      const deduplicatedStreamingMessages = activeStreamingMessages.filter(
        (streamMsg) => !baseMessages.some((baseMsg) => baseMsg.id === streamMsg.id)
      );

      return [...baseMessages, ...deduplicatedStreamingMessages];
    }

    // Fallback to base messages
    return baseMessages;
  }, [
    store.streamingMode,
    store.currentConversationId,
    store.messages,
    store.localMessages,
    streamingChat.messages,
    orchestrationStreaming.messages,
  ]);

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
    orchestrationState: orchestrationStreaming.orchestrationState,
    orchestrationEnabled: useOrchestration,
    setOrchestrationEnabled: setUseOrchestration,
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
