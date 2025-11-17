/**
 * FableForge Domain Extension for Artificer UI
 *
 * Domain-specific themes, components, and utilities for the FableForge
 * translation pipeline system. Built on Artificer UI core library.
 *
 * @module @artificer/fableforge
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
 * Version of FableForge domain extension
 */
export const FABLEFORGE_VERSION = '1.0.0'
