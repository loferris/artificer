/**
 * Artificer UI - Theme System Core
 *
 * Generic theme registry for managing themed components across domains
 */

import type { Theme } from '../types'

/**
 * Generic theme registry for type-safe theme management
 *
 * @example
 * ```typescript
 * const specialistThemes = new ThemeRegistry<SpecialistType>()
 * specialistThemes.register('cultural_specialist', {
 *   icon: '🌏',
 *   color: 'blue',
 *   bgColor: 'bg-blue-50',
 *   borderColor: 'border-blue-200',
 *   textColor: 'text-blue-700',
 *   label: 'Cultural Specialist'
 * })
 *
 * const theme = specialistThemes.get('cultural_specialist')
 * ```
 */
export class ThemeRegistry<T extends string = string> {
  private themes: Map<T, Theme<T>> = new Map()
  private defaultTheme?: Theme<T>

  /**
   * Register a theme with the given ID
   */
  register(id: T, theme: Omit<Theme<T>, 'id'>): void {
    this.themes.set(id, { ...theme, id } as Theme<T>)
  }

  /**
   * Register multiple themes at once
   */
  registerMany(themes: Record<T, Omit<Theme<T>, 'id'>>): void {
    Object.entries(themes).forEach(([id, theme]) => {
      this.register(id as T, theme as Omit<Theme<T>, 'id'>)
    })
  }

  /**
   * Get a theme by ID
   */
  get(id: T): Theme<T> | undefined {
    return this.themes.get(id)
  }

  /**
   * Get a theme by ID, or return default if not found
   */
  getOrDefault(id: T): Theme<T> | undefined {
    return this.themes.get(id) || this.defaultTheme
  }

  /**
   * Get all registered themes
   */
  getAll(): Theme<T>[] {
    return Array.from(this.themes.values())
  }

  /**
   * Get all theme IDs
   */
  getAllIds(): T[] {
    return Array.from(this.themes.keys())
  }

  /**
   * Check if a theme exists
   */
  has(id: T): boolean {
    return this.themes.has(id)
  }

  /**
   * Get themes by color
   */
  getByColor(color: string): Theme<T>[] {
    return Array.from(this.themes.values()).filter(t => t.color === color)
  }

  /**
   * Set default theme for fallback
   */
  setDefault(id: T): void {
    const theme = this.themes.get(id)
    if (theme) {
      this.defaultTheme = theme
    }
  }

  /**
   * Remove a theme
   */
  unregister(id: T): boolean {
    return this.themes.delete(id)
  }

  /**
   * Clear all themes
   */
  clear(): void {
    this.themes.clear()
    this.defaultTheme = undefined
  }

  /**
   * Get count of registered themes
   */
  size(): number {
    return this.themes.size
  }

  /**
   * Convert to plain object
   */
  toObject(): Record<T, Theme<T>> {
    const obj: Record<string, Theme<T>> = {}
    this.themes.forEach((theme, id) => {
      obj[id] = theme
    })
    return obj as Record<T, Theme<T>>
  }

  /**
   * Create from plain object
   */
  static fromObject<T extends string>(
    obj: Record<T, Omit<Theme<T>, 'id'>>
  ): ThemeRegistry<T> {
    const registry = new ThemeRegistry<T>()
    registry.registerMany(obj)
    return registry
  }
}

/**
 * Create a theme record (legacy compatibility helper)
 */
export function createThemeRecord<T extends string>(
  themes: Record<T, Omit<Theme<T>, 'id'>>
): Record<T, Theme<T>> {
  const result: Record<string, Theme<T>> = {}
  Object.entries(themes).forEach(([id, theme]) => {
    result[id] = { ...(theme as object), id: id as T } as Theme<T>
  })
  return result as Record<T, Theme<T>>
}

/**
 * Get theme from a theme record (legacy compatibility helper)
 */
export function getTheme<T extends string>(
  themeRecord: Record<T, Theme<T>>,
  key: T
): Theme<T> | undefined {
  return themeRecord[key]
}
