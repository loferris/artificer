/**
 * Shared Message Renderer Component
 * 
 * Extracts common message rendering logic used across terminal and chat views.
 * Provides consistent message display with support for streaming, user/assistant roles,
 * and theme-aware styling.
 */

import React from 'react';
import { StreamingMessage } from '../streaming/StreamingMessage';
import { useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';
import type { Message } from '../../types';

export interface MessageRendererProps {
  message: Message;
  isStreaming?: boolean;
  variant?: 'terminal' | 'chat';
  className?: string;
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({
  message,
  isStreaming = false,
  variant = 'terminal',
  className = '',
}) => {
  const themeClasses = useTerminalThemeClasses();

  if (message.role === 'user') {
    return (
      <div className={`flex items-start ${className}`}>
        {variant === 'terminal' && (
          <span className={`${themeClasses.accentUser} pr-2 flex-shrink-0`}>$</span>
        )}
        <span 
          className={`
            ${themeClasses.accentUser} 
            break-words 
            flex-1
            ${variant === 'chat' ? 'font-medium' : ''}
          `}
        >
          {message.content}
        </span>
      </div>
    );
  }

  // Assistant message
  return (
    <div 
      className={`
        ${variant === 'terminal' ? `
          whitespace-pre-wrap 
          ${themeClasses.pSm} 
          ${themeClasses.bgOverlay} 
          ${themeClasses.radiusSm}
          ${themeClasses.textSecondary}
          ${themeClasses.accentAssistant}
          ml-6
          border-l-2
          border-[var(--terminal-accent-assistant)]
        ` : `
          ${themeClasses.bgOverlay}
          ${themeClasses.pMd}
          ${themeClasses.radiusMd}
          ${themeClasses.textSecondary}
        `}
        ${className}
      `}
    >
      {variant === 'terminal' && (
        <div className={`${themeClasses.textXs} mb-1`} style={{ color: '#f8b4cb' }}>
          AI Response:
        </div>
      )}
      
      {isStreaming && !('isComplete' in message && (message as any).isComplete) ? (
        <StreamingMessage 
          content={message.content} 
          isComplete={('isComplete' in message ? (message as any).isComplete : false) || false}
        />
      ) : (
        <div className={variant === 'chat' ? 'prose prose-sm max-w-none' : ''}>
          {message.content}
        </div>
      )}
    </div>
  );
};

export interface MessageListRendererProps {
  messages: Message[];
  isStreaming?: boolean;
  variant?: 'terminal' | 'chat';
  className?: string;
}

export const MessageListRenderer: React.FC<MessageListRendererProps> = ({
  messages,
  isStreaming = false,
  variant = 'terminal',
  className = '',
}) => {
  const themeClasses = useTerminalThemeClasses();

  return (
    <div className={className}>
      {messages.map((message) => (
        <div 
          key={`${message.id}-${message.timestamp}`} 
          className={`mb-2 ${themeClasses.transitionFast}`}
        >
          <MessageRenderer 
            message={message}
            isStreaming={isStreaming}
            variant={variant}
          />
        </div>
      ))}
    </div>
  );
};