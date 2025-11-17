/**
 * Validation utilities for grouping, filtering, and formatting validation results
 *
 * DEPRECATED: This file is maintained for backward compatibility.
 * Please import from '@/lib/hellbat' instead.
 *
 * @deprecated Use '@/lib/hellbat' instead
 */

// Re-export everything from hellbat domain module
export type {
  Severity,
  ValidationResult,
  GroupedValidation
} from '@artificer/hellbat'

export {
  validationThemes,
  groupBySeverity,
  groupByValidator,
  groupValidationsByEntity as groupByEntity,
  filterBySeverity,
  filterFixable,
  getValidationCounts,
  hasErrors,
  isValid,
  getHighestSeverity,
  sortBySeverity,
  formatValidationSummary,
  getSeverityIcon,
  getSeverityLabel,
  getSeverityColorClass,
  applyAllAutoFixes
} from '@artificer/hellbat'

// Legacy theme interface for backward compatibility
import { validationThemes, type Severity } from '@artificer/hellbat'

/**
 * @deprecated Use validationThemes.get() from '@/lib/hellbat' instead
 */
export interface SeverityTheme {
  icon: string
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  label: string
}

/**
 * Legacy theme record - converted from ThemeRegistry
 * @deprecated Use validationThemes from '@/lib/hellbat' instead
 */
export const severityTheme: Record<Severity, SeverityTheme> = {
  error: {
    icon: validationThemes.get('error')!.icon,
    color: validationThemes.get('error')!.color,
    bgColor: validationThemes.get('error')!.bgColor,
    borderColor: validationThemes.get('error')!.borderColor,
    textColor: validationThemes.get('error')!.textColor,
    label: validationThemes.get('error')!.label
  },
  warning: {
    icon: validationThemes.get('warning')!.icon,
    color: validationThemes.get('warning')!.color,
    bgColor: validationThemes.get('warning')!.bgColor,
    borderColor: validationThemes.get('warning')!.borderColor,
    textColor: validationThemes.get('warning')!.textColor,
    label: validationThemes.get('warning')!.label
  },
  info: {
    icon: validationThemes.get('info')!.icon,
    color: validationThemes.get('info')!.color,
    bgColor: validationThemes.get('info')!.bgColor,
    borderColor: validationThemes.get('info')!.borderColor,
    textColor: validationThemes.get('info')!.textColor,
    label: validationThemes.get('info')!.label
  }
}

/**
 * Get severity theme
 * @deprecated Use validationThemes.get() from '@/lib/hellbat' instead
 */
export function getSeverityTheme(severity: Severity): SeverityTheme {
  return severityTheme[severity]
}
