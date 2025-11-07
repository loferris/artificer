import React, { Component, ErrorInfo, ReactNode } from 'react';
import { clientLogger } from '../utils/clientLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error using clientLogger
    clientLogger.error(
      'ErrorBoundary caught an error',
      error,
      {
        componentStack: errorInfo.componentStack,
      },
      'ErrorBoundary'
    );

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className='min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4'>
          <div className='max-w-md w-full bg-white rounded-xl shadow-lg border border-red-200 p-6 text-center'>
            <div className='text-6xl mb-4'>⚠️</div>
            <h1 className='text-xl font-bold text-red-800 mb-2'>Something went wrong</h1>
            <p className='text-red-600 mb-4'>
              We encountered an unexpected error. Please try refreshing the page.
            </p>

            {this.state.error && (
              <details className='text-left text-sm text-gray-600 mb-4'>
                <summary className='cursor-pointer hover:text-gray-800 mb-2'>Error Details</summary>
                <div className='bg-gray-50 p-3 rounded border font-mono text-xs overflow-auto'>
                  <div className='mb-2'>
                    <strong>Message:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className='whitespace-pre-wrap mt-1'>{this.state.error.stack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className='flex gap-3 justify-center'>
              <button
                onClick={() => window.location.reload()}
                className='px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors'
              >
                Refresh Page
              </button>
              <button
                onClick={() =>
                  this.setState({ hasError: false, error: undefined, errorInfo: undefined })
                }
                className='px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors'
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    clientLogger.error(
      'Error caught by useErrorHandler',
      error,
      {
        componentStack: errorInfo?.componentStack,
      },
      'useErrorHandler'
    );
  };
}

// Higher-order component for error handling
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void,
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
