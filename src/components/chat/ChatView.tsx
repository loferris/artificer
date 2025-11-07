import React from 'react';
import { format } from 'date-fns';

// Re-defining interfaces locally for props, as this is now a dumb component
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date | string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string | Date;
}

// These are the same props as TerminalView, making them interchangeable
interface ChatViewProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  input: string;
  sidebarOpen: boolean;
  conversationsLoading: boolean;
  isCreatingConversation: boolean;
  messagesLoading: boolean;
  isLoading: boolean;
  conversationsError: Error | null;
  messagesError: Error | null;
  isConversationReady: boolean;
  canSendMessage: boolean;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onRefreshConversations: () => void;
  onToggleSidebar: () => void;
  onExportCurrent: (format?: 'markdown' | 'json') => void;
  onExportAll: (format?: 'markdown' | 'json') => void;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversations,
  currentConversationId,
  messages,
  input,
  sidebarOpen,
  conversationsLoading,
  isCreatingConversation,
  messagesLoading,
  isLoading,
  conversationsError,
  messagesError,
  isConversationReady,
  canSendMessage,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRefreshConversations,
  onToggleSidebar,
  onExportCurrent,
  onExportAll,
  onInputChange,
  onSendMessage,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  React.useEffect(() => {
    if (inputRef.current && !isLoading && !isCreatingConversation) {
      inputRef.current.focus();
    }
  }, [isLoading, isCreatingConversation]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const formatTime = (date: Date | string | undefined): string => {
    try {
      if (!date) return 'No time';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div
      className={`flex h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50`}
      style={{
        background:
          'linear-gradient(to bottom right, rgb(253, 242, 248), rgb(250, 245, 255), rgb(238, 242, 255))',
      }}
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
                onClick={onRefreshConversations}
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
                onClick={() => onSelectConversation(conversation.id)}
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
                          if (isNaN(date.getTime())) return 'Invalid date';
                          return format(date, 'MMM d, h:mm a');
                        } catch (error) {
                          return 'Invalid date';
                        }
                      })()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => onDeleteConversation(conversation.id, e)}
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
            onClick={onNewConversation}
            disabled={isCreatingConversation}
            className='w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md'
          >
            {isCreatingConversation ? 'Creating...' : '+ New Chat'}
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className='flex-1 flex flex-col'>
        <div className='bg-white/80 backdrop-blur-sm border-b border-pink-200 p-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <button
              onClick={onToggleSidebar}
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
              AI Chat (Classic View)
            </h1>
          </div>

          <div className='flex items-center gap-3'>
            {/* Export buttons */}
            <div className='flex items-center gap-2'>
              <button
                onClick={() => onExportCurrent('markdown')}
                disabled={!currentConversationId}
                className='px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                title='Export current conversation as markdown'
              >
                Export MD
              </button>
              <button
                onClick={() => onExportCurrent('json')}
                disabled={!currentConversationId}
                className='px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                title='Export current conversation as JSON'
              >
                Export JSON
              </button>
              <button
                onClick={() => onExportAll('markdown')}
                className='px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors'
                title='Export all conversations as markdown'
              >
                Export All MD
              </button>
              <button
                onClick={() => onExportAll('json')}
                className='px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors'
                title='Export all conversations as JSON'
              >
                Export All JSON
              </button>
            </div>

            <div className='text-sm text-gray-500'>
              {currentConversationId
                ? conversations.find((c: any) => c.id === currentConversationId)?.title ||
                  'Current Chat'
                : 'No conversation selected'}
            </div>
          </div>
        </div>

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
          ) : messages.length === 0 ? (
            <div className='text-center text-gray-500 py-12'>
              <div className='text-6xl mb-4'>🌈</div>
              <p className='text-xl font-medium text-gray-700'>Welcome to your colorful chat!</p>
              <p className='mt-2 text-gray-500'>Start a conversation by typing a message below</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={`${message.id}-${message.timestamp}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-sm ${
                      message.role === 'user'
                        ? 'text-white border border-purple-300'
                        : 'text-gray-800 border border-purple-200'
                    }`}
                    style={{
                      background:
                        message.role === 'user'
                          ? 'linear-gradient(to right, rgb(236, 72, 153), rgb(147, 51, 234))'
                          : 'linear-gradient(to right, rgb(238, 242, 255), rgb(250, 245, 255))',
                    }}
                  >
                    <div className='whitespace-pre-wrap leading-relaxed'>{message.content}</div>
                    <div className='flex justify-between items-center mt-2'>
                      <div
                        className={`text-xs ${message.role === 'user' ? 'text-pink-100' : 'text-purple-500'}`}
                      >
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className='bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-pink-100 p-4 mx-6 mb-6'>
          <div className='flex gap-3'>
            <input
              id='chat-input'
              ref={inputRef}
              type='text'
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isConversationReady ? 'Type your message...' : 'Creating conversation...'
              }
              disabled={!isConversationReady || isLoading}
              className='flex-1 px-4 py-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-400 bg-white/50'
            />
            <button
              onClick={onSendMessage}
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
  );
};
