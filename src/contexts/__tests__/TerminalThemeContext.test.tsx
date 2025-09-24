import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TerminalThemeProvider, useTerminalTheme, useTerminalThemeClasses } from '../TerminalThemeContext';

// Test component to access the context
const TestComponent = () => {
  const { theme, setTheme, availableThemes, getThemeDisplayName } = useTerminalTheme();
  const classes = useTerminalThemeClasses();
  
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="theme-display-name">{getThemeDisplayName(theme)}</div>
      <div data-testid="bg-primary">{classes.bgPrimary}</div>
      <div data-testid="accent-user">{classes.accentUser}</div>
      <button onClick={() => setTheme('amber-forest')} data-testid="set-amber">
        Set Amber
      </button>
      <button onClick={() => setTheme('cyan-light')} data-testid="set-light">
        Set Light
      </button>
      <div data-testid="available-themes">{availableThemes.join(',')}</div>
    </div>
  );
};

describe('TerminalThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear any existing data-terminal-theme attribute
    document.documentElement.removeAttribute('data-terminal-theme');
  });

  it('should provide default theme', () => {
    render(
      <TerminalThemeProvider>
        <TestComponent />
      </TerminalThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('purple-rich');
    expect(screen.getByTestId('theme-display-name')).toHaveTextContent('Dark Mode');
  });

  it('should switch themes correctly', () => {
    render(
      <TerminalThemeProvider>
        <TestComponent />
      </TerminalThemeProvider>
    );

    fireEvent.click(screen.getByTestId('set-amber'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('amber-forest');
    expect(screen.getByTestId('theme-display-name')).toHaveTextContent('Amber Mode');

    fireEvent.click(screen.getByTestId('set-light'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('cyan-light');
    expect(screen.getByTestId('theme-display-name')).toHaveTextContent('Light Mode');
  });

  it('should persist theme to localStorage', () => {
    render(
      <TerminalThemeProvider>
        <TestComponent />
      </TerminalThemeProvider>
    );

    fireEvent.click(screen.getByTestId('set-amber'));
    expect(localStorage.getItem('terminal-theme')).toBe('amber-forest');
  });

  it('should apply theme attribute to document', () => {
    render(
      <TerminalThemeProvider>
        <TestComponent />
      </TerminalThemeProvider>
    );

    expect(document.documentElement.getAttribute('data-terminal-theme')).toBe('purple-rich');
    
    fireEvent.click(screen.getByTestId('set-light'));
    expect(document.documentElement.getAttribute('data-terminal-theme')).toBe('cyan-light');
  });

  it('should generate correct CSS classes', () => {
    render(
      <TerminalThemeProvider>
        <TestComponent />
      </TerminalThemeProvider>
    );

    const bgPrimary = screen.getByTestId('bg-primary').textContent;
    const accentUser = screen.getByTestId('accent-user').textContent;

    expect(bgPrimary).toContain('terminal-bg-primary');
    expect(bgPrimary).toContain('bg-[var(--terminal-bg-primary)]');
    expect(accentUser).toContain('terminal-accent-user');
    expect(accentUser).toContain('text-[var(--terminal-accent-user)]');
  });

  it('should provide all available themes', () => {
    render(
      <TerminalThemeProvider>
        <TestComponent />
      </TerminalThemeProvider>
    );

    const availableThemes = screen.getByTestId('available-themes').textContent;
    expect(availableThemes).toBe('purple-rich,amber-forest,cyan-light');
  });

  it('should load theme from localStorage on mount', () => {
    localStorage.setItem('terminal-theme', 'amber-forest');
    
    render(
      <TerminalThemeProvider>
        <TestComponent />
      </TerminalThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('amber-forest');
  });

  it('should ignore invalid theme from localStorage', () => {
    localStorage.setItem('terminal-theme', 'invalid-theme');
    
    render(
      <TerminalThemeProvider>
        <TestComponent />
      </TerminalThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('purple-rich');
  });
});