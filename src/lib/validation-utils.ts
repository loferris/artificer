/**
 * Validation utilities for grouping, filtering, and formatting validation results
 */

export type Severity = 'error' | 'warning' | 'info'

export interface ValidationResult {
  id: string
  severity: Severity
  validator: string
  message: string
  suggestion?: string
  autoFix?: () => void
  entityId?: string
  entityName?: string
}

export interface GroupedValidation {
  severity: Severity
  results: ValidationResult[]
  count: number
}

export interface SeverityTheme {
  icon: string
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  label: string
}

export const severityTheme: Record<Severity, SeverityTheme> = {
  error: {
    icon: '❌',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    label: 'Errors'
  },
  warning: {
    icon: '⚠️',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    label: 'Warnings'
  },
  info: {
    icon: 'ℹ️',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    label: 'Info'
  }
}

/**
 * Group validations by severity
 */
export function groupBySeverity(
  results: ValidationResult[]
): Record<Severity, ValidationResult[]> {
  const grouped: Record<Severity, ValidationResult[]> = {
    error: [],
    warning: [],
    info: []
  }

  results.forEach(result => {
    grouped[result.severity].push(result)
  })

  return grouped
}

/**
 * Group validations by validator
 */
export function groupByValidator(
  results: ValidationResult[]
): Record<string, ValidationResult[]> {
  const grouped: Record<string, ValidationResult[]> = {}

  results.forEach(result => {
    if (!grouped[result.validator]) {
      grouped[result.validator] = []
    }
    grouped[result.validator].push(result)
  })

  return grouped
}

/**
 * Group validations by entity
 */
export function groupByEntity(
  results: ValidationResult[]
): Record<string, ValidationResult[]> {
  const grouped: Record<string, ValidationResult[]> = {
    'No Entity': []
  }

  results.forEach(result => {
    const key = result.entityName || result.entityId || 'No Entity'
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(result)
  })

  return grouped
}

/**
 * Filter validations by severity
 */
export function filterBySeverity(
  results: ValidationResult[],
  severities: Severity[]
): ValidationResult[] {
  return results.filter(result => severities.includes(result.severity))
}

/**
 * Filter validations with auto-fix available
 */
export function filterFixable(results: ValidationResult[]): ValidationResult[] {
  return results.filter(result => result.autoFix !== undefined)
}

/**
 * Get validation counts by severity
 */
export function getValidationCounts(results: ValidationResult[]): Record<Severity, number> {
  const grouped = groupBySeverity(results)
  return {
    error: grouped.error.length,
    warning: grouped.warning.length,
    info: grouped.info.length
  }
}

/**
 * Check if there are any errors
 */
export function hasErrors(results: ValidationResult[]): boolean {
  return results.some(result => result.severity === 'error')
}

/**
 * Check if validation passed (no errors)
 */
export function isValid(results: ValidationResult[]): boolean {
  return !hasErrors(results)
}

/**
 * Get highest severity from results
 */
export function getHighestSeverity(results: ValidationResult[]): Severity | null {
  if (results.length === 0) return null

  const severityOrder: Severity[] = ['error', 'warning', 'info']

  for (const severity of severityOrder) {
    if (results.some(r => r.severity === severity)) {
      return severity
    }
  }

  return null
}

/**
 * Sort validations by severity (errors first)
 */
export function sortBySeverity(results: ValidationResult[]): ValidationResult[] {
  const severityOrder: Record<Severity, number> = {
    error: 0,
    warning: 1,
    info: 2
  }

  return [...results].sort((a, b) => {
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

/**
 * Format validation summary
 */
export function formatValidationSummary(results: ValidationResult[]): string {
  const counts = getValidationCounts(results)
  const parts: string[] = []

  if (counts.error > 0) {
    parts.push(`${counts.error} ${counts.error === 1 ? 'error' : 'errors'}`)
  }
  if (counts.warning > 0) {
    parts.push(`${counts.warning} ${counts.warning === 1 ? 'warning' : 'warnings'}`)
  }
  if (counts.info > 0) {
    parts.push(`${counts.info} info`)
  }

  if (parts.length === 0) {
    return 'No issues'
  }

  return parts.join(', ')
}

/**
 * Get severity theme
 */
export function getSeverityTheme(severity: Severity): SeverityTheme {
  return severityTheme[severity]
}
