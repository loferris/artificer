/**
 * Translator Specialist Utilities
 *
 * Helper functions for working with specialists, candidates, and translations
 */

import type { SpecialistType } from '../themes/specialist'
import { specialistThemes } from '../themes/specialist'

/**
 * Get formatted specialist name
 */
export function formatSpecialistName(type: SpecialistType): string {
  return specialistThemes.get(type)?.label || type
}

/**
 * Get specialist icon
 */
export function getSpecialistIcon(type: SpecialistType): string {
  return specialistThemes.get(type)?.icon || '📝'
}

/**
 * Get specialists in pipeline order (processing sequence)
 */
export function getSpecialistPipelineOrder(): SpecialistType[] {
  return [
    'cultural_specialist',
    'prose_stylist',
    'dialogue_specialist',
    'narrative_specialist',
    'fluency_optimizer',
    'final_synthesis'
  ]
}

/**
 * Check if specialist is a synthesis step
 */
export function isSynthesisSpecialist(type: SpecialistType): boolean {
  return type === 'final_synthesis'
}

/**
 * Get previous specialist in pipeline
 */
export function getPreviousSpecialist(type: SpecialistType): SpecialistType | null {
  const order = getSpecialistPipelineOrder()
  const index = order.indexOf(type)
  return index > 0 ? order[index - 1] : null
}

/**
 * Get next specialist in pipeline
 */
export function getNextSpecialist(type: SpecialistType): SpecialistType | null {
  const order = getSpecialistPipelineOrder()
  const index = order.indexOf(type)
  return index < order.length - 1 ? order[index + 1] : null
}

/**
 * Get specialist display order for UI (alphabetical by label)
 */
export function getSpecialistDisplayOrder(): SpecialistType[] {
  return specialistThemes.getAllIds().sort((a, b) => {
    const labelA = specialistThemes.get(a)?.label || ''
    const labelB = specialistThemes.get(b)?.label || ''
    return labelA.localeCompare(labelB)
  })
}

/**
 * Format specialist with icon and label
 */
export function formatSpecialistDisplay(type: SpecialistType): string {
  const theme = specialistThemes.get(type)
  if (!theme) return type
  return `${theme.icon} ${theme.label}`
}

/**
 * Get specialist color class for Tailwind
 */
export function getSpecialistColorClass(
  type: SpecialistType,
  variant: 'bg' | 'text' | 'border' = 'bg'
): string {
  const theme = specialistThemes.get(type)
  if (!theme) return variant === 'bg' ? 'bg-gray-50' : variant === 'text' ? 'text-gray-700' : 'border-gray-200'

  switch (variant) {
    case 'bg':
      return theme.bgColor
    case 'text':
      return theme.textColor
    case 'border':
      return theme.borderColor
    default:
      return theme.bgColor
  }
}
