
import React, { useEffect, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
}

interface ChatDisplayProps {
  messages: Message[];
  isLoading: boolean;
  isCreatingConversation: boolean;
  messagesLoading: boolean;
  messagesError: Error | null;
}

export const ChatDisplay: React.FC<ChatDisplayProps> = ({
  messages,
  isLoading,
  isCreatingConversation,
  messagesLoading,
  messagesError,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-gray-200">
      {messages.map((message) => (
        <div key={`${message.id}-${message.timestamp}`} className="mb-2">
          {message.role === 'user' ? (
            <div className="flex items-center">
              <span className="text-green-400 pr-2">$</span>
              <span>{message.content}</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap p-2 bg-black/20 rounded">
              {message.content}
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="text-cyan-400">AI is thinking...</div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
