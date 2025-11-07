/**
 * Unified Terminal View Component
 *
 * Merges TerminalView and StreamingTerminalView into a single component
 * with intelligent streaming detection and enhanced input handling.
 * Eliminates 95% code duplication between the original components.
 */

import React from 'react';
import { UnifiedChatDisplay } from './UnifiedChatDisplay';
import { ChatInput } from './ChatInput';
import { TerminalHeader } from './TerminalHeader';
import { useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';
import { DangerButton } from '../ui';
import type { Message } from '../../types';

export interface UnifiedTerminalViewProps {
  // Data
  messages: Message[];
  input: string;

  // Loading states
  isCreatingConversation: boolean;
  messagesLoading: boolean;
  isLoading: boolean;
  isStreaming?: boolean;

  // Errors
  messagesError: Error | null;
  streamingError?: string | null;

  // State checks
  isConversationReady: boolean;
  canSendMessage: boolean;

  // Callbacks
  onInputChange: (value: string) => void;
  onMessageSend: (content: string) => void | Promise<void>;
  onCancelStream?: () => void;

  // UI state
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;

  // Theme props
  className?: string;
  style?: React.CSSProperties;
}

export const UnifiedTerminalView: React.FC<UnifiedTerminalViewProps> = ({
  messages,
  input,
  isCreatingConversation,
  messagesLoading,
  isLoading,
  isStreaming = false,
  messagesError,
  streamingError,
  isConversationReady,
  canSendMessage,
  onInputChange,
  onMessageSend,
  onCancelStream,
  sidebarOpen,
  onSidebarToggle,
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
      <div className='flex-1 flex flex-col'>
        <TerminalHeader statusText={isStreaming ? 'STREAMING' : undefined} />

        {/* Streaming error banner - only shows in streaming mode */}
        {streamingError && isStreaming && (
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
            <div className='flex items-center'>
              <span className='mr-2'>!</span>
              <span>stream-error: {streamingError}</span>
            </div>
          </div>
        )}

        {/* Unified chat display with streaming support */}
        <UnifiedChatDisplay
          messages={messages}
          isLoading={isLoading}
          isStreaming={isStreaming}
          isCreatingConversation={isCreatingConversation}
          messagesLoading={messagesLoading}
          messagesError={messagesError}
          streamingError={streamingError}
        />

        {/* Input area with optional cancel button for streaming */}
        <div className={`flex items-center gap-2 ${isStreaming ? 'px-2' : ''}`}>
          <div className='flex-1'>
            <ChatInput
              input={input}
              onInputChange={onInputChange}
              onSendMessage={() => onMessageSend(input)}
              isConversationReady={isConversationReady}
              isLoading={false} // Always enable input in terminal mode
              canSendMessage={canSendMessage}
              placeholder={undefined}
            />
          </div>

          {/* Stream cancel button - only shows when streaming and cancellation is available */}
          {isStreaming && onCancelStream && (
            <DangerButton size='sm' onClick={onCancelStream} title='Cancel streaming'>
              /cancel
            </DangerButton>
          )}
        </div>
      </div>
    </div>
  );
};

// Backward compatibility exports
export const TerminalView = UnifiedTerminalView;
export const StreamingTerminalView = UnifiedTerminalView;
