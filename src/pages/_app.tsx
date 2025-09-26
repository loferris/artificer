// src/pages/_app.tsx
import React, { Component } from 'react';
import type { AppProps } from 'next/app';
import { trpc } from '../lib/trpc/client';
import { TerminalThemeProvider } from '../contexts/TerminalThemeContext';
import { clientLogger } from '../utils/clientLogger';
import '../styles/index.css';
import '../styles/themes/purple-rich.css';
import '../styles/themes/amber-forest.css';
import '../styles/themes/cyan-light.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <TerminalThemeProvider>
        <Component {...pageProps} />
      </TerminalThemeProvider>
    </ErrorBoundary>
  );
}

// Enhanced error boundary component with client logging
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; errorId?: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, errorId: `error_${Date.now()}` };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error using our client logger
    clientLogger.captureErrorBoundary(error, {
      componentStack: errorInfo.componentStack || '',
    });

    // Also log additional context for debugging
    clientLogger.error(
      'React Error Boundary triggered',
      error,
      {
        errorBoundary: true,
        errorId: this.state.errorId,
        componentStack: errorInfo.componentStack || '',
        errorMessage: error.message,
        errorName: error.name,
      },
      'ErrorBoundary',
    );
  }

  private handleRefresh = () => {
    // Log the user action
    clientLogger.userAction(
      'refresh-after-error',
      {
        errorId: this.state.errorId,
      },
      'ErrorBoundary',
    );

    // Reset the error boundary
    this.setState({ hasError: false, errorId: undefined });

    // Refresh the page
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'monospace',
            backgroundColor: 'var(--terminal-bg-primary, #1a1a1a)',
            color: 'var(--terminal-text-primary, #ffffff)',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <h1 style={{ color: 'var(--terminal-accent-error, #ff6b6b)', marginBottom: '1rem' }}>
            Application Error
          </h1>
          <p style={{ marginBottom: '1.5rem', color: 'var(--terminal-text-secondary, #aaaaaa)' }}>
            Something went wrong. The error has been logged for investigation.
          </p>
          {this.state.errorId && (
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--terminal-text-muted, #666666)',
                marginBottom: '1.5rem',
                fontFamily: 'monospace',
              }}
            >
              Error ID: {this.state.errorId}
            </p>
          )}
          <button
            onClick={this.handleRefresh}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--terminal-accent-prompt, #8b5cf6)',
              color: 'var(--terminal-bg-primary, #ffffff)',
              border: 'none',
              borderRadius: '0.375rem',
              fontFamily: 'monospace',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Refresh Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default trpc.withTRPC(MyApp);
