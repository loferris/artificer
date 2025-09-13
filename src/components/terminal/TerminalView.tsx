
import React from 'react';
import { ChatDisplay } from './ChatDisplay';
import { ChatInput } from './ChatInput';
import { TerminalHeader } from './TerminalHeader';
import { useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';
import type { Message, Conversation } from '../types';

interface TerminalViewProps {
  // Data
  messages: Message[];
  input: string;

  // Loading states
  isCreatingConversation: boolean;
  messagesLoading: boolean;
  isLoading: boolean;

  // Errors
  messagesError: Error | null;

  // State checks
  isConversationReady: boolean;
  canSendMessage: boolean;

  // Callbacks
  onInputChange: (value: string) => void;
  onSendMessage: () => void;

  // Theme props
  className?: string;
  style?: React.CSSProperties;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  messages,
  input,
  isCreatingConversation,
  messagesLoading,
  isLoading,
  messagesError,
  isConversationReady,
  canSendMessage,
  onInputChange,
  onSendMessage,
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
        <TerminalHeader />
        
        <ChatDisplay
          messages={messages}
          isLoading={isLoading}
          isCreatingConversation={isCreatingConversation}
          messagesLoading={messagesLoading}
          messagesError={messagesError}
        />

        <ChatInput
          input={input}
          onInputChange={onInputChange}
          onSendMessage={onSendMessage}
          isConversationReady={isConversationReady}
          isLoading={isLoading}
          canSendMessage={canSendMessage}
        />
      </div>
    </div>
  );
};
