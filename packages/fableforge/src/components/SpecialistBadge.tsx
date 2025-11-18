/**
 * FableForge Specialist Badge Component
 *
 * Domain-specific wrapper around Artificer UI's ThemedBadge
 * Automatically applies specialist theming
 */

'use client'

import { ThemedBadge } from '@artificer/ui'
import { specialistThemes, type SpecialistType } from '../themes/specialist'
import { useComponentLogger } from '@artificer/ui'

export interface SpecialistBadgeProps {
  /**
   * Specialist type to display
   */
  specialist: SpecialistType

  /**
   * Whether to show the specialist icon
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
 * Badge component for displaying FableForge specialists with automatic theming
 *
 * @example
 * ```tsx
 * <SpecialistBadge specialist="cultural_specialist" />
 * <SpecialistBadge specialist="prose_stylist" showIcon={false} />
 * <SpecialistBadge specialist="final_synthesis" labelStyle="short" />
 * ```
 */
export function SpecialistBadge({
  specialist,
  showIcon = true,
  className,
  labelStyle = 'full'
}: SpecialistBadgeProps) {
  const { logInteraction } = useComponentLogger({
    component: 'SpecialistBadge',
    metadata: { specialist }
  })

  const theme = specialistThemes.get(specialist)

  if (!theme) {
    logInteraction('render_fallback', { specialist })
    return (
      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
        {specialist}
      </span>
    )
  }

  // Format label based on style
  let label = theme.label
  if (labelStyle === 'short') {
    // Extract first word (e.g., "Cultural" from "Cultural Specialist")
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
