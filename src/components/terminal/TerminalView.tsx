
import React from 'react';
import { ChatDisplay } from './ChatDisplay';
import { ChatInput } from './ChatInput';
import { TerminalHeader } from './TerminalHeader';
import { useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';
import type { Message } from '../../types';

interface TerminalViewProps {
  // Data
  /** The array of messages to display in the chat. */
  messages: Message[];
  /** The current value of the input field. */
  input: string;

  // Loading states
  /** Whether a new conversation is being created. */
  isCreatingConversation: boolean;
  /** Whether historical messages are being loaded. */
  messagesLoading: boolean;
  /** Whether a message is currently being sent or streamed. */
  isLoading: boolean;

  // Errors
  /** An error object if fetching messages failed. */
  messagesError: Error | null;

  // State checks
  /** Whether the conversation is ready to receive messages. */
  isConversationReady: boolean;
  /** Whether the send message button should be enabled. */
  canSendMessage: boolean;

  // Callbacks
  /** Callback function to handle input changes. */
  onInputChange: (value: string) => void;
  /** Callback function to handle sending a message. */
  onSendMessage: () => void;

  // Theme props
  /** Optional CSS class name for custom styling. */
  className?: string;
  /** Optional inline styles. */
  style?: React.CSSProperties;
}


/**
 * The main component for the terminal-style chat interface.
 *
 * This component assembles the terminal header, chat display, and input areas.
 * It is responsible for the overall layout and theme application.
 *
 * @param {TerminalViewProps} props - The props for the component.
 * @returns {React.ReactElement} The rendered terminal view.
 */
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
