/**
 * Translator Domain Extension for Artificer UI
 *
 * Domain-specific themes, components, and utilities for the Translator
 * translation pipeline system. Built on Artificer UI core library.
 *
 * @module @artificer/translator
 */

// Themes
export {
  specialistThemes,
  isSpecialistType,
  getAllSpecialistTypes,
  getSpecialistTagline
} from './themes/specialist'
export type { SpecialistType } from './themes/specialist'

// Utilities
export {
  formatSpecialistName,
  getSpecialistIcon,
  getSpecialistPipelineOrder,
  isSynthesisSpecialist,
  getPreviousSpecialist,
  getNextSpecialist,
  getSpecialistDisplayOrder,
  formatSpecialistDisplay,
  getSpecialistColorClass
} from './utils/specialist-utils'

// Components
export { SpecialistBadge } from './components'
export type { SpecialistBadgeProps } from './components'

/**
 * Version of Translator domain extension
 */
export const TRANSLATOR_VERSION = '1.0.0'
