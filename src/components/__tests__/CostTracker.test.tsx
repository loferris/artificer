import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CostTracker } from '../CostTracker';
import { TerminalThemeProvider } from '../../contexts/TerminalThemeContext';

// Mock the useCostTracker hook
vi.mock('../../hooks/useCostTracker', () => ({
  useCostTracker: () => ({
    totalCost: 0.001234,
    totalMessages: 42,
    totalTokens: 1337,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

const renderWithTheme = (viewMode: 'terminal' | 'chat', theme: 'purple-rich' | 'amber-forest' | 'cyan-light' = 'purple-rich') => {
  return render(
    <TerminalThemeProvider defaultTheme={theme}>
      <CostTracker viewMode={viewMode} />
    </TerminalThemeProvider>
  );
};

describe('CostTracker', () => {
  it('should render cost data correctly', () => {
    renderWithTheme('terminal');
    
    expect(screen.getByText('$0.001234')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('1,337')).toBeInTheDocument();
  });

  it('should render with terminal theme styles in terminal mode', () => {
    renderWithTheme('terminal');
    
    const container = screen.getByText('$ cost_tracker --summary').closest('div')?.parentElement;
    expect(container).toHaveClass('terminal-bg-secondary');
    expect(container).toHaveClass('terminal-text-primary');
  });

  it('should render with chat theme styles in chat mode', () => {
    renderWithTheme('chat');
    
    const container = screen.getByText('$ cost_tracker --summary').closest('div')?.parentElement;
    expect(container).toHaveClass('text-gray-700');
    expect(container).toHaveClass('border-pink-200');
    expect(container).toHaveStyle('background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.9), rgba(253, 242, 248, 0.8))');
  });

  it('should display correct accent colors in terminal mode', () => {
    renderWithTheme('terminal');
    
    // Check for theme-specific accent classes
    expect(screen.getByText('$0.001234')).toHaveClass('terminal-accent-warning');
    expect(screen.getByText('42')).toHaveClass('terminal-accent-prompt');
    expect(screen.getByText('1,337')).toHaveClass('terminal-accent-assistant');
  });

  it('should display correct accent colors in chat mode', () => {
    renderWithTheme('chat');
    
    // Check for chat-specific color classes
    expect(screen.getByText('$0.001234')).toHaveClass('text-pink-600');
    expect(screen.getByText('42')).toHaveClass('text-purple-600');
    expect(screen.getByText('1,337')).toHaveClass('text-indigo-600');
  });

  it('should show refresh button with correct styling in terminal mode', () => {
    renderWithTheme('terminal');
    const refreshButton = screen.getByTitle('Refresh stats');
    expect(refreshButton).toHaveClass('terminal-text-muted');
  });

  it('should show refresh button with correct styling in chat mode', () => {
    renderWithTheme('chat');
    const refreshButton = screen.getByTitle('Refresh stats');
    expect(refreshButton).toHaveClass('hover:text-pink-600');
  });

});