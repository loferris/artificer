import { useCallback, useEffect, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { trpc } from '../../lib/trpc/client';
import { useExportManager } from '../../components/ExportManager';
import { useStreamingChat } from '../useStreamingChat';
import { clientLogger } from '../../utils/clientLogger';
import type { Message } from '../../types';
import { useCommandProcessor } from './useCommandProcessor';

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
  const [invalidAttempts, setInvalidAttempts] = useState(0);

  // Selectively subscribe to store values and methods
  const currentConversationId = useChatStore((state) => state.currentConversationId);
  const streamingMode = useChatStore((state) => state.streamingMode);
  const selectableConversations = useChatStore((state) => state.selectableConversations);
  const messages = useChatStore((state) => state.messages);
  const localMessages = useChatStore((state) => state.localMessages);
  const input = useChatStore((state) => state.input);

  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);
  const addLocalMessage = useChatStore((state) => state.addLocalMessage);
  const setCurrentConversation = useChatStore((state) => state.setCurrentConversation);
  const setSelectableConversations = useChatStore((state) => state.setSelectableConversations);
  const setInput = useChatStore((state) => state.setInput);
  const setStreamingError = useChatStore((state) => state.setStreamingError);

  // Get the entire store for the return value
  const store = useChatStore();

  // tRPC queries and mutations
  const conversationsQuery = trpc.conversations.list.useQuery();
  const messagesQuery = trpc.messages.getByConversation.useQuery(
    { conversationId: currentConversationId || '' },
    {
      enabled: !!currentConversationId,
      refetchOnWindowFocus: false,
    },
  );
  const createConversationMutation = trpc.conversations.create.useMutation();
  const deleteConversationMutation = trpc.conversations.delete.useMutation();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  const streamingChat = useStreamingChat();
  const { processCommand } = useCommandProcessor();

  // Effects to sync tRPC data with the store
  useEffect(() => {
    if (messagesQuery.data) {
      setMessages(messagesQuery.data);
    }
  }, [messagesQuery.data, setMessages]);

  const displayMessage = useCallback(
    (content: string) => {
      const localMessage: Message = {
        id: `local-cmd-${Date.now()}`,
        role: 'assistant',
        content: content.trim(),
        timestamp: new Date(),
      };

      if (!currentConversationId) {
        addLocalMessage(localMessage);
      } else {
        addMessage(localMessage);
      }
    },
    [currentConversationId, addLocalMessage, addMessage],
  );

  const exportManager = useExportManager({
    currentConversationId: currentConversationId,
    onStatusMessage: displayMessage,
  });

  const handleConversationSelect = useCallback(
    (index: number) => {
      const conversation = selectableConversations[index];
      if (conversation) {
        setCurrentConversation(conversation.id);
        displayMessage(`Switched to: ${conversation.title || 'Untitled conversation'}`);
        setSelectableConversations([]);
        setInvalidAttempts(0);
      }
    },
    [selectableConversations, setCurrentConversation, displayMessage, setSelectableConversations],
  );

  const handleStreamingMessage = useCallback(
    async (content: string, conversationId: string | null): Promise<void> => {
      if (!conversationId) {
        try {
          const newConversation = await createConversationMutation.mutateAsync({});
          if (newConversation?.id) {
            setCurrentConversation(newConversation.id);
            setTimeout(async () => {
              try {
                await streamingChat.sendMessage(content, newConversation.id);
                setInput('');
                setStreamingError(null);
              } catch (error) {
                clientLogger.error(
                  'Failed to stream first message',
                  error as Error,
                  { content: content.substring(0, 100), conversationId: newConversation.id },
                  'StreamingManager',
                );
                setStreamingError((error as Error).message);
              }
            }, 100);
          }
        } catch (error) {
          clientLogger.error(
            'Failed to create conversation for streaming',
            error as Error,
            { content: content.substring(0, 100) },
            'StreamingManager',
          );
          setStreamingError('Failed to create conversation for streaming');
        }
        return;
      }

      try {
        await streamingChat.sendMessage(content, conversationId);
        setInput('');
        setStreamingError(null);
      } catch (error) {
        clientLogger.error(
          'Failed to send streaming message',
          error as Error,
          { content: content.substring(0, 100), conversationId },
          'StreamingManager',
        );
        setStreamingError((error as Error).message);
      }
    },
    [createConversationMutation, streamingChat, setCurrentConversation, setInput, setStreamingError],
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      console.log('🚀 handleSendMessage called:', {
        content,
        streamingMode: streamingMode,
        conversationId: currentConversationId,
      });

      if (streamingMode) {
        handleStreamingMessage(content, currentConversationId);
      } else {
        try {
          if (!currentConversationId) {
            console.log('📝 Creating new conversation...');
            const newConversation = await createConversationMutation.mutateAsync({});
            if (newConversation?.id) {
              console.log('✅ New conversation created:', newConversation.id);
              setCurrentConversation(newConversation.id);
              await sendMessageMutation.mutateAsync({
                content,
                conversationId: newConversation.id,
              });
              messagesQuery.refetch();
              setInput('');
              console.log('✅ Message sent to new conversation');
            }
          } else {
            console.log('📤 Sending to existing conversation:', currentConversationId);
            await sendMessageMutation.mutateAsync({
              content,
              conversationId: currentConversationId,
            });
            messagesQuery.refetch();
            setInput('');
            console.log('✅ Message sent to existing conversation');
          }
        } catch (error) {
          console.error('❌ Error in handleSendMessage:', error);
        }
      }
    },
    [
      streamingMode,
      currentConversationId,
      createConversationMutation,
      setCurrentConversation,
      sendMessageMutation,
      messagesQuery,
      setInput,
      handleStreamingMessage,
    ],
  );

  const handleMessageSubmit = useCallback(
    async (content: string) => {
      console.log('📨 handleMessageSubmit called:', { content });
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        console.log('❌ Empty content, returning');
        return;
      }

      if (trimmedContent.startsWith('/')) {
        const processed = processCommand(trimmedContent);
        if (processed) {
          setInput(''); // Clear the input after processing command
          return;
        }
      }

      if (selectableConversations.length > 0) {
        const num = parseInt(trimmedContent);
        if (!isNaN(num) && num > 0 && num <= selectableConversations.length) {
          handleConversationSelect(num - 1);
          return;
        } else if (/^\d+$/.test(trimmedContent)) {
          setInvalidAttempts((prev) => prev + 1);
          const maxAttempts = 3;

          if (invalidAttempts + 1 >= maxAttempts) {
            displayMessage('Too many invalid attempts. Clearing conversation list.');
            setSelectableConversations([]);
            setInvalidAttempts(0);
          } else {
            displayMessage(
              `Invalid selection. Please choose a number between 1 and ${selectableConversations.length}.`,
            );
          }
          return;
        }
      }

      await handleSendMessage(trimmedContent);

      if (selectableConversations.length > 0) {
        setSelectableConversations([]);
        setInvalidAttempts(0);
      }
    },
    [
      processCommand,
      selectableConversations,
      invalidAttempts,
      handleConversationSelect,
      handleSendMessage,
      displayMessage,
      setSelectableConversations,
      setInput,
    ],
  );

  const combinedMessages = useCallback((): Message[] => {
    if (!streamingMode) {
      return currentConversationId ? messages : localMessages;
    }

    // In streaming mode, prioritize streaming messages
    if (streamingChat.messages.length > 0) {
      const baseMessages = currentConversationId ? messages : localMessages;
      const deduplicatedStreamingMessages = streamingChat.messages.filter(
        (streamMsg) => !baseMessages.some((baseMsg) => baseMsg.id === streamMsg.id),
      );

      return [...baseMessages, ...deduplicatedStreamingMessages];
    }

    // Fallback to base messages
    return currentConversationId ? messages : localMessages;
  }, [streamingMode, currentConversationId, messages, localMessages, streamingChat.messages]);

  const handleNewConversation = async () => {
    const newConversation = await createConversationMutation.mutateAsync({});
    if (newConversation?.id) {
      setCurrentConversation(newConversation.id);
      conversationsQuery.refetch();
    }
  };

  return {
    ...store,
    conversations: conversationsQuery.data || [],
    conversationsLoading: conversationsQuery.isLoading,
    conversationsError: conversationsQuery.error
      ? new Error(conversationsQuery.error.message)
      : null,
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
