import React, { useState } from 'react';
import { useTerminalTheme, useTerminalThemeClasses, TerminalTheme } from '../../contexts/TerminalThemeContext';

interface ThemeSelectorProps {
  className?: string;
  compact?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ 
  className = '', 
  compact = false 
}) => {
  const { theme, setTheme, availableThemes, getThemeDisplayName, toggleTheme } = useTerminalTheme();
  const classes = useTerminalThemeClasses();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeSelect = (selectedTheme: TerminalTheme) => {
    setTheme(selectedTheme);
    setIsOpen(false);
  };

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        className={`
          ${classes.textTertiary} 
          ${classes.hoverBg} 
          ${classes.focusOutline}
          ${classes.textXs}
          ${classes.fontMono}
          ${classes.transitionFast}
          ${classes.radiusSm}
          ${classes.pXs}
          cursor-pointer
          ${className}
        `}
        title={`Current theme: ${getThemeDisplayName(theme)}. Click to cycle themes.`}
      >
        /theme
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${classes.bgSecondary}
          ${classes.textSecondary}
          ${classes.borderPrimary}
          ${classes.hoverBg}
          ${classes.focusOutline}
          ${classes.textSm}
          ${classes.fontMono}
          ${classes.transitionFast}
          ${classes.radiusSm}
          ${classes.pSm}
          border
          cursor-pointer
          min-w-[120px]
          text-left
          flex
          items-center
          justify-between
        `}
      >
        <span>{getThemeDisplayName(theme)}</span>
        <span 
          className={`
            ${classes.textMuted}
            transform
            transition-transform
            ${isOpen ? 'rotate-180' : ''}
          `}
        >
          ▼
        </span>
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[var(--terminal-z-overlay)]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div
            className={`
              absolute
              top-full
              left-0
              mt-1
              ${classes.bgSecondary}
              ${classes.borderPrimary}
              ${classes.radiusSm}
              border
              shadow-lg
              z-[var(--terminal-z-modal)]
              min-w-[200px]
              overflow-hidden
            `}
          >
            {availableThemes.map((themeName) => (
              <button
                key={themeName}
                onClick={() => handleThemeSelect(themeName)}
                className={`
                  w-full
                  text-left
                  ${classes.pSm}
                  ${classes.textSm}
                  ${classes.fontMono}
                  ${classes.transitionFast}
                  ${themeName === theme 
                    ? `${classes.bgConversationActive} ${classes.textPrimary}` 
                    : `${classes.textSecondary} ${classes.hoverBg}`
                  }
                  cursor-pointer
                  flex
                  items-center
                  justify-between
                `}
              >
                <span>{getThemeDisplayName(themeName)}</span>
                {themeName === theme && (
                  <span className={classes.accentSuccess}>●</span>
                )}
              </button>
            ))}
            
            {/* Theme Preview */}
            <div 
              className={`
                ${classes.bgTertiary}
                ${classes.borderPrimary}
                ${classes.pSm}
                ${classes.textXs}
                ${classes.fontMono}
                border-t
              `}
            >
              <div className={`${classes.textMuted} mb-1`}>Preview:</div>
              <div className="flex items-center">
                <span className={classes.accentPrompt}>$</span>
                <span className={`${classes.textSecondary} ml-1`}>hello-world</span>
              </div>
              <div className={`${classes.accentAssistant} mt-1`}>
                AI response example
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Hook for programmatic theme switching with animations
export const useThemeTransition = () => {
  const { theme, setTheme } = useTerminalTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const switchThemeWithTransition = async (newTheme: TerminalTheme) => {
    if (newTheme === theme) return;

    setIsTransitioning(true);
    
    // Add transition class to root
    const root = document.documentElement;
    root.style.setProperty('--terminal-transition-theme', 'all 0.3s ease-in-out');
    root.classList.add('terminal-theme-transitioning');
    
    // Small delay to ensure transition class is applied
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Change theme
    setTheme(newTheme);
    
    // Remove transition class after animation
    setTimeout(() => {
      root.classList.remove('terminal-theme-transitioning');
      root.style.removeProperty('--terminal-transition-theme');
      setIsTransitioning(false);
    }, 350);
  };

  return {
    isTransitioning,
    switchThemeWithTransition,
  };
};