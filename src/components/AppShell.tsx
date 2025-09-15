/**
 * AppShell - Main application layout and provider wrapper
 * 
 * Provides the core application structure with theme provider,
 * error boundaries, and layout composition. Acts as the main
 * container for the refactored application.
 */

import React from 'react';
import { TerminalThemeProvider } from '../contexts/TerminalThemeContext';
import { ErrorBoundary } from './ErrorBoundary';
import { CostTracker } from './CostTracker';
import { ErrorBoundaryDisplay, LoadingSpinner } from './ui';
import type { ViewMode } from '../types';

export interface AppShellProps {
  children: React.ReactNode;
  showCostTracker?: boolean;
  className?: string;
}

/**
 * Main application shell with providers and error boundaries
 */
export function AppShell({ 
  children, 
  showCostTracker = true, 
  className = '' 
}: AppShellProps) {
  return (
    <div className={`min-h-screen ${className}`}>
      <TerminalThemeProvider>
        <ErrorBoundary>
          <div className="relative h-screen flex flex-col">
            {/* Cost tracker - positioned absolutely */}
            {showCostTracker && (
              <div className="absolute top-4 right-4 z-50">
                <CostTracker viewMode="terminal" />
              </div>
            )}

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {children}
            </div>
          </div>
        </ErrorBoundary>
      </TerminalThemeProvider>
    </div>
  );
}

/**
 * Interface switcher component - handles view mode transitions
 */
export interface InterfaceSwitcherProps {
  viewMode: ViewMode;
  terminalInterface: React.ReactNode;
  chatInterface: React.ReactNode;
  showModeToggle?: boolean;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function InterfaceSwitcher({
  viewMode,
  terminalInterface,
  chatInterface,
  showModeToggle = true,
  onViewModeChange,
}: InterfaceSwitcherProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* View mode toggle */}
      {showModeToggle && onViewModeChange && (
        <ViewModeToggle
          currentMode={viewMode}
          onModeChange={onViewModeChange}
        />
      )}

      {/* Interface content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'terminal' ? terminalInterface : chatInterface}
      </div>
    </div>
  );
}

/**
 * View mode toggle component
 */
export interface ViewModeToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewModeToggle({ 
  currentMode, 
  onModeChange, 
  className = '' 
}: ViewModeToggleProps) {
  return (
    <div className={`flex items-center justify-center p-2 border-b border-gray-200 ${className}`}>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onModeChange('terminal')}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${currentMode === 'terminal' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          Terminal
        </button>
        <button
          onClick={() => onModeChange('chat')}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${currentMode === 'chat' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          Chat
        </button>
      </div>
    </div>
  );
}

/**
 * Loading shell - shown during application initialization
 */
export interface LoadingShellProps {
  message?: string;
  showSpinner?: boolean;
}

export function LoadingShell({ 
  message = 'Loading...', 
  showSpinner = true 
}: LoadingShellProps) {
  return (
    <AppShell>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          {showSpinner && (
            <div className="mb-4">
              <LoadingSpinner size="lg" text={message} />
            </div>
          )}
          {!showSpinner && (
            <p className="text-gray-600">{message}</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/**
 * Error shell - shown when application fails to load
 */
export interface ErrorShellProps {
  error: Error;
  onRetry?: () => void;
  showRetryButton?: boolean;
}

export function ErrorShell({ 
  error, 
  onRetry, 
  showRetryButton = true 
}: ErrorShellProps) {
  return (
    <AppShell showCostTracker={false}>
      <div className="flex-1 flex items-center justify-center">
        <ErrorBoundaryDisplay
          error={error}
          resetError={showRetryButton && onRetry ? onRetry : undefined}
          variant="inline"
        />
      </div>
    </AppShell>
  );
}

/**
 * Layout utilities for common layouts
 */
export const LayoutUtils = {
  /**
   * Creates a standard two-column layout
   */
  createTwoColumnLayout: (
    leftContent: React.ReactNode,
    rightContent: React.ReactNode,
    leftWidth = 'w-1/3',
    rightWidth = 'w-2/3'
  ) => (
    <div className="flex h-full">
      <div className={`${leftWidth} border-r border-gray-200`}>
        {leftContent}
      </div>
      <div className={`${rightWidth}`}>
        {rightContent}
      </div>
    </div>
  ),

  /**
   * Creates a standard three-column layout
   */
  createThreeColumnLayout: (
    leftContent: React.ReactNode,
    centerContent: React.ReactNode,
    rightContent: React.ReactNode,
    widths = { left: 'w-1/4', center: 'w-1/2', right: 'w-1/4' }
  ) => (
    <div className="flex h-full">
      <div className={`${widths.left} border-r border-gray-200`}>
        {leftContent}
      </div>
      <div className={`${widths.center} border-r border-gray-200`}>
        {centerContent}
      </div>
      <div className={`${widths.right}`}>
        {rightContent}
      </div>
    </div>
  ),

  /**
   * Creates a centered single-column layout
   */
  createCenteredLayout: (
    content: React.ReactNode,
    maxWidth = 'max-w-4xl'
  ) => (
    <div className="flex-1 flex justify-center">
      <div className={`${maxWidth} w-full px-4`}>
        {content}
      </div>
    </div>
  ),

  /**
   * Creates a full-height scrollable layout
   */
  createScrollableLayout: (content: React.ReactNode) => (
    <div className="flex-1 overflow-y-auto">
      {content}
    </div>
  ),
};