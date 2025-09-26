import React, { useEffect, useRef } from 'react';
import { StreamingMessage } from '../streaming/StreamingMessage';
import { useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
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
  className?: string;
  style?: React.CSSProperties;
}

export const StreamingChatDisplay: React.FC<StreamingChatDisplayProps> = ({
  messages,
  isLoading,
  isStreaming,
  isCreatingConversation,
  messagesLoading,
  messagesError,
  className = '',
  style,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const themeClasses = useTerminalThemeClasses();

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

  const baseContainerClasses = `
    flex-1 
    overflow-y-auto 
    ${themeClasses.pMd} 
    ${themeClasses.fontMono} 
    ${themeClasses.textSm}
    ${themeClasses.transitionFast}
    terminal-scrollbar
    ${className}
  `;

  if (messagesLoading || isCreatingConversation) {
    return (
      <div className={`${baseContainerClasses} ${themeClasses.textTertiary}`} style={style}>
        <div className='flex items-center'>
          <span className={`${themeClasses.accentPrompt} mr-2`}>$</span>
          <span className={`${themeClasses.textMuted}`}>
            {isCreatingConversation ? 'initializing-session...' : 'loading-history...'}
          </span>
          <div className={`ml-2 animate-pulse ${themeClasses.accentPrompt}`}>_</div>
        </div>
      </div>
    );
  }

  if (messagesError) {
    return (
      <div className={`${baseContainerClasses} ${themeClasses.accentError}`} style={style}>
        <div className='flex items-center'>
          <span className={`${themeClasses.accentError} mr-2`}>!</span>
          <span>error: failed-to-load-messages</span>
        </div>
        <div className={`${themeClasses.textMuted} mt-2 text-xs`}>
          {messagesError.message || 'Unknown error occurred'}
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !messagesLoading) {
    return (
      <div className={`${baseContainerClasses} ${themeClasses.textMuted}`} style={style}>
        <div className='space-y-2'>
          <div className='flex items-center'>
            <span className={`${themeClasses.accentPrompt} mr-2`}>$</span>
            <span>streaming-session-initialized</span>
          </div>
          <div className={`${themeClasses.textTertiary} text-xs ml-4`}>
            {/* Real-time streaming enabled */}
          </div>
          <div className={`${themeClasses.textTertiary} text-xs ml-4`}>
            {/* Type messages for instant AI responses */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className={`${baseContainerClasses} ${themeClasses.textSecondary}`}
      onScroll={handleScroll}
      style={style}
    >
      {messages.map((message) => {
        const isComplete = message.isComplete ?? true;
        const isCurrentlyStreaming = !isComplete && isStreaming;

        return (
          <div
            key={`${message.id}-${message.timestamp}`}
            className={`mb-2 ${themeClasses.transitionFast}`}
          >
            {message.role === 'user' ? (
              <div className='flex items-start'>
                <span className={`${themeClasses.accentUser} pr-2 flex-shrink-0`}>$</span>
                <span className={`${themeClasses.accentUser} break-words flex-1`}>
                  {message.content}
                </span>
              </div>
            ) : (
              <div
                className={`
                  ${themeClasses.pSm} 
                  ${themeClasses.bgOverlay} 
                  ${themeClasses.radiusSm}
                  ${themeClasses.accentAssistant}
                  ml-6
                  border-l-2
                  border-[var(--terminal-accent-assistant)]
                  relative
                `}
              >
                <div
                  className={`${themeClasses.textXs} ${themeClasses.textMuted} mb-1 flex items-center justify-between`}
                >
                  <span style={{ color: '#f8b4cb' }}>
                    AI Response {isCurrentlyStreaming ? '(streaming)' : ''}:
                  </span>
                  {isCurrentlyStreaming && (
                    <div className={`${themeClasses.accentAssistant} animate-pulse text-xs`}>●</div>
                  )}
                </div>
                <StreamingMessage
                  content={message.content}
                  isComplete={isComplete}
                  className={themeClasses.textSecondary}
                />
              </div>
            )}
          </div>
        );
      })}

      {(isLoading || isStreaming) && (
        <div className={`flex items-center ${themeClasses.accentAssistant} mt-4`}>
          <span className='mr-2'>⟨</span>
          <span>ai-{isStreaming ? 'streaming' : 'thinking'}</span>
          <div className='ml-2 flex space-x-1'>
            <div
              className={`w-1 h-1 ${themeClasses.accentAssistant} bg-current rounded-full animate-bounce`}
              style={{ animationDelay: '0ms' }}
            />
            <div
              className={`w-1 h-1 ${themeClasses.accentAssistant} bg-current rounded-full animate-bounce`}
              style={{ animationDelay: '150ms' }}
            />
            <div
              className={`w-1 h-1 ${themeClasses.accentAssistant} bg-current rounded-full animate-bounce`}
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className='ml-2'>⟩</span>
          {isStreaming && (
            <span className={`ml-2 ${themeClasses.textMuted} text-xs`}>/cancel to stop</span>
          )}
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
