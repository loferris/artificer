/**
 * Artificer UI - Theme Utilities
 *
 * Helper functions for working with themes
 */

import type { Theme } from '../types'
import type { ThemeRegistry } from './core'

/**
 * Apply theme classes to an element
 */
export function applyThemeClasses(theme?: Theme): string {
  if (!theme) return ''

  return [
    theme.bgColor,
    theme.borderColor,
    theme.textColor
  ].filter(Boolean).join(' ')
}

/**
 * Get theme-based border class
 */
export function getThemeBorderClass(theme?: Theme, width: number = 2): string {
  if (!theme) return ''
  return `border-l-${width} ${theme.borderColor}`
}

/**
 * Get theme-based background class
 */
export function getThemeBgClass(theme?: Theme, opacity?: number): string {
  if (!theme) return ''
  if (opacity !== undefined) {
    // For custom opacity, we'd need to use arbitrary values
    return theme.bgColor
  }
  return theme.bgColor
}

/**
 * Merge multiple theme classes
 */
export function mergeThemeClasses(...themes: (Theme | undefined)[]): string {
  const classes = themes
    .filter((t): t is Theme => t !== undefined)
    .map(t => applyThemeClasses(t))
    .filter(Boolean)

  return classes.join(' ')
}

/**
 * Get all themes matching a predicate
 */
export function filterThemes<T extends string>(
  registry: ThemeRegistry<T>,
  predicate: (theme: Theme<T>) => boolean
): Theme<T>[] {
  return registry.getAll().filter(predicate)
}

/**
 * Get theme icon with optional size
 */
export function getThemeIcon(theme?: Theme, size?: 'sm' | 'md' | 'lg'): string {
  if (!theme?.icon) return ''

  const sizeClass = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'
  return `<span class="${sizeClass}">${theme.icon}</span>`
}

/**
 * Sort themes by label
 */
export function sortThemesByLabel<T extends string>(
  themes: Theme<T>[]
): Theme<T>[] {
  return [...themes].sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Sort themes by custom order
 */
export function sortThemesByOrder<T extends string>(
  themes: Theme<T>[],
  order: T[]
): Theme<T>[] {
  const orderMap = new Map(order.map((id, idx) => [id, idx]))

  return [...themes].sort((a, b) => {
    const aIndex = orderMap.get(a.id) ?? Infinity
    const bIndex = orderMap.get(b.id) ?? Infinity
    return aIndex - bIndex
  })
}

/**
 * Group themes by color
 */
export function groupThemesByColor<T extends string>(
  themes: Theme<T>[]
): Record<string, Theme<T>[]> {
  const grouped: Record<string, Theme<T>[]> = {}

  themes.forEach(theme => {
    if (!grouped[theme.color]) {
      grouped[theme.color] = []
    }
    grouped[theme.color].push(theme)
  })

  return grouped
}

/**
 * Find theme by label (case-insensitive)
 */
export function findThemeByLabel<T extends string>(
  registry: ThemeRegistry<T>,
  label: string
): Theme<T> | undefined {
  const normalizedLabel = label.toLowerCase()
  return registry.getAll().find(t => t.label.toLowerCase() === normalizedLabel)
}

/**
 * Validate theme has all required fields
 */
export function validateTheme(theme: Partial<Theme>): boolean {
  const required: (keyof Theme)[] = ['id', 'icon', 'color', 'bgColor', 'borderColor', 'textColor', 'label']
  return required.every(field => theme[field] !== undefined && theme[field] !== '')
}
