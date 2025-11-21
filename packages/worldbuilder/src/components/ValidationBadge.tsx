/**
 * Worldbuilder Validation Badge Component
 *
 * Domain-specific wrapper around Artificer UI's ThemedBadge
 * Automatically applies validation severity theming
 */

'use client'

import { ThemedBadge } from '@artificer/ui'
import { validationThemes, type Severity } from '../themes/validation'
import { useComponentLogger } from '@artificer/ui'

export interface ValidationBadgeProps {
  /**
   * Validation severity to display
   */
  severity: Severity

  /**
   * Count of validation results (optional, displayed in badge)
   */
  count?: number

  /**
   * Whether to show the severity icon
   * @default true
   */
  showIcon?: boolean

  /**
   * Custom className for additional styling
   */
  className?: string

  /**
   * Show full label or abbreviated
   * @default 'full'
   */
  labelStyle?: 'full' | 'short' | 'icon-only'
}

/**
 * Badge component for displaying validation severity with automatic theming
 *
 * @example
 * ```tsx
 * <ValidationBadge severity="error" count={5} />
 * <ValidationBadge severity="warning" />
 * <ValidationBadge severity="info" labelStyle="short" />
 * ```
 */
export function ValidationBadge({
  severity,
  count,
  showIcon = true,
  className,
  labelStyle = 'full'
}: ValidationBadgeProps) {
  const { logInteraction } = useComponentLogger({
    component: 'ValidationBadge',
    metadata: { severity, count }
  })

  const theme = validationThemes.get(severity)

  if (!theme) {
    logInteraction('render_fallback', { severity })
    return (
      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
        {severity}
      </span>
    )
  }

  // Format label based on style
  let label = theme.label
  if (labelStyle === 'short') {
    // Use first word or abbreviated form
    label = severity === 'error' ? 'Error' : severity === 'warning' ? 'Warn' : 'Info'
  } else if (labelStyle === 'icon-only') {
    label = ''
  }

  // Add count if provided
  if (count !== undefined && labelStyle !== 'icon-only') {
    label = `${label}${label ? ' ' : ''}(${count})`
  }

  return (
    <ThemedBadge
      theme={theme}
      showIcon={showIcon && labelStyle !== 'icon-only'}
      className={className}
    >
      {label || (count !== undefined ? count.toString() : '')}
    </ThemedBadge>
  )
}
