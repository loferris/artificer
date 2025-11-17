/**
 * Hellbat Operation Badge Component
 *
 * Domain-specific wrapper around Artificer UI's ThemedBadge
 * Automatically applies operation intent theming
 */

'use client'

import { ThemedBadge } from '@/lib/artificer-ui'
import { operationThemes, type OperationIntent } from '../themes/operation'
import { useComponentLogger } from '@/lib/artificer-ui'

export interface OperationBadgeProps {
  /**
   * Operation intent to display
   */
  intent: OperationIntent

  /**
   * Whether to show the operation icon
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
 * Badge component for displaying Hellbat operation intents with automatic theming
 *
 * @example
 * ```tsx
 * <OperationBadge intent="CREATE_ENTITY" />
 * <OperationBadge intent="DEFINE_RELATIONSHIP" showIcon={false} />
 * <OperationBadge intent="DELETE_ENTITY" labelStyle="short" />
 * ```
 */
export function OperationBadge({
  intent,
  showIcon = true,
  className,
  labelStyle = 'full'
}: OperationBadgeProps) {
  const { logInteraction } = useComponentLogger({
    component: 'OperationBadge',
    metadata: { intent }
  })

  const theme = operationThemes.get(intent)

  if (!theme) {
    logInteraction('render_fallback', { intent })
    return (
      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
        {intent}
      </span>
    )
  }

  // Format label based on style
  let label = theme.label
  if (labelStyle === 'short') {
    // Extract first word (e.g., "Create" from "Create Entity")
    label = theme.label.split(' ')[0]
  } else if (labelStyle === 'icon-only') {
    label = ''
  }

  return (
    <ThemedBadge
      theme={theme}
      showIcon={showIcon && labelStyle !== 'icon-only'}
      className={className}
    >
      {label}
    </ThemedBadge>
  )
}
