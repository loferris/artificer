/**
 * FableForge Specialist Theme System
 *
 * DEPRECATED: This file is maintained for backward compatibility.
 * Please import from '@/lib/fableforge' instead.
 *
 * @deprecated Use '@/lib/fableforge' instead
 */

import { specialistThemes } from '@artificer/fableforge'
import type { SpecialistType } from '@artificer/fableforge'

/**
 * @deprecated Use specialistThemes.get() from '@/lib/fableforge' instead
 */
export interface SpecialistTheme {
  icon: string
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  label: string
  tagline: string
}

/**
 * @deprecated Use SpecialistType from '@/lib/fableforge' instead
 */
export type { SpecialistType }

/**
 * Legacy theme record - converted from ThemeRegistry
 * @deprecated Use specialistThemes from '@/lib/fableforge' instead
 */
export const specialistTheme: Record<SpecialistType, SpecialistTheme> = {
  cultural_specialist: {
    icon: specialistThemes.get('cultural_specialist')!.icon,
    color: specialistThemes.get('cultural_specialist')!.color,
    bgColor: specialistThemes.get('cultural_specialist')!.bgColor,
    borderColor: specialistThemes.get('cultural_specialist')!.borderColor,
    textColor: specialistThemes.get('cultural_specialist')!.textColor,
    label: specialistThemes.get('cultural_specialist')!.label,
    tagline: specialistThemes.get('cultural_specialist')!.metadata?.tagline as string
  },
  prose_stylist: {
    icon: specialistThemes.get('prose_stylist')!.icon,
    color: specialistThemes.get('prose_stylist')!.color,
    bgColor: specialistThemes.get('prose_stylist')!.bgColor,
    borderColor: specialistThemes.get('prose_stylist')!.borderColor,
    textColor: specialistThemes.get('prose_stylist')!.textColor,
    label: specialistThemes.get('prose_stylist')!.label,
    tagline: specialistThemes.get('prose_stylist')!.metadata?.tagline as string
  },
  dialogue_specialist: {
    icon: specialistThemes.get('dialogue_specialist')!.icon,
    color: specialistThemes.get('dialogue_specialist')!.color,
    bgColor: specialistThemes.get('dialogue_specialist')!.bgColor,
    borderColor: specialistThemes.get('dialogue_specialist')!.borderColor,
    textColor: specialistThemes.get('dialogue_specialist')!.textColor,
    label: specialistThemes.get('dialogue_specialist')!.label,
    tagline: specialistThemes.get('dialogue_specialist')!.metadata?.tagline as string
  },
  narrative_specialist: {
    icon: specialistThemes.get('narrative_specialist')!.icon,
    color: specialistThemes.get('narrative_specialist')!.color,
    bgColor: specialistThemes.get('narrative_specialist')!.bgColor,
    borderColor: specialistThemes.get('narrative_specialist')!.borderColor,
    textColor: specialistThemes.get('narrative_specialist')!.textColor,
    label: specialistThemes.get('narrative_specialist')!.label,
    tagline: specialistThemes.get('narrative_specialist')!.metadata?.tagline as string
  },
  fluency_optimizer: {
    icon: specialistThemes.get('fluency_optimizer')!.icon,
    color: specialistThemes.get('fluency_optimizer')!.color,
    bgColor: specialistThemes.get('fluency_optimizer')!.bgColor,
    borderColor: specialistThemes.get('fluency_optimizer')!.borderColor,
    textColor: specialistThemes.get('fluency_optimizer')!.textColor,
    label: specialistThemes.get('fluency_optimizer')!.label,
    tagline: specialistThemes.get('fluency_optimizer')!.metadata?.tagline as string
  },
  final_synthesis: {
    icon: specialistThemes.get('final_synthesis')!.icon,
    color: specialistThemes.get('final_synthesis')!.color,
    bgColor: specialistThemes.get('final_synthesis')!.bgColor,
    borderColor: specialistThemes.get('final_synthesis')!.borderColor,
    textColor: specialistThemes.get('final_synthesis')!.textColor,
    label: specialistThemes.get('final_synthesis')!.label,
    tagline: specialistThemes.get('final_synthesis')!.metadata?.tagline as string
  }
}

/**
 * Get theme configuration for a specialist type
 * @deprecated Use specialistThemes.get() from '@/lib/fableforge' instead
 */
export function getSpecialistTheme(type: SpecialistType): SpecialistTheme {
  return specialistTheme[type]
}

/**
 * Get all specialist types
 * @deprecated Use getAllSpecialistTypes() from '@/lib/fableforge' instead
 */
export function getAllSpecialistTypes(): SpecialistType[] {
  return Object.keys(specialistTheme) as SpecialistType[]
}

/**
 * Check if a string is a valid specialist type
 * @deprecated Use isSpecialistType() from '@/lib/fableforge' instead
 */
export function isSpecialistType(value: string): value is SpecialistType {
  return value in specialistTheme
}
