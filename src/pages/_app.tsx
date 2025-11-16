// src/pages/_app.tsx
import React, { Component } from 'react';
import type { AppProps } from 'next/app';
import { trpc } from '../lib/trpc/client';
import { DemoBanner } from '../components/DemoBanner';
import { clientLogger } from '../utils/clientLogger';
import '../styles/index.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <DemoBanner />
        <Component {...pageProps} />
      </div>
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-8 text-center">
          <h1 className="text-red-500 text-3xl font-bold mb-4">
            Application Error
          </h1>
          <p className="text-gray-400 mb-6">
            Something went wrong. The error has been logged for investigation.
          </p>
          {this.state.errorId && (
            <p className="text-gray-600 text-sm font-mono mb-6">
              Error ID: {this.state.errorId}
            </p>
          )}
          <button
            onClick={this.handleRefresh}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
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
