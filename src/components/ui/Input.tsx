/**
 * Shared Input Primitive Component
 *
 * Provides consistent input styling for terminal and chat modes
 * with status indicators, validation states, and accessibility.
 */

import React, { forwardRef, useState } from 'react';
import { useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'terminal' | 'chat';
  size?: 'sm' | 'md' | 'lg';
  state?: 'default' | 'success' | 'warning' | 'error' | 'disabled';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label?: string;
  helperText?: string;
  showStatus?: boolean;
  statusText?: string;
  isLoading?: boolean;
  onEnterPress?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'terminal',
      size = 'md',
      state = 'default',
      leftIcon,
      rightIcon,
      label,
      helperText,
      showStatus = false,
      statusText,
      isLoading = false,
      disabled,
      className = '',
      onKeyDown,
      onEnterPress,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const themeClasses = useTerminalThemeClasses();
    const [isFocused, setIsFocused] = useState(false);

    // Handle focus/blur events
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    // Handle key events
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onEnterPress) {
        e.preventDefault();
        onEnterPress();
      }
      onKeyDown?.(e);
    };

    // Size variants
    const sizeClasses = {
      sm: `${themeClasses.textSm} ${themeClasses.pSm} min-h-[32px]`,
      md: `${themeClasses.textSm} ${themeClasses.pMd} min-h-[40px]`,
      lg: `${themeClasses.textMd} ${themeClasses.pLg} min-h-[48px]`,
    };

    // State-based styling
    const stateClasses = {
      default: `
      ${themeClasses.bgPrimary}
      ${themeClasses.textPrimary}
      ${themeClasses.borderMuted}
      focus:${themeClasses.borderPrimary}
    `,
      success: `
      ${themeClasses.bgPrimary}
      ${themeClasses.textPrimary}
      ${themeClasses.accentSuccess}
      border-current
      focus:border-current
    `,
      warning: `
      ${themeClasses.bgPrimary}
      ${themeClasses.textPrimary}
      ${themeClasses.accentWarning}
      border-current
      focus:border-current
    `,
      error: `
      ${themeClasses.bgPrimary}
      ${themeClasses.textPrimary}
      ${themeClasses.accentError}
      border-current
      focus:border-current
    `,
      disabled: `
      ${themeClasses.bgOverlay}
      ${themeClasses.textDisabled}
      ${themeClasses.borderMuted}
      cursor-not-allowed
    `,
    };

    // Variant-specific styling
    const variantClasses = {
      terminal: `
      ${themeClasses.fontMono}
      ${themeClasses.radiusSm}
      border
      ${themeClasses.transitionFast}
      ${themeClasses.focusOutline}
    `,
      chat: `
      font-sans
      ${themeClasses.radiusMd}
      border
      ${themeClasses.transitionFast}
      shadow-sm
      focus:shadow-md
    `,
    };

    // Status indicator styling
    const getStatusColor = () => {
      switch (state) {
        case 'success':
          return themeClasses.accentSuccess;
        case 'warning':
          return themeClasses.accentWarning;
        case 'error':
          return themeClasses.accentError;
        default:
          return themeClasses.accentPrompt;
      }
    };

    // Loading spinner
    const LoadingSpinner = () => (
      <div
        className={`
      w-4 h-4 border-2 border-current border-t-transparent 
      rounded-full animate-spin opacity-50
    `}
      />
    );

    const inputClasses = `
    w-full
    ${sizeClasses[size]}
    ${stateClasses[disabled ? 'disabled' : state]}
    ${variantClasses[variant]}
    ${leftIcon ? 'pl-10' : ''}
    ${rightIcon || isLoading ? 'pr-10' : ''}
    placeholder:${themeClasses.textMuted}
    ${className}
  `
      .trim()
      .replace(/\s+/g, ' ');

    return (
      <div className='w-full'>
        {/* Label */}
        {label && (
          <label
            className={`
          block mb-1 
          ${themeClasses.textSm} 
          ${themeClasses.textSecondary}
          ${themeClasses.fontMono}
        `}
          >
            {label}
          </label>
        )}

        {/* Input container */}
        <div className='relative'>
          {/* Left icon */}
          {leftIcon && (
            <div
              className={`
            absolute left-3 top-1/2 transform -translate-y-1/2
            ${themeClasses.textMuted}
            pointer-events-none
          `}
            >
              {leftIcon}
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            className={inputClasses}
            disabled={disabled || isLoading}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            {...props}
          />

          {/* Right icon or loading */}
          {(rightIcon || isLoading) && (
            <div
              className={`
            absolute right-3 top-1/2 transform -translate-y-1/2
            ${themeClasses.textMuted}
            ${isLoading ? '' : 'pointer-events-none'}
          `}
            >
              {isLoading ? <LoadingSpinner /> : rightIcon}
            </div>
          )}

          {/* Terminal-style prompt indicator */}
          {variant === 'terminal' && (
            <div
              className={`
            absolute -left-6 top-1/2 transform -translate-y-1/2
            ${getStatusColor()}
            ${themeClasses.textSm}
            ${themeClasses.fontMono}
          `}
            >
              $
            </div>
          )}
        </div>

        {/* Status line for terminal variant */}
        {showStatus && variant === 'terminal' && (
          <div
            className={`
          flex items-center justify-between mt-1
          ${themeClasses.textXs}
          ${themeClasses.fontMono}
          ${themeClasses.textTertiary}
        `}
          >
            <span>{statusText || 'READY'}</span>
            {isFocused && <span className={`${getStatusColor()}`}>{state.toUpperCase()}</span>}
          </div>
        )}

        {/* Helper text */}
        {helperText && (
          <p
            className={`
          mt-1 
          ${themeClasses.textXs}
          ${state === 'error' ? themeClasses.accentError : themeClasses.textTertiary}
        `}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

// Pre-configured input variants
export const TerminalInput: React.FC<Omit<InputProps, 'variant'>> = (props) => (
  <Input variant='terminal' {...props} />
);

export const ChatInput: React.FC<Omit<InputProps, 'variant'>> = (props) => (
  <Input variant='chat' {...props} />
);

// Input group for related fields
export interface InputGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({ children, className = '' }) => {
  return <div className={`space-y-4 ${className}`}>{children}</div>;
};
