/**
 * Worldbuilder Validation Theme System
 *
 * Provides consistent theming for validation severity levels
 * Built on Artificer UI ThemeRegistry for type-safe theme management
 */

import { ThemeRegistry } from '@artificer/ui'

export type Severity = 'error' | 'warning' | 'info'

/**
 * Validation severity theme registry
 */
export const validationThemes = new ThemeRegistry<Severity>()

// Register all severity themes
validationThemes.register('error', {
  icon: '❌',
  color: 'red',
  bgColor: 'bg-red-50',
  borderColor: 'border-red-200',
  textColor: 'text-red-700',
  label: 'Errors',
  description: 'Critical errors that must be fixed'
})

validationThemes.register('warning', {
  icon: '⚠️',
  color: 'yellow',
  bgColor: 'bg-yellow-50',
  borderColor: 'border-yellow-200',
  textColor: 'text-yellow-700',
  label: 'Warnings',
  description: 'Potential issues that should be reviewed'
})

validationThemes.register('info', {
  icon: 'ℹ️',
  color: 'blue',
  bgColor: 'bg-blue-50',
  borderColor: 'border-blue-200',
  textColor: 'text-blue-700',
  label: 'Info',
  description: 'Informational messages and suggestions'
})

// Set default theme
validationThemes.setDefault('info')

/**
 * Type guard to check if a string is a valid severity
 */
export function isSeverity(value: string): value is Severity {
  return validationThemes.has(value as Severity)
}

/**
 * Get all severity levels in order (error -> warning -> info)
 */
export function getAllSeverities(): Severity[] {
  return ['error', 'warning', 'info']
}

/**
 * Get severity order value for sorting (lower = higher priority)
 */
export function getSeverityOrder(severity: Severity): number {
  const order: Record<Severity, number> = {
    error: 0,
    warning: 1,
    info: 2
  }
  return order[severity]
}
