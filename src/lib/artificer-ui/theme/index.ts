/**
 * Artificer UI - Theme System
 *
 * Unified theme system for managing themed components across domains
 */

export { ThemeRegistry, createThemeRecord, getTheme } from './core'
export {
  applyThemeClasses,
  getThemeBorderClass,
  getThemeBgClass,
  mergeThemeClasses,
  filterThemes,
  getThemeIcon,
  sortThemesByLabel,
  sortThemesByOrder,
  groupThemesByColor,
  findThemeByLabel,
  validateTheme
} from './utils'

export type { Theme } from '../types'
