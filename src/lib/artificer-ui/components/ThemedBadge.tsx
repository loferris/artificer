/**
 * Artificer UI - Themed Badge Component
 *
 * Badge component with automatic theme support
 */

import React, { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import type { Theme } from '../types'

export interface ThemedBadgeProps<T extends string = string> {
  /**
   * Theme to apply (optional - will use standard badge if not provided)
   */
  theme?: Theme<T>

  /**
   * Badge content
   */
  children: ReactNode

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Whether to show theme icon
   */
  showIcon?: boolean

  /**
   * Additional className
   */
  className?: string

  /**
   * Click handler
   */
  onClick?: () => void
}

/**
 * Theme-aware badge component
 *
 * Automatically applies theme colors and icon when theme is provided.
 * Falls back to standard badge when no theme.
 *
 * @example
 * ```tsx
 * <ThemedBadge theme={specialistThemes.get('cultural_specialist')} showIcon>
 *   Cultural Specialist
 * </ThemedBadge>
 * ```
 */
export function ThemedBadge<T extends string>({
  theme,
  children,
  size = 'md',
  showIcon = false,
  className,
  onClick
}: ThemedBadgeProps<T>) {
  if (!theme) {
    return (
      <Badge size={size} className={className} onClick={onClick}>
        {children}
      </Badge>
    )
  }

  return (
    <Badge
      variant={theme.color as any}
      size={size}
      className={cn(
        theme.bgColor,
        theme.textColor,
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      onClick={onClick}
    >
      {showIcon && theme.icon && <span className="mr-1">{theme.icon}</span>}
      {children}
    </Badge>
  )
}
