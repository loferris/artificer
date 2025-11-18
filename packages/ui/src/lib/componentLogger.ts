/**
 * Client-side logger for FableForge components
 *
 * Provides structured logging for browser environments with:
 * - Component interaction tracking
 * - User action logging
 * - Performance metrics
 * - Error tracking
 * - Development-friendly console output
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface ComponentLogContext {
  component: string
  action?: string
  userId?: string
  sessionId?: string
  [key: string]: unknown
}

export interface PerformanceMetrics {
  component: string
  operation: string
  duration: number
  metadata?: Record<string, unknown>
}

export interface UserInteraction {
  component: string
  action: string
  target?: string
  metadata?: Record<string, unknown>
}

export class ClientLogger {
  private isDevelopment: boolean
  private enabledLevels: Set<LogLevel>

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.enabledLevels = new Set<LogLevel>(['info', 'warn', 'error'])

    if (this.isDevelopment) {
      this.enabledLevels.add('debug')
    }
  }

  /**
   * Check if a log level is enabled
   */
  private isLevelEnabled(level: LogLevel): boolean {
    return this.enabledLevels.has(level)
  }

  /**
   * Format log message with context
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    context?: ComponentLogContext
  ): string {
    const timestamp = new Date().toISOString()
    const componentName = context?.component || 'Unknown'
    const action = context?.action ? ` [${context.action}]` : ''

    return `[${timestamp}] [${level.toUpperCase()}] [${componentName}]${action} ${message}`
  }

  /**
   * Log debug messages (dev only)
   */
  debug(message: string, context?: ComponentLogContext, data?: Record<string, unknown>): void {
    if (!this.isLevelEnabled('debug')) return

    const formatted = this.formatMessage('debug', message, context)
    console.debug(formatted, data || '')
  }

  /**
   * Log info messages
   */
  info(message: string, context?: ComponentLogContext, data?: Record<string, unknown>): void {
    if (!this.isLevelEnabled('info')) return

    const formatted = this.formatMessage('info', message, context)
    console.info(formatted, data || '')
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: ComponentLogContext, data?: Record<string, unknown>): void {
    if (!this.isLevelEnabled('warn')) return

    const formatted = this.formatMessage('warn', message, context)
    console.warn(formatted, data || '')
  }

  /**
   * Log error messages
   */
  error(
    message: string,
    error?: Error | unknown,
    context?: ComponentLogContext,
    data?: Record<string, unknown>
  ): void {
    if (!this.isLevelEnabled('error')) return

    const formatted = this.formatMessage('error', message, context)
    console.error(formatted, { error, ...data })

    // In production, you might want to send to error tracking service
    if (!this.isDevelopment && error instanceof Error) {
      // TODO: Send to error tracking (Sentry, Highlight, etc.)
      // Example: Sentry.captureException(error, { extra: { context, data } })
    }
  }

  /**
   * Log user interactions
   */
  interaction(interaction: UserInteraction): void {
    this.debug('User interaction', {
      component: interaction.component,
      action: interaction.action
    }, {
      target: interaction.target,
      ...interaction.metadata
    })
  }

  /**
   * Log performance metrics
   */
  performance(metrics: PerformanceMetrics): void {
    this.info('Performance metric', {
      component: metrics.component,
      action: metrics.operation
    }, {
      duration: `${metrics.duration}ms`,
      ...metrics.metadata
    })
  }

  /**
   * Log component lifecycle events
   */
  lifecycle(component: string, event: 'mount' | 'unmount' | 'update', metadata?: Record<string, unknown>): void {
    this.debug(`Component ${event}`, { component }, metadata)
  }

  /**
   * Create a child logger with preset context
   */
  child(context: ComponentLogContext): ClientLogger {
    const childLogger = new ClientLogger()
    const originalMethods = {
      debug: childLogger.debug.bind(childLogger),
      info: childLogger.info.bind(childLogger),
      warn: childLogger.warn.bind(childLogger),
      error: childLogger.error.bind(childLogger),
    }

    // Override methods to include context
    childLogger.debug = (message: string, additionalContext?: ComponentLogContext, data?: Record<string, unknown>) => {
      originalMethods.debug(message, { ...context, ...additionalContext }, data)
    }

    childLogger.info = (message: string, additionalContext?: ComponentLogContext, data?: Record<string, unknown>) => {
      originalMethods.info(message, { ...context, ...additionalContext }, data)
    }

    childLogger.warn = (message: string, additionalContext?: ComponentLogContext, data?: Record<string, unknown>) => {
      originalMethods.warn(message, { ...context, ...additionalContext }, data)
    }

    childLogger.error = (message: string, error?: Error | unknown, additionalContext?: ComponentLogContext, data?: Record<string, unknown>) => {
      originalMethods.error(message, error, { ...context, ...additionalContext }, data)
    }

    return childLogger
  }
}

// Export singleton instance
export const componentLogger = new ClientLogger()

// Export convenience function for creating component loggers
export function createComponentLogger(componentName: string): ClientLogger {
  return componentLogger.child({ component: componentName })
}
