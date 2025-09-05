import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test/utils';
import { ErrorBoundary, useErrorHandler, withErrorBoundary } from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }: { shouldThrow?: boolean; errorMessage?: string }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Component that throws an error with stack trace
const ThrowErrorWithStack = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    const error = new Error('Error with stack trace');
    error.stack = 'Error: Error with stack trace\n    at ThrowErrorWithStack (test.js:1:1)\n    at render (test.js:2:2)';
    throw error;
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Mock console methods to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('renders children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child">Child component</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child component')).toBeInTheDocument();
    });

    it('catches errors and displays error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('We encountered an unexpected error. Please try refreshing the page.')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('displays custom fallback UI when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  describe('Error Details', () => {
    it('displays error details when available', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error message" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('displays stack trace when available', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorWithStack shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details')).toBeInTheDocument();
      expect(screen.getByText('Error with stack trace')).toBeInTheDocument();
      expect(screen.getByText(/at ThrowErrorWithStack/)).toBeInTheDocument();
    });

    it('handles errors without stack trace', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Error without stack" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details')).toBeInTheDocument();
      expect(screen.getByText('Error without stack')).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('handles refresh page button', () => {
      // Mock window.location.reload
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const refreshButton = screen.getByText('Refresh Page');
      fireEvent.click(refreshButton);

      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Error Callbacks', () => {
    it('calls onError callback when error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} errorMessage="Callback test error" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Callback test error',
        }),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });
  });

  describe('State Management', () => {
    it('initializes with hasError false', () => {
      const { container } = render(
        <ErrorBoundary>
          <div>Child</div>
        </ErrorBoundary>
      );

      expect(container.firstChild).toHaveTextContent('Child');
    });

    it('updates state when error occurs', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();

      // Trigger error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});

describe('useErrorHandler Hook', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns a function that logs errors', () => {
    const errorHandler = useErrorHandler();
    const testError = new Error('Hook test error');
    const testErrorInfo = { componentStack: 'test stack' };

    errorHandler(testError, testErrorInfo);

    // Just verify the function doesn't throw
    expect(errorHandler).toBeInstanceOf(Function);
  });

  it('handles errors without errorInfo', () => {
    const errorHandler = useErrorHandler();
    const testError = new Error('Hook test error without info');

    errorHandler(testError);

    // Just verify the function doesn't throw
    expect(errorHandler).toBeInstanceOf(Function);
  });
});

describe('withErrorBoundary HOC', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('wraps component with ErrorBoundary', () => {
    const TestComponent = () => <div data-testid="test-component">Test Component</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('handles errors in wrapped component', () => {
    const TestComponent = ({ shouldThrow }: { shouldThrow?: boolean }) => {
      if (shouldThrow) {
        throw new Error('HOC test error');
      }
      return <div data-testid="test-component">Test Component</div>;
    };

    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent shouldThrow={true} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('uses custom fallback in HOC', () => {
    const TestComponent = ({ shouldThrow }: { shouldThrow?: boolean }) => {
      if (shouldThrow) {
        throw new Error('HOC test error');
      }
      return <div data-testid="test-component">Test Component</div>;
    };

    const customFallback = <div data-testid="hoc-fallback">HOC Custom Fallback</div>;
    const WrappedComponent = withErrorBoundary(TestComponent, customFallback);

    render(<WrappedComponent shouldThrow={true} />);

    expect(screen.getByTestId('hoc-fallback')).toBeInTheDocument();
    expect(screen.getByText('HOC Custom Fallback')).toBeInTheDocument();
  });

  it('calls onError callback in HOC', () => {
    const onError = vi.fn();
    const TestComponent = ({ shouldThrow }: { shouldThrow?: boolean }) => {
      if (shouldThrow) {
        throw new Error('HOC callback test error');
      }
      return <div data-testid="test-component">Test Component</div>;
    };

    const WrappedComponent = withErrorBoundary(TestComponent, undefined, onError);

    render(<WrappedComponent shouldThrow={true} />);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'HOC callback test error',
      }),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });
});

describe('ErrorBoundary Edge Cases', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('handles multiple errors gracefully', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="First error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Try to trigger another error (should not change the UI)
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Second error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('handles null or undefined children', () => {
    render(
      <ErrorBoundary>
        {null}
      </ErrorBoundary>
    );

    // Should not crash
    expect(document.body).toBeInTheDocument();
  });

  it('handles children that return null', () => {
    const NullComponent = () => null;

    render(
      <ErrorBoundary>
        <NullComponent />
      </ErrorBoundary>
    );

    // Should not crash
    expect(document.body).toBeInTheDocument();
  });
});