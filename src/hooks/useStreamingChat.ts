import { useState, useCallback, useRef } from 'react';
import { trpc } from '../lib/trpc/client';
import { clientLogger } from '../utils/clientLogger';
import type { ChatStreamChunk } from '../server/services/chat/ChatService';

interface StreamingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isComplete: boolean;
  timestamp: Date;
  model?: string;
  cost?: number;
  tokens?: number;
}

interface UseStreamingChatReturn {
  messages: StreamingMessage[];
  isStreaming: boolean;
  sendMessage: (content: string, conversationId: string) => Promise<void>;
  error: string | null;
  cancelStream: () => void;
  clearMessages: () => void;
}

export const useStreamingChat = (): UseStreamingChatReturn => {
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentStreamRef = useRef<{ unsubscribe?: () => void } | null>(null);

  const utils = trpc.useUtils();

  const cancelStream = useCallback(() => {
    if (currentStreamRef.current?.unsubscribe) {
      currentStreamRef.current.unsubscribe();
      currentStreamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string, conversationId: string) => {
      // Debug: useStreamingChat.sendMessage called

      if (isStreaming) {
        // Debug: Cancelling existing stream
        cancelStream();
      }

      setError(null);
      setIsStreaming(true);

      // Add user message immediately
      const userMessage: StreamingMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        isComplete: true,
        timestamp: new Date(),
      };

      // DEBUG:('👤 Adding user message to stream');
      setMessages((prev) => [...prev, userMessage]);

      // Create streaming assistant message
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: StreamingMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        isComplete: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // DEBUG:('📡 Starting tRPC subscription:', { content, conversationId });
        // Use vanilla client to create subscription
        const client = utils.client;

        const subscription = client.subscriptions.chatStream.subscribe(
          { content, conversationId },
          {
            onData: (chunk: ChatStreamChunk) => {
              // DEBUG:('📦 Received chunk:', { content: chunk.content, finished: chunk.finished });

              if (chunk.error) {
                setError(chunk.error);
                setIsStreaming(false);
                return;
              }

              // Update the streaming message
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: msg.content + chunk.content,
                        isComplete: chunk.finished,
                        model: chunk.metadata?.model || msg.model,
                        cost: chunk.metadata?.cost || msg.cost,
                        tokens: chunk.metadata?.tokenCount || msg.tokens,
                      }
                    : msg,
                ),
              );

              if (chunk.finished) {
                setIsStreaming(false);
                currentStreamRef.current = null;

                // Invalidate related queries to update UI
                utils.messages.getByConversation.invalidate({ conversationId });
                utils.conversations.list.invalidate();
                utils.usage.getSessionStats.invalidate();
              }
            },
            onError: (err) => {
              clientLogger.error(
                'Streaming error',
                err as Error,
                {
                  conversationId,
                  content: content.substring(0, 100),
                },
                'StreamingChat',
              );
              setError(err.message || 'Streaming failed');
              setIsStreaming(false);
              currentStreamRef.current = null;
            },
          },
        );

        currentStreamRef.current = { unsubscribe: subscription.unsubscribe };
      } catch (err: any) {
        clientLogger.error(
          'Failed to start streaming',
          err as Error,
          {
            conversationId,
            content: content.substring(0, 100),
          },
          'StreamingChat',
        );
        setError(err.message || 'Failed to start streaming');
        setIsStreaming(false);

        // Remove the incomplete assistant message
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
      }
    },
    [isStreaming, cancelStream, utils],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    error,
    cancelStream,
    clearMessages,
  };
};
