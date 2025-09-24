import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { clientLogger } from '../utils/clientLogger';

// Terminal theme types
export type TerminalTheme = 'purple-rich' | 'amber-forest' | 'cyan-light';

export interface TerminalThemeContextType {
  theme: TerminalTheme;
  setTheme: (theme: TerminalTheme) => void;
  availableThemes: TerminalTheme[];
  getThemeDisplayName: (theme: TerminalTheme) => string;
  toggleTheme: () => void;
}

const TerminalThemeContext = createContext<TerminalThemeContextType | undefined>(undefined);

export const useTerminalTheme = (): TerminalThemeContextType => {
  const context = useContext(TerminalThemeContext);
  if (!context) {
    throw new Error('useTerminalTheme must be used within a TerminalThemeProvider');
  }
  return context;
};

interface TerminalThemeProviderProps {
  children: ReactNode;
  defaultTheme?: TerminalTheme;
}

const THEME_STORAGE_KEY = 'terminal-theme';

const availableThemes: TerminalTheme[] = ['purple-rich', 'amber-forest', 'cyan-light'];

const themeDisplayNames: Record<TerminalTheme, string> = {
  'purple-rich': 'Dark Mode',
  'amber-forest': 'Amber Mode',
  'cyan-light': 'Light Mode',
};

export const TerminalThemeProvider: React.FC<TerminalThemeProviderProps> = ({
  children,
  defaultTheme = 'purple-rich',
}) => {
  const [theme, setThemeState] = useState<TerminalTheme>(defaultTheme);

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as TerminalTheme;
      if (savedTheme && availableThemes.includes(savedTheme)) {
        setThemeState(savedTheme);
      }
    } catch (error) {
      // localStorage not available (SSR, private browsing, etc.)
      clientLogger.warn('Could not load theme from localStorage', { error }, 'TerminalThemeProvider');
    }
  }, []);

  // Apply theme to DOM and save to localStorage
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-terminal-theme', theme);
    
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      // localStorage not available (SSR, private browsing, etc.)
      clientLogger.warn('Could not save theme to localStorage', { error }, 'TerminalThemeProvider');
    }
    
    // Also set a CSS custom property for the current theme name
    root.style.setProperty('--terminal-current-theme', `'${theme}'`);
  }, [theme]);

  const setTheme = (newTheme: TerminalTheme) => {
    if (availableThemes.includes(newTheme)) {
      setThemeState(newTheme);
    }
  };

  const getThemeDisplayName = (themeName: TerminalTheme): string => {
    return themeDisplayNames[themeName] || themeName;
  };

  const toggleTheme = () => {
    const currentIndex = availableThemes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % availableThemes.length;
    setTheme(availableThemes[nextIndex]);
  };

  const contextValue: TerminalThemeContextType = {
    theme,
    setTheme,
    availableThemes,
    getThemeDisplayName,
    toggleTheme,
  };

  return (
    <TerminalThemeContext.Provider value={contextValue}>
      {children}
    </TerminalThemeContext.Provider>
  );
};

