// Frontend logging utility for debug mode
// src/utils/clientLogger.ts

export enum ClientLogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

interface ClientLogEntry {
  timestamp: string;
  level: string;
  message: string;
  component?: string;
  meta?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  userAgent?: string;
  url?: string;
  sessionId?: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  component?: string;
}

class ClientLogger {
  private logLevel: ClientLogLevel;
  private isProduction: boolean;
  private logBuffer: ClientLogEntry[] = [];
  private performanceBuffer: PerformanceMetric[] = [];
  private maxBufferSize: number = 100;
  private sessionId: string;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.sessionId = this.generateSessionId();
    
    // In production, only log errors by default
    if (this.isProduction) {
      this.logLevel = ClientLogLevel.ERROR;
    } else {
      // In development, check for debug level override
      const debugLevel = typeof window !== 'undefined' 
        ? localStorage.getItem('DEBUG_LOG_LEVEL')
        : null;
      
      switch (debugLevel?.toLowerCase()) {
        case 'trace':
          this.logLevel = ClientLogLevel.TRACE;
          break;
        case 'debug':
          this.logLevel = ClientLogLevel.DEBUG;
          break;
        case 'info':
          this.logLevel = ClientLogLevel.INFO;
          break;
        case 'warn':
          this.logLevel = ClientLogLevel.WARN;
          break;
        case 'error':
          this.logLevel = ClientLogLevel.ERROR;
          break;
        default:
          this.logLevel = ClientLogLevel.DEBUG; // Default for dev
      }
    }

    // Expose debug controls in development
    if (!this.isProduction && typeof window !== 'undefined') {
      (window as any).__DEBUG_LOGGER = {
        setLevel: (level: keyof typeof ClientLogLevel) => {
          this.logLevel = ClientLogLevel[level];
          localStorage.setItem('DEBUG_LOG_LEVEL', level.toLowerCase());
          this.debug('Log level changed', { newLevel: level });
        },
        getLevel: () => ClientLogLevel[this.logLevel],
        exportLogs: () => this.exportLogs(),
        exportPerformance: () => this.exportPerformanceMetrics(),
        clearLogs: () => this.clearLogs(),
        clearPerformance: () => this.clearPerformanceMetrics(),
        downloadLogs: () => this.downloadLogs(),
      };
    }

