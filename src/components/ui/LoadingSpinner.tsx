/**
 * Shared Loading Spinner Primitive Component
 * 
 * Provides consistent loading indicators across terminal and chat modes
 * with different variants for various loading states.
 */

import React from 'react';
import { useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';

export interface LoadingSpinnerProps {
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars' | 'thinking';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'default' | 'primary' | 'secondary' | 'muted';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  variant = 'spinner',
  size = 'md',
  color = 'default',
  text,
  className = '',
}) => {
  const themeClasses = useTerminalThemeClasses();

  // Size variants
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  // Color variants
  const colorClasses = {
    default: themeClasses.textPrimary,
    primary: themeClasses.accentPrompt,
    secondary: themeClasses.textSecondary,
    muted: themeClasses.textMuted,
  };

  // Spinner variant (classic rotating circle)
  const SpinnerIcon = () => (
    <div className={`
      ${sizeClasses[size]}
      border-2
      border-current
      border-t-transparent
      rounded-full
      animate-spin
    `} />
  );

  // Dots variant (three bouncing dots)
  const DotsIcon = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`
            ${size === 'xs' ? 'w-1 h-1' : size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'}
            bg-current
            rounded-full
            animate-bounce
          `}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );

  // Pulse variant (growing/shrinking circle)
  const PulseIcon = () => (
    <div className={`
      ${sizeClasses[size]}
      bg-current
      rounded-full
      animate-pulse
      opacity-60
    `} />
  );

  // Bars variant (loading bars)
  const BarsIcon = () => (
    <div className="flex space-x-0.5 items-end">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`
            ${size === 'xs' ? 'w-0.5' : size === 'sm' ? 'w-1' : 'w-1.5'}
            bg-current
            rounded-sm
            animate-pulse
          `}
          style={{ 
            height: size === 'xs' ? '8px' : size === 'sm' ? '12px' : '16px',
            animationDelay: `${i * 100}ms`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  );

  // Thinking variant (terminal-style indicator)
  const ThinkingIcon = () => (
    <div className={`flex items-center space-x-2 ${themeClasses.fontMono}`}>
      <span className={colorClasses[color]}>⟨</span>
      <span className={`${themeClasses.textMuted} ${themeClasses.textSm}`}>
        {text || 'ai-thinking'}
      </span>
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`
              w-1 h-1
              ${colorClasses[color]}
              bg-current
              rounded-full
              animate-bounce
            `}
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <span className={colorClasses[color]}>⟩</span>
    </div>
  );

  // Select the appropriate icon based on variant
  const renderIcon = () => {
    switch (variant) {
      case 'dots': return <DotsIcon />;
      case 'pulse': return <PulseIcon />;
      case 'bars': return <BarsIcon />;
      case 'thinking': return <ThinkingIcon />;
      default: return <SpinnerIcon />;
    }
  };

  const containerClasses = `
    inline-flex
    items-center
    justify-center
    ${colorClasses[color]}
    ${variant === 'thinking' ? '' : 'gap-2'}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={containerClasses}>
      {renderIcon()}
      {text && variant !== 'thinking' && (
        <span className={`
          ${themeClasses.textSm}
          ${themeClasses.fontMono}
          ${colorClasses[color]}
        `}>
          {text}
        </span>
      )}
    </div>
  );
};

// Pre-configured loading variants for common use cases
export const ProcessingSpinner: React.FC<Omit<LoadingSpinnerProps, 'variant' | 'text'>> = (props) => (
  <LoadingSpinner variant="thinking" text="processing..." {...props} />
);

export const LoadingDots: React.FC<Omit<LoadingSpinnerProps, 'variant'>> = (props) => (
  <LoadingSpinner variant="dots" {...props} />
);

export const LoadingBars: React.FC<Omit<LoadingSpinnerProps, 'variant'>> = (props) => (
  <LoadingSpinner variant="bars" {...props} />
);

// Loading overlay for full-screen loading states
export interface LoadingOverlayProps extends LoadingSpinnerProps {
  isVisible: boolean;
  message?: string;
  backdrop?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message,
  backdrop = true,
  ...spinnerProps
}) => {
  const themeClasses = useTerminalThemeClasses();

  if (!isVisible) return null;

  return (
    <div className={`
      fixed inset-0 z-50 flex items-center justify-center
      ${backdrop ? `${themeClasses.bgOverlay} backdrop-blur-sm` : ''}
    `}>
      <div className={`
        flex flex-col items-center gap-4
        ${themeClasses.bgPrimary}
        ${themeClasses.textPrimary}
        ${themeClasses.pLg}
        ${themeClasses.radiusMd}
        ${backdrop ? 'shadow-lg border border-opacity-20' : ''}
      `}>
        <LoadingSpinner {...spinnerProps} />
        {message && (
          <p className={`
            ${themeClasses.textSm}
            ${themeClasses.textSecondary}
            text-center
            max-w-sm
          `}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

// Inline loading states for components
export interface LoadingStateProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  variant?: LoadingSpinnerProps['variant'];
  size?: LoadingSpinnerProps['size'];
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  loadingText,
  children,
  variant = 'spinner',
  size = 'sm',
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <LoadingSpinner
          variant={variant}
          size={size}
          text={loadingText}
        />
      </div>
    );
  }

  return <>{children}</>;
};