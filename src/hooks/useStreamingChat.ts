import { useState, useCallback, useRef } from 'react';
import { trpc } from '../lib/trpc/client';
import { clientLogger } from '../utils/clientLogger';

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
  const abortControllerRef = useRef<AbortController | null>(null);

  const utils = trpc.useUtils();

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string, conversationId: string) => {
      if (isStreaming) {
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

      // Create abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // Make SSE request
        const response = await fetch('/api/stream/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content, conversationId }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                // Handle different event types
                if (data.type === 'connected') {
                  clientLogger.debug('SSE connected', { conversationId }, 'StreamingChat');
                  continue;
                }

                if (data.type === 'error') {
                  setError(data.error || 'Streaming failed');
                  setIsStreaming(false);
                  abortControllerRef.current = null;
                  return;
                }

                if (data.type === 'completed') {
                  clientLogger.debug('SSE completed', { conversationId }, 'StreamingChat');
                  continue;
                }

                // Handle chunk data
                if (data.content !== undefined) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            content: msg.content + data.content,
                            isComplete: data.finished || false,
                            model: data.metadata?.model || msg.model,
                            cost: data.metadata?.cost || msg.cost,
                            tokens: data.metadata?.tokenCount || msg.tokens,
                          }
                        : msg
                    )
                  );

                  if (data.finished) {
                    setIsStreaming(false);
                    abortControllerRef.current = null;

                    // Invalidate related queries to update UI
                    utils.messages.getByConversation.invalidate({ conversationId });
                    utils.conversations.list.invalidate();
                    utils.usage.getSessionStats.invalidate();

                    clientLogger.debug('Stream finished', { conversationId }, 'StreamingChat');
                    break;
                  }
                }

                if (data.error) {
                  setError(data.error);
                  setIsStreaming(false);
                  abortControllerRef.current = null;
                  return;
                }
              } catch (parseError) {
                clientLogger.error(
                  'Failed to parse SSE data',
                  parseError as Error,
                  { line },
                  'StreamingChat'
                );
              }
            }
          }
        }

        setIsStreaming(false);
        abortControllerRef.current = null;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          clientLogger.debug('Stream aborted', { conversationId }, 'StreamingChat');
        } else {
          clientLogger.error(
            'Failed to stream message',
            err as Error,
            {
              conversationId,
              content: content.substring(0, 100),
            },
            'StreamingChat'
          );
          setError(err.message || 'Failed to stream message');
        }

        setIsStreaming(false);
        abortControllerRef.current = null;

        // Remove the incomplete assistant message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
      }
    },
    [isStreaming, cancelStream, utils]
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
