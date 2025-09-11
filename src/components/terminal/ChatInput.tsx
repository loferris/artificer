
import React, { useRef, useEffect } from 'react';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  isConversationReady: boolean;
  isLoading: boolean;
  canSendMessage: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  onInputChange,
  onSendMessage,
  isConversationReady,
  isLoading,
  canSendMessage,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && !isLoading) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="p-2 bg-gray-800">
      <div className="flex items-center">
        <span className="text-green-400 pl-2 pr-1">$</span>
        <input
          id="chat-input"
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isConversationReady ? 'Enter command...' : 'Select or create a conversation to begin.'}
          disabled={!isConversationReady || isLoading}
          className="flex-1 bg-transparent text-gray-200 focus:outline-none placeholder-gray-500"
          autoComplete="off"
        />
      </div>
    </div>
  );
};