    // Track page load performance
    if (typeof window !== 'undefined') {
      this.trackWebVitals();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatLog(
    level: string,
    message: string,
    component?: string,
    meta?: Record<string, unknown>,
    error?: Error,
  ): ClientLogEntry {
    const logEntry: ClientLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: this.sessionId,
    };

    if (component) {
      logEntry.component = component;
    }

    if (meta && Object.keys(meta).length > 0) {
      logEntry.meta = meta;
    }

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: !this.isProduction ? error.stack : undefined,
      };
    }

    // Add browser context in development
    if (!this.isProduction && typeof window !== 'undefined') {
      logEntry.userAgent = navigator.userAgent;
      logEntry.url = window.location.href;
    }

    return logEntry;
  }

  private shouldLog(level: ClientLogLevel): boolean {
    return level <= this.logLevel;
  }

  private log(
    level: ClientLogLevel,
    levelName: string,
    message: string,
    component?: string,
    meta?: Record<string, unknown>,
    error?: Error,
  ) {
    if (!this.shouldLog(level)) return;

    const logEntry = this.formatLog(levelName, message, component, meta, error);

    // Add to buffer for potential export
    this.addToBuffer(logEntry);

    // Console output based on level
    const consoleMessage = component 
      ? `[${component}] ${message}` 
      : message;

    const consoleData = {
      ...logEntry,
      // Format meta for better console display
      ...(meta && { meta }),
      ...(error && { error }),
    };

    switch (level) {
      case ClientLogLevel.ERROR:
        console.error(consoleMessage, consoleData);
        break;
      case ClientLogLevel.WARN:
        console.warn(consoleMessage, consoleData);
        break;
      case ClientLogLevel.INFO:
        console.info(consoleMessage, consoleData);
        break;
      case ClientLogLevel.DEBUG:
        console.log(`🐛 ${consoleMessage}`, consoleData);
        break;
      case ClientLogLevel.TRACE:
        console.log(`🔍 ${consoleMessage}`, consoleData);
        break;
    }
  }

  private addToBuffer(entry: ClientLogEntry) {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift(); // Remove oldest entry
    }
  }

  private addPerformanceMetric(metric: PerformanceMetric) {
    this.performanceBuffer.push(metric);
    if (this.performanceBuffer.length > this.maxBufferSize) {
      this.performanceBuffer.shift();
    }
  }

  private trackWebVitals() {
    // Track Core Web Vitals when available
    if ('performance' in window && 'PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.performance('LCP', entry.startTime, 'ms', 'WebVitals');
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.performance('FID', (entry as any).processingStart - entry.startTime, 'ms', 'WebVitals');
          }
        }).observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              this.performance('CLS', (entry as any).value, 'score', 'WebVitals');
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // PerformanceObserver not fully supported
        this.debug('Web Vitals tracking not available', { error: e });
      }
    }
  }

  // Public logging methods
  error(message: string, error?: Error, meta?: Record<string, unknown>, component?: string) {
    this.log(ClientLogLevel.ERROR, 'ERROR', message, component, meta, error);
  }

  warn(message: string, meta?: Record<string, unknown>, component?: string) {
    this.log(ClientLogLevel.WARN, 'WARN', message, component, meta);
  }

  info(message: string, meta?: Record<string, unknown>, component?: string) {
    this.log(ClientLogLevel.INFO, 'INFO', message, component, meta);
  }

  debug(message: string, meta?: Record<string, unknown>, component?: string) {
    this.log(ClientLogLevel.DEBUG, 'DEBUG', message, component, meta);
  }

  trace(message: string, meta?: Record<string, unknown>, component?: string) {
    this.log(ClientLogLevel.TRACE, 'TRACE', message, component, meta);
  }

  // Specialized logging methods for common frontend scenarios
  componentMount(componentName: string, props?: Record<string, unknown>) {
    this.debug('Component mounted', props, componentName);
  }

  componentUnmount(componentName: string) {
    this.debug('Component unmounted', undefined, componentName);
  }

  apiCall(endpoint: string, method: string, duration?: number, status?: number, error?: Error) {
    const meta = { endpoint, method, duration, status };
    if (error) {
      this.error('API call failed', error, meta, 'API');
    } else {
      this.info('API call completed', meta, 'API');
    }
  }

  stateChange(stateName: string, oldValue: unknown, newValue: unknown, component?: string) {
    this.debug('State changed', { 
      state: stateName, 
      old: oldValue, 
      new: newValue 
    }, component || 'Store');
  }

  userAction(action: string, meta?: Record<string, unknown>, component?: string) {
    this.info('User action', { action, ...meta }, component || 'User');
  }

  routeChange(from: string, to: string) {
    this.info('Route changed', { from, to }, 'Router');
  }

  performance(metric: string, value: number, unit: string = 'ms', component?: string) {
    const perfMetric: PerformanceMetric = {
      name: metric,
      value,
      unit,
      timestamp: new Date().toISOString(),
      component,
    };
    
    this.addPerformanceMetric(perfMetric);
    this.debug('Performance metric', { metric, value, unit }, component || 'Performance');
  }

  // Utility methods
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }

  exportPerformanceMetrics(): string {
    return JSON.stringify(this.performanceBuffer, null, 2);
  }

  clearLogs(): void {
    this.logBuffer = [];
    this.debug('Log buffer cleared');
  }

  clearPerformanceMetrics(): void {
    this.performanceBuffer = [];
    this.debug('Performance metrics cleared');
  }

  downloadLogs(): void {
    if (typeof window === 'undefined') return;
    
    const data = {
      logs: this.logBuffer,
      performance: this.performanceBuffer,
      session: {
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Method to send critical errors to server (production)
  async reportError(error: Error, context?: Record<string, unknown>) {
    if (this.isProduction) {
      try {
        // You could integrate with your tRPC error reporting here
        await fetch('/api/client-errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            context,
            session: {
              sessionId: this.sessionId,
              url: window.location.href,
              userAgent: navigator.userAgent,
            },
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (reportingError) {
        console.error('Failed to report error:', reportingError);
      }
    }
    
    // Always log locally too
    this.error('Reported error', error, context);
  }

  // React Error Boundary integration
  captureErrorBoundary(error: Error, errorInfo: { componentStack: string }) {
    this.error('React Error Boundary caught error', error, {
      componentStack: errorInfo.componentStack,
      reactError: true,
    }, 'ErrorBoundary');
    
    // Report critical React errors in production
    if (this.isProduction) {
      this.reportError(error, { 
        type: 'react-error-boundary',
        componentStack: errorInfo.componentStack 
      });
    }
  }
}

// Create singleton instance
export const clientLogger = new ClientLogger();

// Convenience function for component-scoped logging
export function createComponentLogger(componentName: string) {
  return {
    error: (message: string, error?: Error, meta?: Record<string, unknown>) =>
      clientLogger.error(message, error, meta, componentName),
    warn: (message: string, meta?: Record<string, unknown>) =>
      clientLogger.warn(message, meta, componentName),
    info: (message: string, meta?: Record<string, unknown>) =>
      clientLogger.info(message, meta, componentName),
    debug: (message: string, meta?: Record<string, unknown>) =>
      clientLogger.debug(message, meta, componentName),
    trace: (message: string, meta?: Record<string, unknown>) =>
      clientLogger.trace(message, meta, componentName),
    mount: (props?: Record<string, unknown>) =>
      clientLogger.componentMount(componentName, props),
    unmount: () =>
      clientLogger.componentUnmount(componentName),
    stateChange: (stateName: string, oldValue: unknown, newValue: unknown) =>
      clientLogger.stateChange(stateName, oldValue, newValue, componentName),
    userAction: (action: string, meta?: Record<string, unknown>) =>
      clientLogger.userAction(action, meta, componentName),
    performance: (metric: string, value: number, unit?: string) =>
      clientLogger.performance(metric, value, unit, componentName),
  };
}

// React hook for easy component integration
export function useClientLogger(componentName: string) {
  return createComponentLogger(componentName);
}

export default clientLogger;