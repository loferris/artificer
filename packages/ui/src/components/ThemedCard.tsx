/**
 * Artificer UI - Themed Card Component
 *
 * Card component with automatic theme support
 */

import React, { ReactNode } from 'react'
import { Card, CardHeader, CardContent, CardFooter } from '../shadcn/card'
import { cn } from '../lib/cn'
import type { Theme } from '../types'

export interface ThemedCardProps<T extends string = string> {
  /**
   * Theme to apply (optional)
   */
  theme?: Theme<T>

  /**
   * Card variant
   */
  variant?: 'default' | 'outlined' | 'filled'

  /**
   * Border accent position
   */
  borderAccent?: 'left' | 'top' | 'right' | 'bottom' | 'none'

  /**
   * Border accent width
   */
  borderWidth?: number

  /**
   * Card content
   */
  children: ReactNode

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
 * Theme-aware card component
 *
 * Automatically applies theme colors for border and background.
 * Falls back to standard card when no theme.
 *
 * @example
 * ```tsx
 * <ThemedCard theme={operationThemes.get('CREATE_ENTITY')} borderAccent="left">
 *   <CardContent>
 *     Operation details here
 *   </CardContent>
 * </ThemedCard>
 * ```
 */
export function ThemedCard<T extends string>({
  theme,
  variant = 'default',
  borderAccent = 'left',
  borderWidth = 4,
  children,
  className,
  onClick
}: ThemedCardProps<T>) {
  const getBorderClass = () => {
    if (!theme || borderAccent === 'none') return ''

    const width = `border-${borderAccent}-${borderWidth}`
    return cn(width, theme.borderColor)
  }

  const getBackgroundClass = () => {
    if (!theme) return ''

    if (variant === 'filled') {
      return theme.bgColor
    }

    return ''
  }

  const getBorderColorClass = () => {
    if (!theme || variant === 'filled') return ''

    if (variant === 'outlined') {
      return theme.borderColor
    }

    return ''
  }

  return (
    <Card
      className={cn(
        getBorderClass(),
        getBackgroundClass(),
        getBorderColorClass(),
        onClick && 'cursor-pointer hover:shadow-md transition-all',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Card>
  )
}

// Re-export sub-components for convenience
export { CardHeader, CardContent, CardFooter }
