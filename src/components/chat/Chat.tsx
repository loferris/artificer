import React, { useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { trpc } from '../../lib/trpc/client';
import { ExportButton } from '../ExportButton';
import { useStaticDemo } from '../../hooks/useStaticDemo';
import { useChatOperations, useConversationManager, useChatState } from '../../hooks/chat';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  cost?: number;
}

export const Chat: React.FC = () => {
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Static demo hook
  const { isDemoMode: isStaticDemo } = useStaticDemo();

  // Custom hooks for business logic
  const chatState = useChatState();
  const chatOperations = useChatOperations();
  const conversationManager = useConversationManager();

  // Extract frequently used state
  const {
    currentConversationId,
    isLoading,
    error,
    input,
    sidebarOpen,
    isDemoMode,
    demoMessages,
    isConversationReady,
    canSendMessage,
    shouldShowRetry,
    displayError,
    updateInput,
    toggleSidebar,
    clearError,
  } = chatState;

  const {
    conversations,
    conversationsLoading,
    conversationsError,
    isCreatingConversation,
  } = conversationManager;

  // Get current conversation messages with better error handling
  const {
    data: messages = [],
    isLoading: messagesLoading,
    error: messagesError,
  } = trpc.messages.getByConversation.useQuery(
    { conversationId: currentConversationId || '' },
    {
      enabled: !!currentConversationId && !isDemoMode && !isStaticDemo,
      retry: 1,
      retryDelay: 1000,
    },
  );

  // Use demo messages when in demo mode
  const displayMessages = isDemoMode ? demoMessages : messages;

  // Error logging for production monitoring
  React.useEffect(() => {
    if (messagesError) {
      console.error('Failed to load messages:', messagesError);
    }
  }, [messagesError]);



  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus management
  useEffect(() => {
    if (inputRef.current && !isLoading && !isCreatingConversation) {
      inputRef.current.focus();
    }
  }, [isLoading, isCreatingConversation]);

  // Cleanup on unmount - cancel any pending requests
  useEffect(() => {
    return () => {
      chatOperations.cancelCurrentRequest();
    };
  }, [chatOperations]);


  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatOperations.handleSendMessage();
    }
  };

  // Format time helper
  const formatTime = (date: Date | string | undefined): string => {
    try {
      if (!date) {
        return 'No time';
      }
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting time:', error, date);
      return 'Invalid date';
    }
  };


  return (
    <>
      {isStaticDemo && (
        <div className='bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center py-2 px-4 text-sm'>
          🤖 <strong>Chat App Demo</strong> - This is a static demo showcasing the UI. Real version
          connects to AI models via OpenRouter.
        </div>
      )}
      <div
        className={`flex ${isStaticDemo ? 'h-[calc(100vh-40px)]' : 'h-screen'} bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50`}
      >
        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white/80 backdrop-blur-sm border-r border-pink-200 overflow-hidden flex flex-col`}
        >
          <div className='p-4 border-b border-pink-100'>
            <h2 className='text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'>
              Conversations
            </h2>
          </div>

          <div className='flex-1 overflow-y-auto p-4 space-y-3'>
            {conversationsLoading ? (
              <div className='text-center text-gray-500 py-8'>
                <div className='animate-spin w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-2'></div>
                Loading conversations...
              </div>
            ) : conversationsError ? (
              <div className='text-center text-red-500 py-8'>
                <p>Failed to load conversations</p>
                <button
                  onClick={conversationManager.refreshConversations}
                  className='mt-2 text-sm text-pink-600 hover:text-pink-700'
                >
                  Try again
                </button>
              </div>
            ) : conversations.length === 0 ? (
              <div className='text-center text-gray-500 py-8'>
                <div className='text-4xl mb-2'>💬</div>
                <p>No conversations yet</p>
                <p className='text-sm mt-1'>Start chatting to create one!</p>
              </div>
            ) : (
              conversations.map((conversation: any) => (
                <div
                  key={conversation.id}
                  className={`p-3 rounded-xl cursor-pointer transition-all duration-200 group relative ${
                    conversation.id === currentConversationId
                      ? 'bg-gradient-to-r from-pink-100 to-purple-100 border-2 border-pink-300 shadow-sm'
                      : 'hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 border border-gray-200 hover:border-pink-200'
                  }`}
                  onClick={() => conversationManager.handleSelectConversation(conversation.id)}
                >
                  <div className='flex justify-between items-start'>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-medium text-gray-800 truncate'>
                        {conversation.title || 'New Conversation'}
                      </h3>
                      <div className='text-xs text-gray-500 mt-1'>
                        {(() => {
                          try {
                            const date = new Date(conversation.updatedAt);
                            if (isNaN(date.getTime())) {
                              return 'Invalid date';
                            }
                            return format(date, 'MMM d, h:mm a');
                          } catch (error) {
                            console.error(
                              'Error formatting conversation date:',
                              error,
                              conversation.updatedAt,
                            );
                            return 'Invalid date';
                          }
                        })()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => conversationManager.handleDeleteConversation(conversation.id, e)}
                      className='opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 ml-2'
                      title='Delete conversation'
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className='p-4 border-t border-pink-100 space-y-3'>
            <button
              onClick={conversationManager.handleNewConversation}
              disabled={isCreatingConversation}
              className='w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md'
            >
              {isCreatingConversation ? 'Creating...' : '+ New Chat'}
            </button>

            <ExportButton />
          </div>
        </div>

        {/* Main Chat Area */}
        <div className='flex-1 flex flex-col'>
          {/* Header */}
          <div className='bg-white/80 backdrop-blur-sm border-b border-pink-200 p-4 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <button
                onClick={toggleSidebar}
                className='p-2 hover:bg-pink-100 rounded-lg transition-colors'
                title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                <div className='w-5 h-5 flex flex-col justify-center space-y-1'>
                  <div className='w-full h-0.5 bg-gray-600 rounded'></div>
                  <div className='w-full h-0.5 bg-gray-600 rounded'></div>
                  <div className='w-full h-0.5 bg-gray-600 rounded'></div>
                </div>
              </button>
              <h1 className='text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'>
                AI Chat
              </h1>
            </div>

            <div className='text-sm text-gray-500'>
              {currentConversationId
                ? conversations.find((c: any) => c.id === currentConversationId)?.title ||
                  'Current Chat'
                : 'No conversation selected'}
            </div>
          </div>

          {/* Messages Area */}
          <div className='flex-1 overflow-y-auto p-6'>
            {isCreatingConversation ? (
              <div className='text-center text-gray-500 py-12'>
                <div className='text-6xl mb-4'>✨</div>
                <p className='text-xl font-medium text-gray-700'>Creating your conversation...</p>
              </div>
            ) : messagesLoading ? (
              <div className='text-center text-gray-500 py-12'>
                <div className='animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-4'></div>
                <p className='text-xl font-medium text-gray-700'>Loading messages...</p>
              </div>
            ) : messagesError ? (
              <div className='text-center text-red-500 py-12'>
                <div className='text-6xl mb-4'>⚠️</div>
                <p className='text-xl font-medium text-red-700'>Failed to load messages</p>
                <p className='mt-2 text-red-500'>Please try refreshing the page</p>
              </div>
            ) : Array.isArray(displayMessages) && displayMessages.length === 0 ? (
              <div className='text-center text-gray-500 py-12'>
                <div className='text-6xl mb-4'>🌈</div>
                <p className='text-xl font-medium text-gray-700'>Welcome to your colorful chat!</p>
                <p className='mt-2 text-gray-500'>Start a conversation by typing a message below</p>
              </div>
            ) : Array.isArray(displayMessages) && displayMessages.length > 0 ? (
              <>
                {displayMessages.map((message) => (
                  <div
                    key={`${message.id}-${message.timestamp}`}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}
                    role={message.role === 'user' ? 'status' : 'complementary'}
                    aria-atomic='true'
                  >
                    <div
                      className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                          : 'bg-gradient-to-r from-indigo-50 to-purple-50 text-gray-800 border border-purple-200'
                      }`}
                    >
                      <div className='whitespace-pre-wrap leading-relaxed'>{message.content}</div>
                      <div className='flex justify-between items-center mt-2'>
                        <div
                          className={`text-xs ${
                            message.role === 'user' ? 'text-pink-100' : 'text-purple-500'
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Enhanced Loading indicator for real AI */}
                {isLoading && (
                  <div className='flex justify-start' aria-live='polite'>
                    <div className='bg-gradient-to-r from-indigo-50 to-purple-50 border border-purple-200 px-4 py-3 rounded-2xl shadow-sm'>
                      <div className='flex items-center space-x-3'>
                        <div className='flex space-x-1'>
                          <div
                            className='w-2 h-2 bg-purple-500 rounded-full animate-bounce'
                            style={{ animationDelay: '0ms' }}
                          ></div>
                          <div
                            className='w-2 h-2 bg-purple-500 rounded-full animate-bounce'
                            style={{ animationDelay: '150ms' }}
                          ></div>
                          <div
                            className='w-2 h-2 bg-purple-500 rounded-full animate-bounce'
                            style={{ animationDelay: '300ms' }}
                          ></div>
                        </div>
                        <div className='flex flex-col'>
                          <span className='text-sm text-purple-600'>AI is thinking...</span>
                          <span className='text-xs text-purple-400'>
                            This may take up to 30 seconds
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            ) : null}
          </div>

          {/* Error Display */}
          {error && (
            <div className='mx-6 mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start justify-between'>
              <div className='flex items-start space-x-3'>
                <div className='text-red-500 text-xl'>⚠️</div>
                <div>
                  <p className='text-red-800 font-medium'>Error</p>
                  <p className='text-red-700 text-sm mt-1'>{error}</p>
                </div>
              </div>
              <div className='flex items-center space-x-2 ml-4'>
                {shouldShowRetry && (
                  <button
                    onClick={chatOperations.handleRetry}
                    disabled={isLoading}
                    className='px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                  >
                    Retry
                  </button>
                )}
                <button
                  onClick={clearError}
                  className='px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors'
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className='bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-pink-100 p-4 mx-6 mb-6'>
            <div className='flex gap-3'>
              <input
                id='chat-input'
                ref={inputRef}
                type='text'
                value={input}
                onChange={(e) => updateInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isConversationReady ? 'Type your message...' : 'Creating conversation...'
                }
                disabled={!isConversationReady || isLoading}
                className='flex-1 px-4 py-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-400 bg-white/50'
              />
              <button
                onClick={chatOperations.handleSendMessage}
                disabled={!canSendMessage}
                className='px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md flex items-center space-x-2'
              >
                <span>{isLoading ? 'Sending...' : 'Send'}</span>
                {!isLoading && <span className='text-lg'>→</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
