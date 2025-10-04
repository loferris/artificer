import React from 'react';
import { useCostTracker } from '../hooks/useCostTracker';
import { useTerminalThemeClasses } from '../contexts/TerminalThemeContext';

type ViewMode = 'terminal' | 'chat';

interface CostTrackerProps {
  viewMode: ViewMode;
}

export const CostTracker: React.FC<CostTrackerProps> = ({ viewMode }) => {
  const { totalCost, totalMessages, totalTokens, isLoading, error, refresh } = useCostTracker();
  const themeClasses = useTerminalThemeClasses();

  // Dynamic styles based on view mode and theme
  const isTerminal = viewMode === 'terminal';
  const containerClass = isTerminal
    ? `${themeClasses.bgSecondary} ${themeClasses.textPrimary} ${themeClasses.pSm} ${themeClasses.radiusMd} ${themeClasses.borderPrimary} border ${themeClasses.fontMono} text-xs shadow-lg min-w-[180px] max-w-[200px]`
    : `text-gray-700 ${themeClasses.pSm} border ${themeClasses.fontMono} text-xs shadow-lg min-w-[180px] max-w-[200px] rounded-xl border-pink-200`;

  const errorClass = isTerminal
    ? `${themeClasses.bgSecondary} ${themeClasses.accentError} ${themeClasses.pSm} ${themeClasses.radiusMd} ${themeClasses.borderPrimary} border ${themeClasses.fontMono} text-xs shadow-lg max-w-[200px]`
    : 'bg-red-50 text-red-800 p-3 rounded-lg border border-red-200 font-mono text-xs shadow-lg max-w-[200px]';

  if (error) {
    return (
      <div className={errorClass}>
        <div className={isTerminal ? themeClasses.accentError : 'text-red-600'}>
          $ cost_tracker --status
        </div>
        <div>ERROR: Failed to load cost data</div>
      </div>
    );
  }

  return (
    <div
      className={containerClass}
      style={
        !isTerminal
          ? {
              background:
                'linear-gradient(to bottom right, rgba(255, 255, 255, 0.9), rgba(253, 242, 248, 0.8))',
              backdropFilter: 'blur(12px)',
            }
          : undefined
      }
    >
      <div className='flex justify-between items-center mb-1'>
        <span className={isTerminal ? themeClasses.textMuted : 'text-gray-500'}>
          $ cost_tracker --summary
        </span>
        <button
          onClick={() => refresh()}
          className={
            isTerminal
              ? `${themeClasses.textMuted} hover:text-[var(--terminal-accent-success)] ${themeClasses.transitionFast} text-xs`
              : 'text-gray-500 hover:text-pink-600 transition-colors text-xs'
          }
          title='Refresh stats'
        >
          ↻
        </button>
      </div>
      <div className='space-y-1'>
        <div className='flex justify-between'>
          <span className={isTerminal ? themeClasses.textSecondary : 'text-gray-600'}>
            total_cost:
          </span>
          <span className={isTerminal ? themeClasses.accentWarning : 'text-pink-600 font-semibold'}>
            {isLoading ? '...' : `$${totalCost.toFixed(6)}`}
          </span>
        </div>
        <div className='flex justify-between'>
          <span className={isTerminal ? themeClasses.textSecondary : 'text-gray-600'}>
            messages:
          </span>
          <span
            className={isTerminal ? themeClasses.accentPrompt : 'text-purple-600 font-semibold'}
          >
            {isLoading ? '...' : totalMessages.toLocaleString()}
          </span>
        </div>
        <div className='flex justify-between'>
          <span className={isTerminal ? themeClasses.textSecondary : 'text-gray-600'}>tokens:</span>
          <span
            className={isTerminal ? themeClasses.accentAssistant : 'text-indigo-600 font-semibold'}
          >
            {isLoading ? '...' : totalTokens.toLocaleString()}
          </span>
        </div>
      </div>
      {isLoading && (
        <div
          className={`mt-2 ${isTerminal ? themeClasses.textMuted : 'text-gray-500'} animate-pulse`}
        >
          Loading stats...
        </div>
      )}
    </div>
  );
};
