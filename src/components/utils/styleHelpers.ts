import { useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';

/**
 * Utility functions for generating consistent CSS class strings
 */

export const createCostTrackerStyles = (
  isTerminal: boolean, 
  themeClasses: ReturnType<typeof useTerminalThemeClasses>
) => ({
  container: isTerminal 
    ? `fixed top-16 right-4 z-40 ${themeClasses.bgSecondary} ${themeClasses.textPrimary} ${themeClasses.pSm} ${themeClasses.radiusMd} ${themeClasses.borderPrimary} border ${themeClasses.fontMono} text-xs shadow-lg min-w-[200px]`
    : `fixed top-16 right-4 z-40 text-gray-700 ${themeClasses.pSm} border ${themeClasses.fontMono} text-xs shadow-lg min-w-[200px] rounded-xl border-pink-200`,
  
  error: isTerminal
    ? `fixed top-16 right-4 z-40 ${themeClasses.bgSecondary} ${themeClasses.accentError} ${themeClasses.pSm} ${themeClasses.radiusMd} ${themeClasses.borderPrimary} border ${themeClasses.fontMono} text-xs shadow-lg`
    : "fixed top-16 right-4 z-40 bg-red-50 text-red-800 p-3 rounded-lg border border-red-200 font-mono text-xs shadow-lg",
    
  refreshButton: isTerminal 
    ? `${themeClasses.textMuted} hover:text-[var(--terminal-accent-success)] ${themeClasses.transitionFast} text-xs`
    : "text-gray-500 hover:text-pink-600 transition-colors text-xs"
});

export const createViewSwitchButtonStyles = (
  viewMode: 'terminal' | 'chat',
  themeClasses: ReturnType<typeof import('../../contexts/TerminalThemeContext').useTerminalThemeClasses>
) => ({
  button: `
    w-full
    ${viewMode === 'terminal' 
      ? `${themeClasses.bgSecondary} ${themeClasses.textPrimary} ${themeClasses.borderPrimary} border hover:bg-[var(--terminal-bg-tertiary)] rounded-none`
      : 'text-gray-700 border border-pink-200 hover:border-pink-300 hover:text-pink-600 rounded-xl'
    }
    ${themeClasses.pSm}
    ${themeClasses.fontMono}
    text-xs
    shadow-lg
    transition-colors
  `,
  
  inlineStyle: viewMode === 'chat' ? {
    background: 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.9), rgba(253, 242, 248, 0.8))',
    backdropFilter: 'blur(12px)'
  } : undefined
});