/**
 * Shared Error Display Primitive Component
 * 
 * Provides consistent error display across terminal and chat modes
 * with different variants for various error types and contexts.
 */

import React from 'react';
import { useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';
import { Button } from './Button';

export interface ErrorDisplayProps {
  variant?: 'inline' | 'banner' | 'modal' | 'terminal';
  severity?: 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  details?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  dismissible?: boolean;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  variant = 'inline',
  severity = 'error',
  title,
  message,
  details,
  action,
  onDismiss,
  dismissible = false,
  className = '',
}) => {
  const themeClasses = useTerminalThemeClasses();

  // Severity-based styling
  const severityClasses = {
    error: {
      accent: themeClasses.accentError,
      bg: `${themeClasses.bgOverlay} border-l-4 border-[var(--terminal-accent-error)]`,
      icon: '!',
    },
    warning: {
      accent: themeClasses.accentWarning,
      bg: `${themeClasses.bgOverlay} border-l-4 border-[var(--terminal-accent-warning)]`,
      icon: '⚠',
    },
    info: {
      accent: themeClasses.accentPrompt,
      bg: `${themeClasses.bgOverlay} border-l-4 border-[var(--terminal-accent-prompt)]`,
      icon: 'i',
    },
  };

  // Variant-specific layouts
  const renderInline = () => (
    <div className={`
      ${severityClasses[severity].bg}
      ${themeClasses.pSm}
      ${themeClasses.radiusSm}
      ${themeClasses.textSm}
      ${className}
    `}>
      <div className="flex items-start gap-2">
        <span className={`
          ${severityClasses[severity].accent}
          ${themeClasses.fontMono}
          flex-shrink-0
          mt-0.5
        `}>
          {severityClasses[severity].icon}
        </span>
        <div className="flex-1">
          {title && (
            <div className={`
              ${severityClasses[severity].accent}
              ${themeClasses.fontMono}
              font-medium
              mb-1
            `}>
              {title}
            </div>
          )}
          <div className={themeClasses.textSecondary}>
            {message}
          </div>
          {details && (
            <details className="mt-2">
              <summary className={`
                ${themeClasses.textTertiary}
                ${themeClasses.textXs}
                cursor-pointer
                hover:${themeClasses.textSecondary}
              `}>
                Show details
              </summary>
              <div className={`
                mt-1
                ${themeClasses.textXs}
                ${themeClasses.fontMono}
                ${themeClasses.textMuted}
                ${themeClasses.bgPrimary}
                ${themeClasses.pXs}
                ${themeClasses.radiusSm}
                overflow-x-auto
              `}>
                {details}
              </div>
            </details>
          )}
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={`
              ${themeClasses.textTertiary}
              hover:${themeClasses.textSecondary}
              flex-shrink-0
              p-1
              rounded
              transition-colors
            `}
          >
            ×
          </button>
        )}
      </div>
      {action && (
        <div className="mt-3 pt-2 border-t border-opacity-20">
          <Button
            variant="secondary"
            size="sm"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );

  const renderBanner = () => (
    <div className={`
      ${severityClasses[severity].bg}
      ${themeClasses.pMd}
      border-t border-b
      border-opacity-20
      ${className}
    `}>
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <span className={`
            ${severityClasses[severity].accent}
            ${themeClasses.fontMono}
            text-lg
          `}>
            {severityClasses[severity].icon}
          </span>
          <div>
            {title && (
              <div className={`
                ${severityClasses[severity].accent}
                font-medium
                mb-1
              `}>
                {title}
              </div>
            )}
            <div className={themeClasses.textSecondary}>
              {message}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action && (
            <Button
              variant="secondary"
              size="sm"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className={`
                ${themeClasses.textTertiary}
                hover:${themeClasses.textSecondary}
                p-2
                rounded
                transition-colors
              `}
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderTerminal = () => (
    <div className={`
      ${themeClasses.fontMono}
      ${themeClasses.textSm}
      ${className}
    `}>
      <div className="flex items-center gap-2">
        <span className={`
          ${severityClasses[severity].accent}
          font-bold
        `}>
          {severityClasses[severity].icon}
        </span>
        <span className={`
          ${severityClasses[severity].accent}
          font-medium
        `}>
          {severity === 'error' ? 'ERROR' : severity === 'warning' ? 'WARNING' : 'INFO'}:
        </span>
        <span className={themeClasses.textSecondary}>
          {message}
        </span>
      </div>
      {details && (
        <div className={`
          mt-1 ml-6
          ${themeClasses.textXs}
          ${themeClasses.textMuted}
        `}>
          {details}
        </div>
      )}
      {action && (
        <div className="mt-2 ml-6">
          <span className={`
            ${themeClasses.textTertiary}
            ${themeClasses.textXs}
          `}>
            Run:
          </span>
          <button
            onClick={action.onClick}
            className={`
              ml-2
              ${themeClasses.accentPrompt}
              hover:underline
              ${themeClasses.textXs}
            `}
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  );

  const renderModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={dismissible ? onDismiss : undefined}
      />
      <div className={`
        relative
        ${themeClasses.bgPrimary}
        ${themeClasses.textPrimary}
        ${themeClasses.radiusMd}
        ${themeClasses.pLg}
        shadow-xl
        border border-opacity-20
        max-w-md w-full
        max-h-[80vh]
        overflow-y-auto
        ${className}
      `}>
        <div className="flex items-start gap-3">
          <span className={`
            ${severityClasses[severity].accent}
            text-xl
            flex-shrink-0
            mt-1
          `}>
            {severityClasses[severity].icon}
          </span>
          <div className="flex-1">
            {title && (
              <h3 className={`
                ${severityClasses[severity].accent}
                font-semibold
                text-lg
                mb-2
              `}>
                {title}
              </h3>
            )}
            <div className={`
              ${themeClasses.textSecondary}
              mb-4
            `}>
              {message}
            </div>
            {details && (
              <div className={`
                ${themeClasses.bgOverlay}
                ${themeClasses.pSm}
                ${themeClasses.radiusSm}
                ${themeClasses.textXs}
                ${themeClasses.fontMono}
                ${themeClasses.textMuted}
                mb-4
                overflow-x-auto
              `}>
                {details}
              </div>
            )}
            <div className="flex justify-end gap-2">
              {action && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              )}
              {dismissible && onDismiss && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onDismiss}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render based on variant
  switch (variant) {
    case 'banner': return renderBanner();
    case 'modal': return renderModal();
    case 'terminal': return renderTerminal();
    default: return renderInline();
  }
};

// Pre-configured error variants for common use cases
export const ErrorMessage: React.FC<Omit<ErrorDisplayProps, 'variant' | 'severity'>> = (props) => (
  <ErrorDisplay variant="inline" severity="error" {...props} />
);

export const WarningMessage: React.FC<Omit<ErrorDisplayProps, 'variant' | 'severity'>> = (props) => (
  <ErrorDisplay variant="inline" severity="warning" {...props} />
);

export const InfoMessage: React.FC<Omit<ErrorDisplayProps, 'variant' | 'severity'>> = (props) => (
  <ErrorDisplay variant="inline" severity="info" {...props} />
);

export const TerminalError: React.FC<Omit<ErrorDisplayProps, 'variant' | 'severity'>> = (props) => (
  <ErrorDisplay variant="terminal" severity="error" {...props} />
);

export const ErrorBanner: React.FC<Omit<ErrorDisplayProps, 'variant'>> = (props) => (
  <ErrorDisplay variant="banner" {...props} />
);

export const ErrorModal: React.FC<Omit<ErrorDisplayProps, 'variant'>> = (props) => (
  <ErrorDisplay variant="modal" {...props} />
);

// Error boundary wrapper component
export interface ErrorBoundaryDisplayProps {
  error: Error;
  resetError?: () => void;
  variant?: ErrorDisplayProps['variant'];
}

export const ErrorBoundaryDisplay: React.FC<ErrorBoundaryDisplayProps> = ({
  error,
  resetError,
  variant = 'inline',
}) => (
  <ErrorDisplay
    variant={variant}
    severity="error"
    title="Something went wrong"
    message={error.message || 'An unexpected error occurred'}
    details={error.stack}
    action={resetError ? {
      label: 'Try Again',
      onClick: resetError,
    } : undefined}
  />
);