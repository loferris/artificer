/**
 * AppShell - Main application layout and provider wrapper
 * 
 * Provides the core application structure with theme provider,
 * error boundaries, and layout composition. Acts as the main
 * container for the refactored application.
 */

import React from 'react';
import { TerminalThemeProvider, useTerminalThemeClasses } from '../contexts/TerminalThemeContext';
import { ErrorBoundary } from './ErrorBoundary';
import { CostTracker } from './CostTracker';
import { ErrorBoundaryDisplay, LoadingSpinner } from './ui';
import type { ViewMode } from '../types';

export interface AppShellProps {
  children: React.ReactNode;
  showCostTracker?: boolean;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  className?: string;
}

/**
 * Main application shell with providers and error boundaries
 */
export function AppShell({ 
  children, 
  showCostTracker = true,
  viewMode = 'terminal',
  onViewModeChange,
  className = '' 
}: AppShellProps) {
  return (
    <div className={`min-h-screen ${className}`}>
      <TerminalThemeProvider>
        <ErrorBoundary>
          <div className="relative h-screen flex flex-col">
            {/* Cost tracker - positioned absolutely */}
            {/* Floating toolbar */}
            <div className={`absolute top-1/2 -translate-y-1/2 right-0 z-30`}>
              <FloatingToolbar 
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
                showCostTracker={showCostTracker}
              />
            </div>

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
  console.log('viewMode', viewMode);
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
 * Single view mode switch button - used in top right corner
 */
export interface ViewModeSwitchButtonProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function ViewModeSwitchButton({ 
  currentMode, 
  onModeChange 
}: ViewModeSwitchButtonProps) {
  const themeClasses = useTerminalThemeClasses();
  
  const targetMode = currentMode === 'terminal' ? 'chat' : 'terminal';
  const buttonText = currentMode === 'terminal' ? '→ CHAT' : '→ TERMINAL';
  
  const isTerminal = currentMode === 'terminal';
  const buttonClass = isTerminal
    ? `
        px-3 py-1.5 
        ${themeClasses.bgSecondary}
        ${themeClasses.textSecondary}
        ${themeClasses.borderMuted}
        ${themeClasses.fontMono}
        ${themeClasses.textXs}
        ${themeClasses.radiusSm}
        ${themeClasses.transitionFast}
        border
        hover:${themeClasses.textPrimary}
        hover:${themeClasses.borderPrimary}
        focus:outline-none
        focus:ring-2
        focus:ring-offset-2
        focus:ring-offset-[var(--terminal-bg-primary)]
        focus:ring-[var(--terminal-accent-prompt)]
      `
    : `
        px-3 py-1.5 
        bg-white/80 
        backdrop-blur-sm 
        text-gray-700 
        text-xs 
        font-mono 
        rounded-md 
        border 
        border-pink-200 
        hover:bg-white 
        hover:text-gray-900 
        hover:border-pink-300 
        focus:outline-none 
        focus:ring-2 
        focus:ring-pink-500 
        focus:ring-offset-2 
        transition-all 
        duration-200 
        shadow-sm
      `;

  return (
    <button
      onClick={() => onModeChange(targetMode)}
      className={buttonClass.replace(/\s+/g, ' ').trim()}
      title={`Switch to ${targetMode} View`}
    >
      {buttonText}
    </button>
  );
}

/**
 * Floating toolbar - compact collapsible toolbar for controls
 */
export interface FloatingToolbarProps {
  viewMode: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  showCostTracker?: boolean;
}

export function FloatingToolbar({ 
  viewMode, 
  onViewModeChange, 
  showCostTracker = true 
}: FloatingToolbarProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const themeClasses = useTerminalThemeClasses();
  
  const isTerminal = viewMode === 'terminal';
  
  // Compact button styles
  const compactButtonClass = isTerminal
    ? `
        w-8 h-8 
        ${themeClasses.bgSecondary}
        ${themeClasses.textSecondary}
        ${themeClasses.borderMuted}
        ${themeClasses.radiusSm}
        ${themeClasses.transitionFast}
        border
        hover:${themeClasses.textPrimary}
        hover:${themeClasses.borderPrimary}
        flex items-center justify-center
        text-xs
        ${themeClasses.fontMono}
      `
    : `
        w-8 h-8 
        bg-white/80 
        backdrop-blur-sm 
        text-gray-700 
        border 
        border-pink-200 
        rounded-md 
        hover:bg-white 
        hover:text-gray-900 
        hover:border-pink-300 
        transition-all 
        duration-200 
        shadow-sm
        flex items-center justify-center
        text-xs
        font-mono
      `;

  return (
    <div className="flex items-center">
      {/* Expanded content - slides out from right */}
      {isExpanded && (
        <div className="flex flex-col gap-2 items-end mr-2 animate-in fade-in slide-in-from-right-4 duration-200">
          {showCostTracker && (
            <CostTracker viewMode={viewMode} />
          )}
          
          {onViewModeChange && (
            <ViewModeSwitchButton 
              currentMode={viewMode} 
              onModeChange={onViewModeChange}
            />
          )}
        </div>
      )}
      
      {/* Side tab toggle - always visible on screen edge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-6 h-12 
          ${isTerminal ? themeClasses.bgSecondary : 'bg-white/90 backdrop-blur-sm'} 
          ${isTerminal ? themeClasses.textSecondary : 'text-gray-700'}
          ${isTerminal ? themeClasses.borderMuted : 'border-pink-200'}
          border border-r-0
          ${isTerminal ? 'rounded-l-md' : 'rounded-l-md'}
          hover:${isTerminal ? themeClasses.textPrimary : 'text-gray-900'}
          transition-all duration-200 
          shadow-md
          flex items-center justify-center
          text-xs
          font-mono
          transform ${isExpanded ? 'translate-x-0' : 'translate-x-0'}
        `.replace(/\s+/g, ' ').trim()}
        title={isExpanded ? 'Hide controls' : 'Show controls'}
      >
        <div className="transform rotate-90 whitespace-nowrap text-xs">
          {isExpanded ? '×' : '⋯'}
        </div>
      </button>
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