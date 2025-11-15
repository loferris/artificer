import React, { useEffect, useRef, useState } from 'react';

export interface RAGSource {
  filename: string;
  content: string;
  score: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date | string;
  ragSources?: RAGSource[];
  model?: string;
  cost?: number;
  tokens?: number;
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
}

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const [showContext, setShowContext] = useState(false);
  const isUser = message.role === 'user';
  const hasRAG = message.ragSources && message.ragSources.length > 0;

  const formatTime = (date: Date | string) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message bubble */}
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-900'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                {isUser ? '💬 You' : '🤖 Assistant'}
              </span>
            </div>
            <span className={`text-xs ${isUser ? 'text-blue-100' : 'text-gray-400'}`}>
              {formatTime(message.timestamp)}
            </span>
          </div>

          {/* Content */}
          <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>

          {/* RAG Sources */}
          {hasRAG && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowContext(!showContext)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>
                  📚 Sources: {message.ragSources!.map(s => s.filename).join(', ')}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${showContext ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Expanded Context */}
        {showContext && hasRAG && (
          <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm">
            <div className="font-semibold text-gray-700 mb-3">Context Retrieved:</div>
            <div className="space-y-3">
              {message.ragSources!.map((source, idx) => (
                <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">📄</span>
                      <span className="font-medium text-gray-900">{source.filename}</span>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {Math.round(source.score * 100)}% relevance
                    </span>
                  </div>
                  <div className="text-gray-600 text-xs leading-relaxed pl-6">
                    "{source.content.substring(0, 200)}
                    {source.content.length > 200 ? '...' : ''}"
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowContext(false)}
              className="mt-3 text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span>Hide context</span>
            </button>
          </div>
        )}

        {/* Metadata (model, cost, tokens) */}
        {!isUser && (message.model || message.cost !== undefined || message.tokens !== undefined) && (
          <div className="mt-1 flex items-center space-x-3 text-xs text-gray-400">
            {message.model && <span>Model: {message.model}</span>}
            {message.tokens !== undefined && <span>{message.tokens} tokens</span>}
            {message.cost !== undefined && <span>${message.cost.toFixed(4)}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading = false,
  className = '',
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Start a conversation</h3>
          <p className="text-gray-500">
            Ask questions about your documents or start a new discussion
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto p-6 ${className}`}>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-start mb-4">
          <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-sm text-gray-600">AI is thinking...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
