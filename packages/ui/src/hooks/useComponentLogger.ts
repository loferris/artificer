/**
 * Artificer UI - Component Logger Hook
 *
 * Auto-wired component logging with lifecycle tracking
 * Reduces boilerplate by handling mount/unmount automatically
 */

import { useEffect, useMemo, useCallback } from 'react'
import { createComponentLogger, type ClientLogger } from '@/lib/componentLogger'

export interface UseComponentLoggerOptions {
  /**
   * Component name for logging
   */
  component: string

  /**
   * Optional metadata to log on mount
   */
  metadata?: Record<string, unknown>

  /**
   * Whether to automatically log mount/unmount
   */
  autoLifecycle?: boolean
}

export interface UseComponentLoggerReturn {
  /**
   * Logger instance
   */
  logger: ClientLogger

  /**
   * Log an interaction (shorthand)
   */
  logInteraction: (action: string, details?: Record<string, unknown>) => void

  /**
   * Log info (shorthand)
   */
  logInfo: (message: string, data?: Record<string, unknown>) => void

  /**
   * Log error (shorthand)
   */
  logError: (message: string, error?: Error, data?: Record<string, unknown>) => void

  /**
   * Log performance metric
   */
  logPerformance: (operation: string, duration: number, metadata?: Record<string, unknown>) => void
}

/**
 * Hook for component logging with automatic lifecycle tracking
 *
 * Eliminates 5-10 lines of boilerplate per component.
 *
 * @example
 * ```tsx
 * function MyComponent({ prop1, prop2 }) {
 *   const { logger, logInteraction } = useComponentLogger({
 *     component: 'MyComponent',
 *     metadata: { prop1, prop2 }
 *   })
 *
 *   const handleClick = () => {
 *     logInteraction('button_click', { buttonId: 'submit' })
 *   }
 *
 *   // Mount/unmount logging happens automatically
 * }
 * ```
 */
export function useComponentLogger(
  options: UseComponentLoggerOptions | string
): UseComponentLoggerReturn {
  // Support passing just component name as string
  const {
    component,
    metadata,
    autoLifecycle = true
  } = typeof options === 'string' ? { component: options } : options

  const logger = useMemo(() => createComponentLogger(component), [component])

  // Auto lifecycle logging
  useEffect(() => {
    if (!autoLifecycle) return

    logger.lifecycle(component, 'mount', metadata)

    return () => {
      logger.lifecycle(component, 'unmount')
    }
  }, [logger, component, metadata, autoLifecycle])

  // Shorthand for logging interactions
  const logInteraction = useCallback(
    (action: string, details?: Record<string, unknown>) => {
      logger.interaction({
        component,
        action,
        metadata: details
      })
    },
    [logger, component]
  )

  // Shorthand for logging info
  const logInfo = useCallback(
    (message: string, data?: Record<string, unknown>) => {
      logger.info(message, { component }, data)
    },
    [logger, component]
  )

  // Shorthand for logging errors
  const logError = useCallback(
    (message: string, error?: Error, data?: Record<string, unknown>) => {
      logger.error(message, error, { component }, data)
    },
    [logger, component]
  )

  // Log performance metrics
  const logPerformance = useCallback(
    (operation: string, duration: number, metadata?: Record<string, unknown>) => {
      logger.performance({
        component,
        operation,
        duration,
        metadata
      })
    },
    [logger, component]
  )

  return {
    logger,
    logInteraction,
    logInfo,
    logError,
    logPerformance
  }
}

/**
 * Hook for measuring component render performance
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { logInteraction } = useComponentLogger('MyComponent')
 *   const startTime = useRenderPerformance('MyComponent', logInteraction)
 *
 *   // Component renders...
 *   // Automatically logs render time on mount
 * }
 * ```
 */
export function useRenderPerformance(
  component: string,
  onMeasure?: (duration: number) => void
): number {
  const startTime = useMemo(() => performance.now(), [])

  useEffect(() => {
    const duration = performance.now() - startTime
    onMeasure?.(duration)
  }, [startTime, onMeasure])

  return startTime
}
