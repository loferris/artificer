import { useState, useCallback, useRef } from 'react';
import { trpc } from '../../lib/trpc/client';
import { clientLogger } from '../../utils/clientLogger';
import type { StreamEvent } from '../../server/services/orchestration/types';

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

interface OrchestrationState {
  stage: 'analyzing' | 'routing' | 'executing' | 'validating' | 'retrying' | 'complete' | 'idle';
  message: string;
  progress: number; // 0-1
  metadata?: {
    complexity?: number;
    category?: string;
    model?: string;
    cacheHit?: boolean;
    retryCount?: number;
    estimatedCost?: number;
  };
}

interface UseOrchestrationStreamingReturn {
  messages: StreamingMessage[];
  orchestrationState: OrchestrationState | null;
  isStreaming: boolean;
  sendMessage: (content: string, conversationId: string) => Promise<void>;
  error: string | null;
  cancelStream: () => void;
  clearMessages: () => void;
}

export const useOrchestrationStreaming = (): UseOrchestrationStreamingReturn => {
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  const [orchestrationState, setOrchestrationState] = useState<OrchestrationState | null>(null);
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
    setOrchestrationState(null);
  }, []);

  const sendMessage = useCallback(
    async (content: string, conversationId: string) => {
      if (isStreaming) {
        cancelStream();
      }

      setError(null);
      setIsStreaming(true);
      setOrchestrationState({
        stage: 'idle',
        message: 'Starting orchestration...',
        progress: 0,
      });

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
        // Make SSE request to orchestration endpoint
        const response = await fetch('/api/stream/orchestration', {
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
            // Handle SSE events
            if (line.startsWith('event: ')) {
              // Event type line (we might use this for routing different handlers)
              continue;
            }

            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                // Handle connection event
                if (data.type === 'connected') {
                  clientLogger.debug('Orchestration SSE connected', { conversationId }, 'OrchestrationStreaming');
                  continue;
                }

                // Handle error event
                if (data.type === 'error') {
                  setError(data.error || 'Orchestration failed');
                  setIsStreaming(false);
                  setOrchestrationState(null);
                  abortControllerRef.current = null;
                  return;
                }

                // Handle completed event
                if (data.type === 'completed') {
                  clientLogger.debug('Orchestration SSE completed', { conversationId }, 'OrchestrationStreaming');
                  setIsStreaming(false);
                  setOrchestrationState({
                    stage: 'complete',
                    message: '✅ Complete!',
                    progress: 1.0,
                  });
                  abortControllerRef.current = null;

                  // Invalidate related queries
                  utils.messages.getByConversation.invalidate({ conversationId });
                  utils.conversations.list.invalidate();
                  utils.usage.getSessionStats.invalidate();
                  continue;
                }

                // Handle progress events (StreamEvent format)
                if (data.type && data.message && data.progress !== undefined) {
                  const streamEvent = data as StreamEvent;

                  // Update orchestration state
                  const newState: OrchestrationState = {
                    stage: streamEvent.type as OrchestrationState['stage'],
                    message: streamEvent.message,
                    progress: streamEvent.progress,
                    metadata: {},
                  };

                  // Extract metadata
                  if (streamEvent.metadata?.analysis) {
                    newState.metadata!.complexity = streamEvent.metadata.analysis.complexity;
                    newState.metadata!.category = streamEvent.metadata.analysis.category;
                  }

                  if (streamEvent.metadata?.routingPlan) {
                    newState.metadata!.model = streamEvent.metadata.routingPlan.primaryModel;
                    newState.metadata!.estimatedCost = streamEvent.metadata.routingPlan.estimatedCost;

                    // Check if this is a cache hit (message will contain "cache")
                    if (streamEvent.message.toLowerCase().includes('cache')) {
                      newState.metadata!.cacheHit = true;
                    }
                  }

                  if (streamEvent.metadata?.model) {
                    newState.metadata!.model = streamEvent.metadata.model;
                  }

                  if (streamEvent.metadata?.retryCount !== undefined) {
                    newState.metadata!.retryCount = streamEvent.metadata.retryCount;
                  }

                  setOrchestrationState(newState);

                  // If we have content, update the message
                  if (streamEvent.metadata?.content) {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? {
                              ...msg,
                              content: streamEvent.metadata!.content || msg.content,
                              isComplete: streamEvent.metadata?.finished || false,
                            }
                          : msg
                      )
                    );
                  }

                  // Complete event
                  if (streamEvent.type === 'complete' && streamEvent.metadata?.content) {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? {
                              ...msg,
                              content: streamEvent.metadata!.content || msg.content,
                              isComplete: true,
                              model: streamEvent.metadata?.model || msg.model,
                            }
                          : msg
                      )
                    );

                    setIsStreaming(false);
                    setOrchestrationState({
                      stage: 'complete',
                      message: '✅ Complete!',
                      progress: 1.0,
                    });
                    abortControllerRef.current = null;

                    // Invalidate queries
                    utils.messages.getByConversation.invalidate({ conversationId });
                    utils.conversations.list.invalidate();
                    utils.usage.getSessionStats.invalidate();

                    clientLogger.debug('Orchestration stream finished', { conversationId }, 'OrchestrationStreaming');
                    break;
                  }
                }
              } catch (parseError) {
                clientLogger.error(
                  'Failed to parse SSE data',
                  parseError as Error,
                  { line },
                  'OrchestrationStreaming'
                );
              }
            }
          }
        }

        setIsStreaming(false);
        setOrchestrationState(null);
        abortControllerRef.current = null;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          clientLogger.debug('Orchestration stream aborted', { conversationId }, 'OrchestrationStreaming');
        } else {
          clientLogger.error(
            'Failed to stream orchestration',
            err as Error,
            {
              conversationId,
              content: content.substring(0, 100),
            },
            'OrchestrationStreaming'
          );
          setError(err.message || 'Failed to stream orchestration');
        }

        setIsStreaming(false);
        setOrchestrationState(null);
        abortControllerRef.current = null;

        // Remove the incomplete assistant message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
      }
    },
    [isStreaming, cancelStream, utils]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setOrchestrationState(null);
  }, []);

  return {
    messages,
    orchestrationState,
    isStreaming,
    sendMessage,
    error,
    cancelStream,
    clearMessages,
  };
};
