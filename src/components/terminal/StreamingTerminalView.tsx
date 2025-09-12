import React from 'react';
import { StreamingChatDisplay } from './StreamingChatDisplay';
import { ChatInput } from './ChatInput';
import { TerminalHeader } from './TerminalHeader';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
  isComplete?: boolean;
}

interface StreamingTerminalViewProps {
  // Data
  messages: Message[];
  input: string;

  // Loading states
  isCreatingConversation: boolean;
  messagesLoading: boolean;
  isLoading: boolean;
  isStreaming: boolean;

  // Errors
  messagesError: Error | null;
  streamingError: string | null;

  // State checks
  isConversationReady: boolean;
  canSendMessage: boolean;

  // Callbacks
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onCancelStream?: () => void;
}

export const StreamingTerminalView: React.FC<StreamingTerminalViewProps> = ({
  messages,
  input,
  isCreatingConversation,
  messagesLoading,
  isLoading,
  isStreaming,
  messagesError,
  streamingError,
  isConversationReady,
  canSendMessage,
  onInputChange,
  onSendMessage,
  onCancelStream
}) => {
  return (
    <div className="flex h-screen bg-gray-800 text-white">
      <div className="flex-1 flex flex-col">
        <TerminalHeader />
        
        {streamingError && (
          <div className="bg-red-900/20 border-l-4 border-red-500 p-2 text-red-400 text-sm font-mono">
            Stream Error: {streamingError}
          </div>
        )}
        
        <StreamingChatDisplay
          messages={messages}
          isLoading={isLoading}
          isStreaming={isStreaming}
          isCreatingConversation={isCreatingConversation}
          messagesLoading={messagesLoading}
          messagesError={messagesError}
        />

        <div className="flex items-center gap-2 px-2">
          <div className="flex-1">
            <ChatInput
              input={input}
              onInputChange={onInputChange}
              onSendMessage={onSendMessage}
              isConversationReady={isConversationReady}
              isLoading={isLoading || isStreaming}
              canSendMessage={canSendMessage && !isStreaming}
            />
          </div>
          {isStreaming && onCancelStream && (
            <button
              onClick={onCancelStream}
              className="flex-shrink-0 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
              title="Cancel streaming"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};