// Theme utility hooks for components
export const useTerminalThemeClasses = () => {
  const { theme } = useTerminalTheme();
  
  return {
    // Background classes - both CSS custom properties and fallback classes
    bgPrimary: 'terminal-bg-primary bg-[var(--terminal-bg-primary)]',
    bgSecondary: 'terminal-bg-secondary bg-[var(--terminal-bg-secondary)]',
    bgTertiary: 'terminal-bg-tertiary bg-[var(--terminal-bg-tertiary)]',
    bgOverlay: 'bg-[var(--terminal-bg-overlay)]',
    bgConversationHover: 'bg-[var(--terminal-bg-conversation-hover)]',
    bgConversationActive: 'bg-[var(--terminal-bg-conversation-active)]',
    bgConversationList: 'bg-[var(--terminal-bg-conversation-list)]',
    
    // Text classes - both CSS custom properties and fallback classes
    textPrimary: 'terminal-text-primary text-[var(--terminal-text-primary)]',
    textSecondary: 'terminal-text-secondary text-[var(--terminal-text-secondary)]',
    textTertiary: 'terminal-text-tertiary text-[var(--terminal-text-tertiary)]',
    textMuted: 'terminal-text-muted text-[var(--terminal-text-muted)]',
    textDisabled: 'terminal-text-disabled text-[var(--terminal-text-disabled)]',
    textPlaceholder: 'terminal-text-placeholder placeholder-[var(--terminal-text-placeholder)]',
    
    // Accent classes - both CSS custom properties and fallback classes
    accentPrompt: 'terminal-accent-prompt text-[var(--terminal-accent-prompt)]',
    accentUser: 'terminal-accent-user text-[var(--terminal-accent-user)]',
    accentAssistant: 'terminal-accent-assistant text-[var(--terminal-accent-assistant)]',
    accentError: 'terminal-accent-error text-[var(--terminal-accent-error)]',
    accentWarning: 'terminal-accent-warning text-[var(--terminal-accent-warning)]',
    accentSuccess: 'terminal-accent-success text-[var(--terminal-accent-success)]',
    accentRose: 'terminal-accent-rose text-[var(--terminal-accent-rose)]',
    
    // Border classes
    borderPrimary: 'border-[var(--terminal-border-primary)]',
    borderSecondary: 'border-[var(--terminal-border-secondary)]',
    borderMuted: 'border-[var(--terminal-border-muted)]',
    
    // Interactive states
    hoverBg: 'hover:bg-[var(--terminal-hover-bg)]',
    focusOutline: 'focus:outline-none focus:ring-2 focus:ring-[var(--terminal-focus-outline)]',
    disabledOpacity: 'disabled:opacity-[var(--terminal-disabled-opacity)]',
    
    // Typography
    fontMono: 'font-[var(--terminal-font-family)]',
    textXs: 'text-[var(--terminal-font-size-xs)]',
    textSm: 'text-[var(--terminal-font-size-sm)]',
    textMd: 'text-[var(--terminal-font-size-md)]',
    textLg: 'text-[var(--terminal-font-size-lg)]',
    leadingTight: 'leading-[var(--terminal-line-height-tight)]',
    leadingNormal: 'leading-[var(--terminal-line-height-normal)]',
    
    // Layout
    radiusSm: 'rounded-[var(--terminal-border-radius-sm)]',
    radiusMd: 'rounded-[var(--terminal-border-radius-md)]',
    radiusLg: 'rounded-[var(--terminal-border-radius-lg)]',
    
    // Spacing
    spacingXs: 'gap-[var(--terminal-spacing-xs)]',
    spacingSm: 'gap-[var(--terminal-spacing-sm)]',
    spacingMd: 'gap-[var(--terminal-spacing-md)]',
    spacingLg: 'gap-[var(--terminal-spacing-lg)]',
    spacingXl: 'gap-[var(--terminal-spacing-xl)]',
    
    // Padding
    pXs: 'p-[var(--terminal-spacing-xs)]',
    pSm: 'p-[var(--terminal-spacing-sm)]',
    pMd: 'p-[var(--terminal-spacing-md)]',
    pLg: 'p-[var(--terminal-spacing-lg)]',
    pXl: 'p-[var(--terminal-spacing-xl)]',
    
    // Margin
    mXs: 'm-[var(--terminal-spacing-xs)]',
    mSm: 'm-[var(--terminal-spacing-sm)]',
    mMd: 'm-[var(--terminal-spacing-md)]',
    mLg: 'm-[var(--terminal-spacing-lg)]',
    mXl: 'm-[var(--terminal-spacing-xl)]',
    
    // Transitions
    transitionFast: 'transition-all duration-[var(--terminal-transition-fast)]',
    transitionNormal: 'transition-all duration-[var(--terminal-transition-normal)]',
    transitionSlow: 'transition-all duration-[var(--terminal-transition-slow)]',
  };
};

// Custom CSS properties helper for inline styles
export const useTerminalThemeProps = () => {
  const { theme } = useTerminalTheme();
  
  return {
    getCSSProperty: (property: string): string => {
      if (typeof window !== 'undefined') {
        return getComputedStyle(document.documentElement).getPropertyValue(property).trim();
      }
      return '';
    },
    
    // Direct access to CSS custom properties for inline styles
    style: {
      backgroundColor: 'var(--terminal-bg-primary)',
      color: 'var(--terminal-text-primary)',
      fontFamily: 'var(--terminal-font-family)',
      fontSize: 'var(--terminal-font-size-md)',
      lineHeight: 'var(--terminal-line-height-normal)',
    } as React.CSSProperties,
  };
};