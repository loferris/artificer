/**
 * FableForge Specialist Theme System
 *
 * Provides consistent theming for the 5 specialist translators + final synthesis
 * Used across 8+ components for icons, colors, labels, and taglines
 */

export type SpecialistType =
  | 'cultural_specialist'
  | 'prose_stylist'
  | 'dialogue_specialist'
  | 'narrative_specialist'
  | 'fluency_optimizer'
  | 'final_synthesis'

export interface SpecialistTheme {
  icon: string
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  label: string
  tagline: string
}

export const specialistTheme: Record<SpecialistType, SpecialistTheme> = {
  cultural_specialist: {
    icon: '🌏',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    label: 'Cultural Specialist',
    tagline: 'Preserves cultural authenticity'
  },
  prose_stylist: {
    icon: '✍️',
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    label: 'Prose Stylist',
    tagline: 'Polished, literary prose'
  },
  dialogue_specialist: {
    icon: '💬',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    label: 'Dialogue Specialist',
    tagline: 'Natural conversation flow'
  },
  narrative_specialist: {
    icon: '📖',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    label: 'Narrative Specialist',
    tagline: 'Story momentum and pacing'
  },
  fluency_optimizer: {
    icon: '🎯',
    color: 'pink',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    textColor: 'text-pink-700',
    label: 'Fluency Optimizer',
    tagline: 'Readability and clarity'
  },
  final_synthesis: {
    icon: '✨',
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    label: 'Senior Editor',
    tagline: 'Final synthesis'
  }
}

/**
 * Get theme configuration for a specialist type
 */
export function getSpecialistTheme(type: SpecialistType): SpecialistTheme {
  return specialistTheme[type]
}

/**
 * Get all specialist types
 */
export function getAllSpecialistTypes(): SpecialistType[] {
  return Object.keys(specialistTheme) as SpecialistType[]
}

/**
 * Check if a string is a valid specialist type
 */
export function isSpecialistType(value: string): value is SpecialistType {
  return value in specialistTheme
}
