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
  const store = useChatStore();
  const [invalidAttempts, setInvalidAttempts] = useState(0);

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
  const { processCommand } = useCommandProcessor();

  // Effects to sync tRPC data with the store
  useEffect(() => {
    if (messagesQuery.data) {
      store.setMessages(messagesQuery.data);
    }
  }, [messagesQuery.data, store.setMessages]);

  const displayMessage = useCallback((content: string) => {
    const localMessage: Message = {
      id: `local-cmd-${Date.now()}`,
      role: 'assistant',
      content: content.trim(),
      timestamp: new Date(),
    };

    if (!store.currentConversationId) {
      store.addLocalMessage(localMessage);
    } else {
        store.addMessage(localMessage);
    }
  }, [store.currentConversationId, store.addLocalMessage, store.addMessage]);

  const exportManager = useExportManager({
    currentConversationId: store.currentConversationId,
    onStatusMessage: displayMessage,
  });

  const handleConversationSelect = useCallback((index: number) => {
    const conversation = store.selectableConversations[index];
    if (conversation) {
      store.setCurrentConversation(conversation.id);
      displayMessage(`Switched to: ${conversation.title || 'Untitled conversation'}`);
      store.setSelectableConversations([]);
      setInvalidAttempts(0);
    }
  }, [store.selectableConversations, store.setCurrentConversation, displayMessage, store.setSelectableConversations]);

  const handleSendMessage = useCallback(async (content: string) => {
    console.log('🚀 handleSendMessage called:', { content, streamingMode: store.streamingMode, conversationId: store.currentConversationId });
    
    if (store.streamingMode) {
        handleStreamingMessage(content, store.currentConversationId);
    } else {
        try {
            if (!store.currentConversationId) {
                console.log('📝 Creating new conversation...');
                const newConversation = await createConversationMutation.mutateAsync({});
                if (newConversation?.id) {
                    console.log('✅ New conversation created:', newConversation.id);
                    store.setCurrentConversation(newConversation.id);
                    await sendMessageMutation.mutateAsync({ content, conversationId: newConversation.id });
                    messagesQuery.refetch();
                    store.setInput('');
                    console.log('✅ Message sent to new conversation');
                }
            } else {
                console.log('📤 Sending to existing conversation:', store.currentConversationId);
                await sendMessageMutation.mutateAsync({ content, conversationId: store.currentConversationId });
                messagesQuery.refetch();
                store.setInput('');
                console.log('✅ Message sent to existing conversation');
            }
        } catch (error) {
            console.error('❌ Error in handleSendMessage:', error);
        }
    }
  }, [store.streamingMode, store.currentConversationId, createConversationMutation, store.setCurrentConversation, sendMessageMutation]);

  const handleMessageSubmit = useCallback(async (content: string) => {
    console.log('📨 handleMessageSubmit called:', { content });
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      console.log('❌ Empty content, returning');
      return;
    }

    if (trimmedContent.startsWith('/')) {
      const processed = processCommand(trimmedContent);
      if (processed) {
        store.setInput(''); // Clear the input after processing command
        return;
      }
    }

    if (store.selectableConversations.length > 0) {
      const num = parseInt(trimmedContent);
      if (!isNaN(num) && num > 0 && num <= store.selectableConversations.length) {
        handleConversationSelect(num - 1);
        return;
      } else if (/^\d+$/.test(trimmedContent)) {
        setInvalidAttempts(prev => prev + 1);
        const maxAttempts = 3;
        
        if (invalidAttempts + 1 >= maxAttempts) {
          displayMessage('Too many invalid attempts. Clearing conversation list.');
          store.setSelectableConversations([]);
          setInvalidAttempts(0);
        } else {
          displayMessage(`Invalid selection. Please choose a number between 1 and ${store.selectableConversations.length}.`);
        }
        return;
      }
    }

    await handleSendMessage(trimmedContent);

    if (store.selectableConversations.length > 0) {
      store.setSelectableConversations([]);
      setInvalidAttempts(0);
    }
  }, [
    processCommand,
    store.selectableConversations,
    invalidAttempts,
    handleConversationSelect,
    handleSendMessage,
    displayMessage,
    store.setSelectableConversations,
  ]);

  const handleStreamingMessage = useCallback(async (content: string, conversationId: string | null): Promise<void> => {
    if (!conversationId) {
      try {
        const newConversation = await createConversationMutation.mutateAsync({});
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
    const newConversation = await createConversationMutation.mutateAsync({});
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
