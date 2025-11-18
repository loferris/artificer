/**
 * FableForge Specialist Theme System
 *
 * Provides consistent theming for the 5 specialist translators + final synthesis
 * Built on Artificer UI ThemeRegistry for type-safe theme management
 */

import { ThemeRegistry } from '@artificer/ui'

export type SpecialistType =
  | 'cultural_specialist'
  | 'prose_stylist'
  | 'dialogue_specialist'
  | 'narrative_specialist'
  | 'fluency_optimizer'
  | 'final_synthesis'

/**
 * Specialist theme registry - single source of truth for all specialist theming
 */
export const specialistThemes = new ThemeRegistry<SpecialistType>()

// Register all specialist themes
specialistThemes.register('cultural_specialist', {
  icon: '🌏',
  color: 'blue',
  bgColor: 'bg-blue-50',
  borderColor: 'border-blue-200',
  textColor: 'text-blue-700',
  label: 'Cultural Specialist',
  description: 'Preserves cultural authenticity',
  metadata: { tagline: 'Preserves cultural authenticity' }
})

specialistThemes.register('prose_stylist', {
  icon: '✍️',
  color: 'purple',
  bgColor: 'bg-purple-50',
  borderColor: 'border-purple-200',
  textColor: 'text-purple-700',
  label: 'Prose Stylist',
  description: 'Polished, literary prose',
  metadata: { tagline: 'Polished, literary prose' }
})

specialistThemes.register('dialogue_specialist', {
  icon: '💬',
  color: 'green',
  bgColor: 'bg-green-50',
  borderColor: 'border-green-200',
  textColor: 'text-green-700',
  label: 'Dialogue Specialist',
  description: 'Natural conversation flow',
  metadata: { tagline: 'Natural conversation flow' }
})

specialistThemes.register('narrative_specialist', {
  icon: '📖',
  color: 'orange',
  bgColor: 'bg-orange-50',
  borderColor: 'border-orange-200',
  textColor: 'text-orange-700',
  label: 'Narrative Specialist',
  description: 'Story momentum and pacing',
  metadata: { tagline: 'Story momentum and pacing' }
})

specialistThemes.register('fluency_optimizer', {
  icon: '🎯',
  color: 'pink',
  bgColor: 'bg-pink-50',
  borderColor: 'border-pink-200',
  textColor: 'text-pink-700',
  label: 'Fluency Optimizer',
  description: 'Readability and clarity',
  metadata: { tagline: 'Readability and clarity' }
})

specialistThemes.register('final_synthesis', {
  icon: '✨',
  color: 'emerald',
  bgColor: 'bg-emerald-50',
  borderColor: 'border-emerald-200',
  textColor: 'text-emerald-700',
  label: 'Senior Editor',
  description: 'Final synthesis',
  metadata: { tagline: 'Final synthesis' }
})

// Set default theme
specialistThemes.setDefault('final_synthesis')

/**
 * Type guard to check if a string is a valid specialist type
 */
export function isSpecialistType(value: string): value is SpecialistType {
  return specialistThemes.has(value as SpecialistType)
}

/**
 * Get all specialist types in order
 */
export function getAllSpecialistTypes(): SpecialistType[] {
  return specialistThemes.getAllIds()
}

/**
 * Get tagline for a specialist (backward compatibility)
 */
export function getSpecialistTagline(type: SpecialistType): string {
  const theme = specialistThemes.get(type)
  return (theme?.metadata?.tagline as string) || theme?.description || ''
}
