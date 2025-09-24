
import React, { useRef, useEffect, useState } from 'react';
import { useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  isConversationReady: boolean;
  isLoading: boolean;
  canSendMessage: boolean;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  onInputChange,
  onSendMessage,
  isConversationReady,
  isLoading,
  canSendMessage,
  className = '',
  style,
  placeholder,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const themeClasses = useTerminalThemeClasses();
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (inputRef.current && !isLoading) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && canSendMessage) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const getPlaceholderText = (): string => {
    if (placeholder) return placeholder;
    return 'enter-command...';
  };

  const getPromptColor = (): string => {
    if (isLoading) return themeClasses.accentWarning;
    if (canSendMessage && input.trim()) return themeClasses.accentSuccess;
    return themeClasses.accentPrompt;
  };

  const getInputStatus = (): string => {
    if (isLoading) return 'PROCESSING';
    if (input.trim() && canSendMessage) return 'READY';
    if (input.trim() && !canSendMessage) return 'BLOCKED';
    return 'WAITING';
  };

  return (
    <div 
      className={`
        ${themeClasses.bgPrimary}
        ${themeClasses.borderMuted}
        ${themeClasses.pSm}
        ${themeClasses.transitionFast}
        border-t
        ${className}
      `}
      style={style}
    >
      <div className="space-y-2">
        {/* Input Line */}
        <div className="flex items-center">
          <span 
            className={`
              ${getPromptColor()} 
              ${themeClasses.fontMono}
              pr-2 
              flex-shrink-0
              font-bold
            `}
          >
            $
          </span>
          <input
            id="chat-input"
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={getPlaceholderText()}
            disabled={isLoading}
            className={`
              flex-1 
              bg-transparent 
              ${themeClasses.accentUser}
              ${themeClasses.textPlaceholder}
              ${themeClasses.fontMono}
              ${themeClasses.focusOutline}
              ${themeClasses.disabledOpacity}
              ${themeClasses.transitionFast}
              focus:outline-none
              ${isLoading ? 'cursor-not-allowed' : ''}
            `}
            autoComplete="off"
          />
          
          {/* Cursor indicator when focused */}
          {isFocused && !isLoading && (
            <div 
              className={`
                ml-1 
                w-2 
                h-4 
                ${themeClasses.accentPrompt}
                bg-current
                animate-pulse
              `}
            />
          )}
        </div>
        
        {/* Status Line */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span 
              className={`
                ${themeClasses.textMuted}
                ${themeClasses.fontMono}
              `}
            >
              [{getInputStatus()}] {!canSendMessage && input.trim() && `(ready:${isConversationReady}, loading:${isLoading})`}
            </span>
            
            {input.trim() && (
              <span 
                className={`
                  ${themeClasses.textTertiary}
                  ${themeClasses.fontMono}
                `}
              >
                {input.length} chars
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Send Indicator */}
            {canSendMessage && input.trim() && (
              <span 
                className={`
                  ${themeClasses.accentSuccess}
                  ${themeClasses.fontMono}
                  text-xs
                `}
                title="Press Enter to send"
              >
                ↵ SEND
              </span>
            )}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-1">
                <div 
                  className={`
                    w-1 
                    h-1 
                    ${themeClasses.accentWarning}
                    bg-current
                    rounded-full 
                    animate-ping
                  `}
                />
                <span 
                  className={`
                    ${themeClasses.accentWarning}
                    ${themeClasses.fontMono}
                    text-xs
                  `}
                >
                  BUSY
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
