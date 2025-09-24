
import React, { useEffect, useRef } from 'react';
import { useTerminalThemeClasses, useTerminalThemeProps } from '../../contexts/TerminalThemeContext';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date | string;
}

interface ChatDisplayProps {
  messages: Message[];
  isLoading: boolean;
  isCreatingConversation: boolean;
  messagesLoading: boolean;
  messagesError: Error | null;
  className?: string;
  style?: React.CSSProperties;
}

export const ChatDisplay: React.FC<ChatDisplayProps> = ({
  messages,
  isLoading,
  isCreatingConversation,
  messagesLoading,
  messagesError,
  className = '',
  style,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const themeClasses = useTerminalThemeClasses();
  const { getCSSProperty } = useTerminalThemeProps();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const baseContainerClasses = `
    flex-1 
    overflow-y-auto 
    ${themeClasses.pMd} 
    ${themeClasses.fontMono} 
    ${themeClasses.textSm}
    ${themeClasses.transitionFast}
    ${className}
  `;

  if (messagesLoading || isCreatingConversation) {
    return (
      <div 
        className={`${baseContainerClasses} ${themeClasses.textTertiary}`}
        style={style}
      >
        <div className="flex items-center">
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
      <div 
        className={`${baseContainerClasses} ${themeClasses.accentError}`}
        style={style}
      >
        <div className="flex items-center">
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
      <div 
        className={`${baseContainerClasses} ${themeClasses.textMuted}`}
        style={style}
      >
        <div className="space-y-2">
          <div className="flex items-center">
            <span className={`${themeClasses.accentPrompt} mr-2`}>$</span>
            <span>session-initialized</span>
          </div>
          <div className={`${themeClasses.textTertiary} text-xs ml-4`}>
            {/* Start typing to interact with the AI assistant */}
          </div>
          <div className={`${themeClasses.textTertiary} text-xs ml-4`}>
            {/* Type '/help' for available commands */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${baseContainerClasses} ${themeClasses.textSecondary}`}
      style={style}
    >
      {messages.map((message) => (
        <div 
          key={`${message.id}-${message.timestamp}`} 
          className={`mb-2 ${themeClasses.transitionFast}`}
        >
          {message.role === 'user' ? (
            <div className="flex items-start">
              <span className={`${themeClasses.accentUser} pr-2 flex-shrink-0`}>$</span>
              <span 
                className={`${themeClasses.accentUser} break-words flex-1`}
              >
                {message.content}
              </span>
            </div>
          ) : (
            <div 
              className={`
                whitespace-pre-wrap 
                ${themeClasses.pSm} 
                ${themeClasses.bgOverlay} 
                ${themeClasses.radiusSm}
                ${themeClasses.textSecondary}
                ${themeClasses.accentAssistant}
                ml-6
                border-l-2
                border-[var(--terminal-accent-assistant)]
              `}
            >
              <div className={`${themeClasses.textXs} mb-1`} style={{ color: '#f8b4cb' }}>
                AI Response:
              </div>
              {message.content}
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className={`flex items-center ${themeClasses.accentAssistant} mt-4`}>
          <span className="mr-2">⟨</span>
          <span>ai-thinking</span>
          <div className="ml-2 flex space-x-1">
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
          <span className="ml-2">⟩</span>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
