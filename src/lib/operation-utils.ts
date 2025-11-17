/**
 * Operation utilities for parsing, formatting, and grouping worldbuilding operations
 */

import type { ValidationResult } from './validation-utils'

export type OperationIntent =
  | 'CREATE_ENTITY'
  | 'UPDATE_ENTITY'
  | 'DELETE_ENTITY'
  | 'DEFINE_RELATIONSHIP'
  | 'UPDATE_RELATIONSHIP'
  | 'DELETE_RELATIONSHIP'
  | 'ADD_ATTRIBUTE'
  | 'REMOVE_ATTRIBUTE'
  | 'SET_PROPERTY'

export interface Operation {
  id: string
  intent: OperationIntent
  entityType?: string
  entityName?: string
  targetEntity?: string
  relationshipType?: string
  attributes?: Record<string, unknown>
  previousValue?: unknown
  newValue?: unknown
  validation?: ValidationResult[]
  timestamp: Date
  sessionId?: string
}

export interface OperationTheme {
  icon: string
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  label: string
}

export const operationTheme: Record<OperationIntent, OperationTheme> = {
  CREATE_ENTITY: {
    icon: '✨',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    label: 'Create Entity'
  },
  UPDATE_ENTITY: {
    icon: '📝',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    label: 'Update Entity'
  },
  DELETE_ENTITY: {
    icon: '🗑️',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    label: 'Delete Entity'
  },
  DEFINE_RELATIONSHIP: {
    icon: '🔗',
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    label: 'Define Relationship'
  },
  UPDATE_RELATIONSHIP: {
    icon: '🔄',
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-700',
    label: 'Update Relationship'
  },
  DELETE_RELATIONSHIP: {
    icon: '💔',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    label: 'Delete Relationship'
  },
  ADD_ATTRIBUTE: {
    icon: '➕',
    color: 'teal',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-700',
    label: 'Add Attribute'
  },
  REMOVE_ATTRIBUTE: {
    icon: '➖',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    label: 'Remove Attribute'
  },
  SET_PROPERTY: {
    icon: '⚙️',
    color: 'gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-700',
    label: 'Set Property'
  }
}

/**
 * Get operation theme by intent
 */
export function getOperationTheme(intent: OperationIntent): OperationTheme {
  return operationTheme[intent]
}

/**
 * Format operation as human-readable text
 */
export function formatOperation(operation: Operation): string {
  const { intent, entityType, entityName, targetEntity, relationshipType } = operation

  switch (intent) {
    case 'CREATE_ENTITY':
      return `Create ${entityType}: ${entityName}`
    case 'UPDATE_ENTITY':
      return `Update ${entityType}: ${entityName}`
    case 'DELETE_ENTITY':
      return `Delete ${entityType}: ${entityName}`
    case 'DEFINE_RELATIONSHIP':
      return `${entityName} → ${relationshipType} → ${targetEntity}`
    case 'UPDATE_RELATIONSHIP':
      return `Update relationship: ${entityName} → ${relationshipType} → ${targetEntity}`
    case 'DELETE_RELATIONSHIP':
      return `Remove relationship: ${entityName} → ${relationshipType} → ${targetEntity}`
    case 'ADD_ATTRIBUTE':
      return `Add attribute to ${entityName}`
    case 'REMOVE_ATTRIBUTE':
      return `Remove attribute from ${entityName}`
    case 'SET_PROPERTY':
      return `Set property on ${entityName}`
    default:
      return 'Unknown operation'
  }
}

/**
 * Get short description of operation
 */
export function getOperationDescription(operation: Operation): string {
  const theme = getOperationTheme(operation.intent)
  return `${theme.icon} ${theme.label}`
}

/**
 * Group operations by intent
 */
export function groupByIntent(operations: Operation[]): Record<OperationIntent, Operation[]> {
  const grouped = {} as Record<OperationIntent, Operation[]>

  operations.forEach(op => {
    if (!grouped[op.intent]) {
      grouped[op.intent] = []
    }
    grouped[op.intent].push(op)
  })

  return grouped
}

/**
 * Group operations by entity
 */
export function groupByEntity(operations: Operation[]): Record<string, Operation[]> {
  const grouped: Record<string, Operation[]> = {}

  operations.forEach(op => {
    const key = op.entityName || 'Unknown'
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(op)
  })

  return grouped
}

/**
 * Group operations by session
 */
export function groupBySession(operations: Operation[]): Record<string, Operation[]> {
  const grouped: Record<string, Operation[]> = {
    'No Session': []
  }

  operations.forEach(op => {
    const key = op.sessionId || 'No Session'
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(op)
  })

  return grouped
}

/**
 * Filter operations by intent
 */
export function filterByIntent(
  operations: Operation[],
  intents: OperationIntent[]
): Operation[] {
  return operations.filter(op => intents.includes(op.intent))
}

/**
 * Filter operations with validation issues
 */
export function filterWithValidation(operations: Operation[]): Operation[] {
  return operations.filter(op => op.validation && op.validation.length > 0)
}

/**
 * Get operation counts by intent
 */
export function getOperationCounts(operations: Operation[]): Record<string, number> {
  const counts: Record<string, number> = {}

  operations.forEach(op => {
    counts[op.intent] = (counts[op.intent] || 0) + 1
  })

  return counts
}

/**
 * Get total operation count
 */
export function getTotalOperations(operations: Operation[]): number {
  return operations.length
}

/**
 * Get unique entities from operations
 */
export function getUniqueEntities(operations: Operation[]): string[] {
  const entities = new Set<string>()

  operations.forEach(op => {
    if (op.entityName) {
      entities.add(op.entityName)
    }
    if (op.targetEntity) {
      entities.add(op.targetEntity)
    }
  })

  return Array.from(entities)
}

/**
 * Get operations for a specific entity
 */
export function getOperationsForEntity(
  operations: Operation[],
  entityName: string
): Operation[] {
  return operations.filter(
    op => op.entityName === entityName || op.targetEntity === entityName
  )
}

/**
 * Sort operations by timestamp (newest first)
 */
export function sortByTimestamp(
  operations: Operation[],
  ascending = false
): Operation[] {
  return [...operations].sort((a, b) => {
    const comparison = a.timestamp.getTime() - b.timestamp.getTime()
    return ascending ? comparison : -comparison
  })
}

/**
 * Parse operations from AI response text
 * This is a simple parser - adjust based on actual Artificer response format
 */
export function parseOperationsFromText(text: string): Operation[] {
  const operations: Operation[] = []
  const lines = text.split('\n')

  // Simple regex patterns - adjust to match actual format
  const createEntityPattern = /CREATE_ENTITY:\s*(\w+)\s*-\s*(.+)/i
  const defineRelPattern = /DEFINE_RELATIONSHIP:\s*(.+)\s*→\s*(.+)\s*→\s*(.+)/i

  lines.forEach((line, index) => {
    const createMatch = line.match(createEntityPattern)
    if (createMatch) {
      operations.push({
        id: `op-${Date.now()}-${index}`,
        intent: 'CREATE_ENTITY',
        entityType: createMatch[1],
        entityName: createMatch[2],
        timestamp: new Date()
      })
      return
    }

    const relMatch = line.match(defineRelPattern)
    if (relMatch) {
      operations.push({
        id: `op-${Date.now()}-${index}`,
        intent: 'DEFINE_RELATIONSHIP',
        entityName: relMatch[1].trim(),
        relationshipType: relMatch[2].trim(),
        targetEntity: relMatch[3].trim(),
        timestamp: new Date()
      })
    }
  })

  return operations
}
