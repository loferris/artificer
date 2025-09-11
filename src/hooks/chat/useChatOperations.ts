import { useRef, startTransition } from 'react';
import { trpc } from '../../lib/trpc/client';
import { useChatStore } from '../../stores/chatStore';
import { useStaticDemo } from '../useStaticDemo';
import type { Message } from '../../types';

export const useChatOperations = () => {
  const currentRequestRef = useRef<AbortController | null>(null);
  const { isDemoMode: isStaticDemo, demoAPI } = useStaticDemo();

  // Store actions
  const {
    currentConversationId,
    isLoading,
    input,
    lastFailedMessage,
    isDemoMode,
    startMessageSend,
    finishMessageSend,
    handleMessageError,
    setDemoMode,
    setCurrentConversation,
    addDemoMessage,
    resetRetry,
  } = useChatStore();

  // tRPC hooks
  const utils = trpc.useUtils();
  const refetchMessages = trpc.messages.getByConversation.useQuery(
    { conversationId: currentConversationId || '' },
    { enabled: false },
  ).refetch;

  // Send message mutation
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: async (data, variables, context) => {
      // Only proceed if this request wasn't cancelled
      const requestController = (context as any)?.requestController;
      if (requestController && requestController.signal.aborted) {
        console.log('🚫 Request was aborted, not processing success');
        return;
      }

      // Invalidate queries to refresh the UI
      await utils.messages.getByConversation.invalidate({
        conversationId: currentConversationId || '',
      });
      await utils.messages.invalidate();
      await refetchMessages();
      await utils.conversations.list.invalidate();

      // Wait briefly for queries to refetch, then clear loading state
      setTimeout(() => {
        startTransition(() => {
          finishMessageSend();
        });
      }, 200);
    },
    onError: (error, variables, context) => {
      // Check if error is due to cancellation
      if (error?.message?.includes('cancelled') || error?.message?.includes('aborted')) {
        console.log('🚫 Request was cancelled, ignoring error');
        return;
      }

      // Only proceed if this request wasn't cancelled
      const requestController = (context as any)?.requestController;
      if (requestController && requestController.signal.aborted) {
        console.log('🚫 Request was aborted, not processing error');
        return;
      }

      console.error('Failed to send message:', error);

      // Fallback for demo mode when API fails
      if (
        error?.data?.code === 'INTERNAL_SERVER_ERROR' ||
        error?.message?.includes('JSON.parse') ||
        error?.message?.includes('405') ||
        error?.message?.includes('Database connection issue') ||
        error?.message?.includes('database') ||
        error?.message?.includes('Connection')
      ) {
        handleDemoModeFallback(variables.content);
        return;
      }

      // Extract user-friendly error message
      const errorMessage = extractErrorMessage(error);
      handleMessageError(errorMessage);
    },
  });

  const handleDemoModeFallback = (currentInput: string) => {
    console.log('Auto-switching to demo mode due to API failure');

    // Enable demo mode
    setDemoMode(true);

    // Create demo conversation if needed
    if (!currentConversationId) {
      const fallbackId = `demo-fallback-${Date.now()}`;
      setCurrentConversation(fallbackId);
    }

    // Add user message to demo messages
    const userMessage: Message = {
      id: `demo-user-${Date.now()}`,
      role: 'user',
      content: currentInput,
      timestamp: new Date(),
      model: 'demo',
      cost: 0,
    };
    addDemoMessage(userMessage);

    // Add demo assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `demo-assistant-${Date.now()}`,
        role: 'assistant',
        content: `Thanks for your message: "${currentInput}". This is a demo response showing how the chat interface works! In the full version, this would connect to real AI models for actual conversations.`,
        timestamp: new Date(),
        model: 'demo-assistant-v1',
        cost: 0.001,
      };
      addDemoMessage(assistantMessage);

      startTransition(() => {
        finishMessageSend();
      });
    }, 1000);
  };

  const extractErrorMessage = (error: any): string => {
    if (error?.data?.code === 'TIMEOUT') {
      return 'Request timed out. The AI service may be busy. Please try again.';
    } else if (error?.data?.code === 'TOO_MANY_REQUESTS') {
      return 'Too many requests. Please wait a moment before trying again.';
    } else if (error?.data?.code === 'UNAUTHORIZED') {
      return 'Authentication failed. Please check your API key configuration.';
    } else if (error?.data?.code === 'PAYMENT_REQUIRED') {
      return 'API quota exceeded. Please check your billing or try again later.';
    } else if (error?.data?.code === 'BAD_REQUEST') {
      return 'Invalid request. Please try rephrasing your message.';
    } else if (
      String(error?.data?.code) === 'INTERNAL_SERVER_ERROR' ||
      error?.message?.includes('INTERNAL_SERVER_ERROR')
    ) {
      const message = error.message?.toLowerCase() || '';
      if (message.includes('database') || message.includes('connection')) {
        return 'Database connection issue. Please try again in a moment.';
      } else if (message.includes('timeout')) {
        return 'Request timed out. Please try again.';
      } else if (message.includes('rate limit')) {
        return 'Rate limit exceeded. Please wait before trying again.';
      }
    } else if (error instanceof Error) {
      return error.message || 'Something went wrong. Please try again.';
    }

    return 'Failed to send message. Please try again.';
  };

  const handleSendMessage = async (content?: string) => {
    if (!currentConversationId) {
      console.error('No conversation selected');
      return;
    }

    const messageContent = content ?? input.trim();
    if (!messageContent) return;

    console.log('🚀 Starting new request:', messageContent.slice(0, 20) + '...');

    // Cancel any existing request
    if (currentRequestRef.current) {
      console.log('❌ Cancelling previous request');
      currentRequestRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    currentRequestRef.current = abortController;

    // Use static demo API if in demo mode
    if (isStaticDemo) {
      startMessageSend(messageContent);
      try {
        // Check if cancelled before demo API call
        if (abortController.signal.aborted) {
          console.log('🚫 Request was aborted before demo API call');
          return;
        }

        await demoAPI.sendMessage(messageContent, currentConversationId);

        // Check if cancelled after demo API call
        if (!abortController.signal.aborted) {
          finishMessageSend();
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Demo API failed:', error);
          handleMessageError('Demo mode failed. Please try again.');
        }
      } finally {
        // Clear the ref if this is still the current request
        if (currentRequestRef.current === abortController) {
          currentRequestRef.current = null;
        }
      }
      return;
    }

    // Update state and send message
    startMessageSend(messageContent);

    console.log('📡 Making tRPC call...');
    sendMessageMutation.mutate(
      {
        content: messageContent,
        conversationId: currentConversationId,
      },
      {
        onSuccess: () => {
          console.log('✅ Response received and processed');
          // Clear the ref if this is still the current request
          if (currentRequestRef.current === abortController) {
            currentRequestRef.current = null;
          }
        },
        onError: (error) => {
          // Clear the ref if this is still the current request
          if (currentRequestRef.current === abortController) {
            currentRequestRef.current = null;
          }
        },
      },
    );
  };

  const handleRetry = () => {
    if (lastFailedMessage && currentConversationId) {
      console.log('🔄 Retrying failed message:', lastFailedMessage.slice(0, 20) + '...');

      // Cancel any existing request
      if (currentRequestRef.current) {
        console.log('❌ Cancelling previous request for retry');
        currentRequestRef.current.abort();
      }

      // Create new AbortController for retry
      const abortController = new AbortController();
      currentRequestRef.current = abortController;

      startMessageSend(lastFailedMessage);
      sendMessageMutation.mutate(
        {
          content: lastFailedMessage,
          conversationId: currentConversationId,
        },
        {
          onSuccess: () => {
            // Clear the ref if this is still the current request
            if (currentRequestRef.current === abortController) {
              currentRequestRef.current = null;
            }
          },
          onError: () => {
            // Clear the ref if this is still the current request
            if (currentRequestRef.current === abortController) {
              currentRequestRef.current = null;
            }
          },
        },
      );
    }
    resetRetry();
  };

  const cancelCurrentRequest = () => {
    if (currentRequestRef.current) {
      console.log('🧹 Cancelling current request');
      currentRequestRef.current.abort();
      currentRequestRef.current = null;
    }
  };

  const addLocalAssistantMessage = (content: string) => {
    if (!currentConversationId) return;

    const assistantMessage: Message = {
      id: `local-asst-${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
    };

    utils.messages.getByConversation.setData({ conversationId: currentConversationId }, (oldData) => {
      if (!oldData) return [assistantMessage];
      return [...oldData, assistantMessage];
    });

    // Also clear the input
    startTransition(() => {
      useChatStore.getState().setInput('');
    });
  };

  return {
    handleSendMessage,
    handleRetry,
    cancelCurrentRequest,
    addLocalAssistantMessage, // Export the new function
    isLoading,
    isMutating: sendMessageMutation.isPending,
  };
};
