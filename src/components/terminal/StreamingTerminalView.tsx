import React from 'react';
import { StreamingChatDisplay } from './StreamingChatDisplay';
import { ChatInput } from './ChatInput';
import { TerminalHeader } from './TerminalHeader';
import { useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
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

  // Theme props
  className?: string;
  style?: React.CSSProperties;
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
  onCancelStream,
  className = '',
  style,
}) => {
  const themeClasses = useTerminalThemeClasses();

  return (
    <div 
      className={`
        flex 
        h-screen 
        ${themeClasses.bgPrimary} 
        ${themeClasses.textPrimary}
        ${themeClasses.fontMono}
        ${themeClasses.transitionNormal}
        ${className}
      `}
      style={style}
    >
      <div className="flex-1 flex flex-col">
        <TerminalHeader 
          statusText={isStreaming ? 'STREAMING' : undefined}
        />
        
        {streamingError && (
          <div 
            className={`
              ${themeClasses.bgOverlay}
              ${themeClasses.accentError}
              ${themeClasses.textSm}
              ${themeClasses.fontMono}
              ${themeClasses.pSm}
              border-l-4
              border-[var(--terminal-accent-error)]
            `}
          >
            <div className="flex items-center">
              <span className="mr-2">!</span>
              <span>stream-error: {streamingError}</span>
            </div>
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
              placeholder={isStreaming ? 'streaming-in-progress...' : undefined}
            />
          </div>
          {isStreaming && onCancelStream && (
            <button
              onClick={onCancelStream}
              className={`
                flex-shrink-0 
                ${themeClasses.pSm}
                ${themeClasses.accentError}
                bg-current
                ${themeClasses.textPrimary}
                ${themeClasses.textSm}
                ${themeClasses.radiusSm}
                ${themeClasses.transitionFast}
                ${themeClasses.fontMono}
                hover:opacity-80
                cursor-pointer
              `}
              title="Cancel streaming"
            >
              /cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};