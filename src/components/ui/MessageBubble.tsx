/**
 * Shared Message Bubble Primitive Component
 *
 * Provides consistent message display across terminal and chat modes
 * with support for different roles, content types, and interactions.
 */

import React from 'react';
import { format } from 'date-fns';
import { useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';
import { LoadingSpinner } from './LoadingSpinner';
import { StreamingMessage } from '../streaming/StreamingMessage';

export interface MessageBubbleProps {
  variant?: 'terminal' | 'chat' | 'compact';
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date | string;
  isStreaming?: boolean;
  isComplete?: boolean;
  isLoading?: boolean;
  showTimestamp?: boolean;
  showAvatar?: boolean;
  avatar?: React.ReactNode;
  metadata?: {
    model?: string;
    tokens?: number;
    cost?: number;
  };
  onCopy?: () => void;
  onRetry?: () => void;
  className?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  variant = 'terminal',
  role,
  content,
  timestamp,
  isStreaming = false,
  isComplete = true,
  isLoading = false,
  showTimestamp = false,
  showAvatar = false,
  avatar,
  metadata,
  onCopy,
  onRetry,
  className = '',
}) => {
  const themeClasses = useTerminalThemeClasses();

  // Role-based styling
  const roleStyles = {
    user: {
      accent: themeClasses.accentUser,
      prompt: '$',
      label: 'User',
    },
    assistant: {
      accent: themeClasses.accentAssistant,
      prompt: '>',
      label: 'AI Assistant',
    },
    system: {
      accent: themeClasses.accentPrompt,
      prompt: '#',
      label: 'System',
    },
  };

  // Format timestamp
  const formatTimestamp = (ts: Date | string) => {
    const date = typeof ts === 'string' ? new Date(ts) : ts;
    return format(date, 'HH:mm');
  };

  // Terminal variant
  const renderTerminal = () => (
    <div className={`mb-2 ${themeClasses.transitionFast} ${className}`}>
      {role === 'user' ? (
        // User message in terminal style
        <div className='flex items-start'>
          <span className={`${roleStyles[role].accent} pr-2 flex-shrink-0`}>
            {roleStyles[role].prompt}
          </span>
          <div className='flex-1'>
            <span className={`${roleStyles[role].accent} break-words`}>{content}</span>
            {showTimestamp && timestamp && (
              <span
                className={`
                ml-2 
                ${themeClasses.textXs} 
                ${themeClasses.textMuted}
              `}
              >
                {formatTimestamp(timestamp)}
              </span>
            )}
          </div>
        </div>
      ) : (
        // Assistant/system message with background
        <div
          className={`
          whitespace-pre-wrap 
          ${themeClasses.pSm} 
          ${themeClasses.bgOverlay} 
          ${themeClasses.radiusSm}
          ${themeClasses.textSecondary}
          ml-6
          border-l-2
          border-[var(--terminal-accent-${role})]
          relative
          group
        `}
        >
          {/* Message header */}
          <div
            className={`
            ${themeClasses.textXs} 
            ${themeClasses.textMuted} 
            mb-1
            flex items-center justify-between
          `}
          >
            <span>{roleStyles[role].label}:</span>
            <div className='flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
              {onCopy && (
                <button
                  onClick={onCopy}
                  className={`
                    ${themeClasses.textTertiary}
                    hover:${themeClasses.textSecondary}
                    ${themeClasses.textXs}
                  `}
                >
                  copy
                </button>
              )}
              {onRetry && role === 'assistant' && (
                <button
                  onClick={onRetry}
                  className={`
                    ${themeClasses.textTertiary}
                    hover:${themeClasses.textSecondary}
                    ${themeClasses.textXs}
                  `}
                >
                  retry
                </button>
              )}
              {showTimestamp && timestamp && (
                <span className={`${themeClasses.textXs} ${themeClasses.textMuted}`}>
                  {formatTimestamp(timestamp)}
                </span>
              )}
            </div>
          </div>

          {/* Message content */}
          {isLoading ? (
            <LoadingSpinner variant='thinking' size='sm' />
          ) : isStreaming && !isComplete ? (
            <StreamingMessage content={content} isComplete={isComplete} />
          ) : (
            <div>{content}</div>
          )}

          {/* Message metadata */}
          {metadata && (
            <div
              className={`
              mt-2 pt-2 
              border-t border-opacity-10
              ${themeClasses.textXs}
              ${themeClasses.textTertiary}
              flex items-center gap-4
            `}
            >
              {metadata.model && <span>model: {metadata.model}</span>}
              {metadata.tokens && <span>tokens: {metadata.tokens}</span>}
              {metadata.cost && <span>cost: ${metadata.cost.toFixed(4)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Chat variant (more traditional chat bubble)
  const renderChat = () => (
    <div
      className={`
      flex 
      ${role === 'user' ? 'justify-end' : 'justify-start'}
      mb-4
      ${className}
    `}
    >
      <div
        className={`
        max-w-[70%]
        ${
          role === 'user'
            ? `${themeClasses.accentUser} bg-current ${themeClasses.textPrimary} rounded-l-lg rounded-tr-lg`
            : `${themeClasses.bgOverlay} ${themeClasses.textSecondary} rounded-r-lg rounded-tl-lg`
        }
        ${themeClasses.pMd}
        ${themeClasses.radiusMd}
        shadow-sm
        relative
        group
      `}
      >
        {/* Avatar */}
        {showAvatar && role !== 'user' && (
          <div className='absolute -left-8 top-0'>
            {avatar || (
              <div
                className={`
                w-6 h-6
                ${themeClasses.bgSecondary}
                ${themeClasses.accentAssistant}
                rounded-full
                flex items-center justify-center
                ${themeClasses.textXs}
              `}
              >
                AI
              </div>
            )}
          </div>
        )}

        {/* Message content */}
        {isLoading ? (
          <LoadingSpinner variant='dots' size='sm' />
        ) : isStreaming && !isComplete ? (
          <StreamingMessage content={content} isComplete={isComplete} />
        ) : (
          <div className='prose prose-sm max-w-none'>{content}</div>
        )}

        {/* Timestamp and actions */}
        {(showTimestamp || onCopy || onRetry) && (
          <div
            className={`
            mt-2 pt-2
            border-t border-opacity-10
            flex items-center justify-between
            ${themeClasses.textXs}
            opacity-0 group-hover:opacity-100
            transition-opacity
          `}
          >
            <div className='flex items-center gap-2'>
              {onCopy && (
                <button
                  onClick={onCopy}
                  className={`
                    ${themeClasses.textTertiary}
                    hover:${themeClasses.textSecondary}
                  `}
                >
                  Copy
                </button>
              )}
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`
                    ${themeClasses.textTertiary}
                    hover:${themeClasses.textSecondary}
                  `}
                >
                  Retry
                </button>
              )}
            </div>
            {showTimestamp && timestamp && (
              <span className={themeClasses.textMuted}>{formatTimestamp(timestamp)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Compact variant (single line)
  const renderCompact = () => (
    <div
      className={`
      flex items-center gap-2
      ${themeClasses.textSm}
      ${themeClasses.fontMono}
      ${className}
    `}
    >
      <span className={`${roleStyles[role].accent} flex-shrink-0`}>{roleStyles[role].prompt}</span>
      <span
        className={`
        ${role === 'user' ? roleStyles[role].accent : themeClasses.textSecondary}
        truncate
      `}
      >
        {isLoading ? 'Loading...' : content}
      </span>
      {showTimestamp && timestamp && (
        <span
          className={`
          ${themeClasses.textXs} 
          ${themeClasses.textMuted}
          flex-shrink-0
        `}
        >
          {formatTimestamp(timestamp)}
        </span>
      )}
    </div>
  );

  // Render based on variant
  switch (variant) {
    case 'chat':
      return renderChat();
    case 'compact':
      return renderCompact();
    default:
      return renderTerminal();
  }
};

// Pre-configured message variants for common use cases
export const UserMessage: React.FC<Omit<MessageBubbleProps, 'role'>> = (props) => (
  <MessageBubble role='user' {...props} />
);

export const AssistantMessage: React.FC<Omit<MessageBubbleProps, 'role'>> = (props) => (
  <MessageBubble role='assistant' {...props} />
);

export const SystemMessage: React.FC<Omit<MessageBubbleProps, 'role'>> = (props) => (
  <MessageBubble role='system' {...props} />
);

// Message list container for multiple messages
export interface MessageListProps {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date | string;
    isStreaming?: boolean;
    isComplete?: boolean;
    metadata?: MessageBubbleProps['metadata'];
  }>;
  variant?: MessageBubbleProps['variant'];
  showTimestamps?: boolean;
  showAvatars?: boolean;
  onCopyMessage?: (messageId: string, content: string) => void;
  onRetryMessage?: (messageId: string) => void;
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  variant = 'terminal',
  showTimestamps = false,
  showAvatars = false,
  onCopyMessage,
  onRetryMessage,
  className = '',
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          variant={variant}
          role={message.role}
          content={message.content}
          timestamp={message.timestamp}
          isStreaming={message.isStreaming}
          isComplete={message.isComplete}
          showTimestamp={showTimestamps}
          showAvatar={showAvatars}
          metadata={message.metadata}
          onCopy={onCopyMessage ? () => onCopyMessage(message.id, message.content) : undefined}
          onRetry={
            onRetryMessage && message.role === 'assistant'
              ? () => onRetryMessage(message.id)
              : undefined
          }
        />
      ))}
    </div>
  );
};
