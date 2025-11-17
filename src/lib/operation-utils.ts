/**
 * Operation utilities for parsing, formatting, and grouping worldbuilding operations
 *
 * DEPRECATED: This file is maintained for backward compatibility.
 * Please import from '@/lib/hellbat' instead.
 *
 * @deprecated Use '@/lib/hellbat' instead
 */

// Re-export everything from hellbat domain module
export type {
  OperationIntent,
  Operation
} from './hellbat'

export {
  operationThemes,
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
} from './hellbat'

// Legacy theme interface for backward compatibility
import { operationThemes, type OperationIntent } from './hellbat'

/**
 * @deprecated Use operationThemes.get() from '@/lib/hellbat' instead
 */
export interface OperationTheme {
  icon: string
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  label: string
}

/**
 * Legacy theme record - converted from ThemeRegistry
 * @deprecated Use operationThemes from '@/lib/hellbat' instead
 */
export const operationTheme: Record<OperationIntent, OperationTheme> = {
  CREATE_ENTITY: {
    icon: operationThemes.get('CREATE_ENTITY')!.icon,
    color: operationThemes.get('CREATE_ENTITY')!.color,
    bgColor: operationThemes.get('CREATE_ENTITY')!.bgColor,
    borderColor: operationThemes.get('CREATE_ENTITY')!.borderColor,
    textColor: operationThemes.get('CREATE_ENTITY')!.textColor,
    label: operationThemes.get('CREATE_ENTITY')!.label
  },
  UPDATE_ENTITY: {
    icon: operationThemes.get('UPDATE_ENTITY')!.icon,
    color: operationThemes.get('UPDATE_ENTITY')!.color,
    bgColor: operationThemes.get('UPDATE_ENTITY')!.bgColor,
    borderColor: operationThemes.get('UPDATE_ENTITY')!.borderColor,
    textColor: operationThemes.get('UPDATE_ENTITY')!.textColor,
    label: operationThemes.get('UPDATE_ENTITY')!.label
  },
  DELETE_ENTITY: {
    icon: operationThemes.get('DELETE_ENTITY')!.icon,
    color: operationThemes.get('DELETE_ENTITY')!.color,
    bgColor: operationThemes.get('DELETE_ENTITY')!.bgColor,
    borderColor: operationThemes.get('DELETE_ENTITY')!.borderColor,
    textColor: operationThemes.get('DELETE_ENTITY')!.textColor,
    label: operationThemes.get('DELETE_ENTITY')!.label
  },
  DEFINE_RELATIONSHIP: {
    icon: operationThemes.get('DEFINE_RELATIONSHIP')!.icon,
    color: operationThemes.get('DEFINE_RELATIONSHIP')!.color,
    bgColor: operationThemes.get('DEFINE_RELATIONSHIP')!.bgColor,
    borderColor: operationThemes.get('DEFINE_RELATIONSHIP')!.borderColor,
    textColor: operationThemes.get('DEFINE_RELATIONSHIP')!.textColor,
    label: operationThemes.get('DEFINE_RELATIONSHIP')!.label
  },
  UPDATE_RELATIONSHIP: {
    icon: operationThemes.get('UPDATE_RELATIONSHIP')!.icon,
    color: operationThemes.get('UPDATE_RELATIONSHIP')!.color,
    bgColor: operationThemes.get('UPDATE_RELATIONSHIP')!.bgColor,
    borderColor: operationThemes.get('UPDATE_RELATIONSHIP')!.borderColor,
    textColor: operationThemes.get('UPDATE_RELATIONSHIP')!.textColor,
    label: operationThemes.get('UPDATE_RELATIONSHIP')!.label
  },
  DELETE_RELATIONSHIP: {
    icon: operationThemes.get('DELETE_RELATIONSHIP')!.icon,
    color: operationThemes.get('DELETE_RELATIONSHIP')!.color,
    bgColor: operationThemes.get('DELETE_RELATIONSHIP')!.bgColor,
    borderColor: operationThemes.get('DELETE_RELATIONSHIP')!.borderColor,
    textColor: operationThemes.get('DELETE_RELATIONSHIP')!.textColor,
    label: operationThemes.get('DELETE_RELATIONSHIP')!.label
  },
  ADD_ATTRIBUTE: {
    icon: operationThemes.get('ADD_ATTRIBUTE')!.icon,
    color: operationThemes.get('ADD_ATTRIBUTE')!.color,
    bgColor: operationThemes.get('ADD_ATTRIBUTE')!.bgColor,
    borderColor: operationThemes.get('ADD_ATTRIBUTE')!.borderColor,
    textColor: operationThemes.get('ADD_ATTRIBUTE')!.textColor,
    label: operationThemes.get('ADD_ATTRIBUTE')!.label
  },
  REMOVE_ATTRIBUTE: {
    icon: operationThemes.get('REMOVE_ATTRIBUTE')!.icon,
    color: operationThemes.get('REMOVE_ATTRIBUTE')!.color,
    bgColor: operationThemes.get('REMOVE_ATTRIBUTE')!.bgColor,
    borderColor: operationThemes.get('REMOVE_ATTRIBUTE')!.borderColor,
    textColor: operationThemes.get('REMOVE_ATTRIBUTE')!.textColor,
    label: operationThemes.get('REMOVE_ATTRIBUTE')!.label
  },
  SET_PROPERTY: {
    icon: operationThemes.get('SET_PROPERTY')!.icon,
    color: operationThemes.get('SET_PROPERTY')!.color,
    bgColor: operationThemes.get('SET_PROPERTY')!.bgColor,
    borderColor: operationThemes.get('SET_PROPERTY')!.borderColor,
    textColor: operationThemes.get('SET_PROPERTY')!.textColor,
    label: operationThemes.get('SET_PROPERTY')!.label
  }
}

/**
 * Get operation theme by intent
 * @deprecated Use operationThemes.get() from '@/lib/hellbat' instead
 */
export function getOperationTheme(intent: OperationIntent): OperationTheme {
  return operationTheme[intent]
}
