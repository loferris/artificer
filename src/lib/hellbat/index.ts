/**
 * Hellbat Domain Extension for Artificer UI
 *
 * Domain-specific themes, components, and utilities for the Hellbat
 * worldbuilding and validation system. Built on Artificer UI core library.
 *
 * @module @artificer/hellbat
 */

// Operation Themes
export {
  operationThemes,
  isOperationIntent,
  getAllOperationIntents
} from './themes/operation'
export type { OperationIntent } from './themes/operation'

// Validation Themes
export {
  validationThemes,
  isSeverity,
  getAllSeverities,
  getSeverityOrder
} from './themes/validation'
export type { Severity } from './themes/validation'

// Operation Utilities
export {
  formatOperation,
  getOperationDescription,
  getOperationIcon,
  getOperationLabel,
  groupByIntent,
  groupByEntity,
  groupBySession,
  filterByIntent,
  filterWithValidation,
  getOperationCounts,
  getTotalOperations,
  getUniqueEntities,
  getOperationsForEntity,
  sortByTimestamp,
  parseOperationsFromText,
  isDestructiveOperation,
  isRelationshipOperation,
  isEntityOperation
} from './utils/operation-utils'
export type { Operation } from './utils/operation-utils'

// Validation Utilities
export {
  groupBySeverity,
  groupByValidator,
  groupByEntity as groupValidationsByEntity,
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
} from './utils/validation-utils'
export type { ValidationResult, GroupedValidation } from './utils/validation-utils'

// Components
export { OperationBadge, ValidationBadge } from './components'
export type { OperationBadgeProps, ValidationBadgeProps } from './components'

/**
 * Version of Hellbat domain extension
 */
export const HELLBAT_VERSION = '1.0.0'
