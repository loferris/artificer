/**
 * Unified Chat Display Component
 *
 * Merges ChatDisplay and StreamingChatDisplay into a single component
 * with smart streaming detection and enhanced scroll management.
 * Eliminates 85% code duplication between the original components.
 */

import React, { useEffect, useRef } from 'react';
import { MessageListRenderer } from '../shared/MessageRenderer';
import {
  useTerminalThemeClasses,
  useTerminalThemeProps,
} from '../../contexts/TerminalThemeContext';
import { LoadingSpinner } from '../ui';
import type { Message } from '../../types';

export interface UnifiedChatDisplayProps {
  messages: Message[];
  isLoading: boolean;
  isStreaming?: boolean;
  isCreatingConversation: boolean;
  messagesLoading: boolean;
  messagesError: Error | null;
  streamingError?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

export const UnifiedChatDisplay: React.FC<UnifiedChatDisplayProps> = ({
  messages,
  isLoading,
  isStreaming = false,
  isCreatingConversation,
  messagesLoading,
  messagesError,
  streamingError,
  className = '',
  style,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const themeClasses = useTerminalThemeClasses();
  const { getCSSProperty } = useTerminalThemeProps();

  // Smart scroll detection for streaming mode
  const checkIfNearBottom = () => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const threshold = 100; // pixels from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  // Auto-scroll logic - enhanced for streaming
  useEffect(() => {
    if (isStreaming) {
      // Always auto-scroll during streaming if user hasn't manually scrolled up
      if (shouldAutoScrollRef.current && checkIfNearBottom()) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Standard auto-scroll for non-streaming
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  // Reset auto-scroll when streaming starts
  useEffect(() => {
    if (isStreaming) {
      shouldAutoScrollRef.current = true;
    }
  }, [isStreaming]);

  // Handle user scroll events (only active during streaming)
  const handleScroll = () => {
    if (!isStreaming) return;

    if (!checkIfNearBottom()) {
      shouldAutoScrollRef.current = false;
    } else {
      shouldAutoScrollRef.current = true;
    }
  };

  const baseContainerClasses = `
    flex-1 
    overflow-y-auto 
    ${themeClasses.pMd} 
    ${themeClasses.fontMono} 
    ${themeClasses.textSm}
    ${themeClasses.transitionFast}
    ${isStreaming ? 'terminal-scrollbar' : ''}
    ${className}
  `;

  // Loading state
  if (messagesLoading || isCreatingConversation) {
    return (
      <div className={`${baseContainerClasses} ${themeClasses.textTertiary}`} style={style}>
        <div className='flex items-center'>
          <span className={`${themeClasses.accentPrompt} mr-2`}>$</span>
          <span className={`${themeClasses.textMuted}`}>
            {isCreatingConversation
              ? 'initializing-session...'
              : isStreaming
                ? 'loading-streaming-history...'
                : 'loading-history...'}
          </span>
          <div className={`ml-2 animate-pulse ${themeClasses.accentPrompt}`}>_</div>
        </div>
      </div>
    );
  }

  // Error states
  if (messagesError || streamingError) {
    const error = messagesError || new Error(streamingError || 'Unknown streaming error');
    return (
      <div className={`${baseContainerClasses} ${themeClasses.accentError}`} style={style}>
        <div className='flex items-center'>
          <span className={`${themeClasses.accentError} mr-2`}>!</span>
          <span>error: {messagesError ? 'failed-to-load-messages' : 'streaming-error'}</span>
        </div>
        <div className={`${themeClasses.textMuted} mt-2 text-xs`}>
          {error.message || 'Unknown error occurred'}
        </div>
      </div>
    );
  }

  // Empty state
  if (messages.length === 0 && !messagesLoading) {
    return (
      <div className={`${baseContainerClasses} ${themeClasses.textSecondary}`} style={style}>
        <div className='space-y-3'>
          <div className='flex items-center'>
            <span className={`${themeClasses.accentPrompt} mr-2 text-lg`}>$</span>
            <span className='text-base'>
              {isStreaming ? 'streaming-session-initialized' : 'session-initialized'}
            </span>
          </div>
          <div className={`${themeClasses.textTertiary} text-sm ml-4`}>
            {isStreaming
              ? '// Real-time streaming enabled'
              : '// Start typing to interact with the AI assistant'}
          </div>

          <div className='ml-4 mt-4 space-y-2'>
            <div className={`${themeClasses.textSecondary} text-sm font-semibold`}>
              Available Commands:
            </div>
            <div className='ml-2 space-y-1'>
              <div className={`${themeClasses.textTertiary} text-sm flex`}>
                <span className={`${themeClasses.accentSuccess} w-20`}>/man</span>
                <span>- Show this manual</span>
              </div>
              <div className={`${themeClasses.textTertiary} text-sm flex`}>
                <span className={`${themeClasses.accentSuccess} w-20`}>/clear</span>
                <span>- Clear conversation history</span>
              </div>
              <div className={`${themeClasses.textTertiary} text-sm flex`}>
                <span className={`${themeClasses.accentSuccess} w-20`}>/new</span>
                <span>- Create a new conversation</span>
              </div>
              <div className={`${themeClasses.textTertiary} text-sm flex`}>
                <span className={`${themeClasses.accentSuccess} w-20`}>/list</span>
                <span>- Show 10 most recent conversations</span>
              </div>
              <div className={`${themeClasses.textTertiary} text-sm flex`}>
                <span className={`${themeClasses.accentSuccess} w-20`}>/list-all</span>
                <span>- Show all conversations</span>
              </div>
              <div className={`${themeClasses.textTertiary} text-sm flex`}>
                <span className={`${themeClasses.accentSuccess} w-20`}>/export-current</span>
                <span>- Export current conversation</span>
              </div>
              <div className={`${themeClasses.textTertiary} text-sm flex`}>
                <span className={`${themeClasses.accentSuccess} w-20`}>/export-all</span>
                <span>- Export all conversations</span>
              </div>
              <div className={`${themeClasses.textTertiary} text-sm flex`}>
                <span className={`${themeClasses.accentSuccess} w-20`}>/theme</span>
                <span>- Switch terminal theme (dark|amber|light)</span>
              </div>
              <div className={`${themeClasses.textTertiary} text-sm flex`}>
                <span className={`${themeClasses.accentSuccess} w-20`}>/view</span>
                <span>- Switch view mode (chat|terminal)</span>
              </div>
              <div className={`${themeClasses.textTertiary} text-sm flex`}>
                <span className={`${themeClasses.accentSuccess} w-20`}>/streaming</span>
                <span>- Toggle streaming mode (yes|no)</span>
              </div>
              <div className={`${themeClasses.textTertiary} text-sm flex`}>
                <span className={`${themeClasses.accentSuccess} w-20`}>/reset</span>
                <span>- Reset the session</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main content with messages
  return (
    <div
      ref={scrollContainerRef}
      className={`${baseContainerClasses} ${themeClasses.textSecondary}`}
      style={style}
      onScroll={handleScroll}
    >
      <MessageListRenderer messages={messages} isStreaming={isStreaming} variant='terminal' />

      {/* Loading indicator */}
      {isLoading && (
        <div className='mt-4'>
          <LoadingSpinner
            variant='thinking'
            color='primary'
            text={isStreaming ? 'ai-streaming' : 'ai-thinking'}
          />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
