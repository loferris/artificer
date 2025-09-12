import React, { useEffect, useRef } from 'react';
import { StreamingMessage } from '../streaming/StreamingMessage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
  isComplete?: boolean;
}

interface StreamingChatDisplayProps {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  isCreatingConversation: boolean;
  messagesLoading: boolean;
  messagesError: Error | null;
}

export const StreamingChatDisplay: React.FC<StreamingChatDisplayProps> = ({
  messages,
  isLoading,
  isStreaming,
  isCreatingConversation,
  messagesLoading,
  messagesError,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // Check if user is near the bottom before deciding to auto-scroll
  const checkIfNearBottom = () => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const threshold = 100; // pixels from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  useEffect(() => {
    // Only auto-scroll if user is near the bottom (hasn't manually scrolled up)
    if (shouldAutoScrollRef.current && checkIfNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Reset auto-scroll when streaming starts
  useEffect(() => {
    if (isStreaming) {
      shouldAutoScrollRef.current = true;
    }
  }, [isStreaming]);

  const handleScroll = () => {
    // If user scrolls up, disable auto-scroll
    if (!checkIfNearBottom()) {
      shouldAutoScrollRef.current = false;
    } else {
      shouldAutoScrollRef.current = true;
    }
  };

  if (messagesLoading || isCreatingConversation) {
    return (
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-gray-300">
        {isCreatingConversation ? 'Initializing session...' : 'Loading history...'}
      </div>
    );
  }

  if (messagesError) {
    return (
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-red-400">
        <p>Error: Failed to load messages.</p>
      </div>
    );
  }

  if (messages.length === 0 && !messagesLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-gray-400">
        <p>New conversation started. Start typing to interact with the AI assistant.</p>
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto p-4 font-mono text-sm text-gray-200"
      onScroll={handleScroll}
    >
      {messages.map((message) => {
        const isComplete = message.isComplete ?? true;
        const isCurrentlyStreaming = !isComplete && isStreaming;
        
        return (
          <div key={`${message.id}-${message.timestamp}`} className="mb-2">
            {message.role === 'user' ? (
              <div className="flex items-center">
                <span className="text-green-400 pr-2">$</span>
                <span>{message.content}</span>
              </div>
            ) : (
              <div className="p-2 bg-black/20 rounded">
                <StreamingMessage
                  content={message.content}
                  isComplete={isComplete}
                  className="text-gray-200"
                />
              </div>
            )}
          </div>
        );
      })}

      {(isLoading || isStreaming) && (
        <div className="text-cyan-400 flex items-center space-x-2">
          <span>AI is {isStreaming ? 'responding' : 'thinking'}...</span>
          {isStreaming && (
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          )}
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};