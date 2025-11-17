/**
 * Hellbat Operation Utilities
 *
 * Functions for parsing, formatting, grouping, and filtering worldbuilding operations
 */

import type { OperationIntent } from '../themes/operation'
import { operationThemes } from '../themes/operation'
import type { ValidationResult } from './validation-utils'

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
 * Get short description of operation with icon
 */
export function getOperationDescription(operation: Operation): string {
  const theme = operationThemes.get(operation.intent)
  if (!theme) return 'Unknown'
  return `${theme.icon} ${theme.label}`
}

/**
 * Get operation icon
 */
export function getOperationIcon(intent: OperationIntent): string {
  return operationThemes.get(intent)?.icon || '📝'
}

/**
 * Get operation label
 */
export function getOperationLabel(intent: OperationIntent): string {
  return operationThemes.get(intent)?.label || intent
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

/**
 * Check if operation is a destructive action
 */
export function isDestructiveOperation(intent: OperationIntent): boolean {
  return intent === 'DELETE_ENTITY' || intent === 'DELETE_RELATIONSHIP' || intent === 'REMOVE_ATTRIBUTE'
}

/**
 * Check if operation affects relationships
 */
export function isRelationshipOperation(intent: OperationIntent): boolean {
  return intent === 'DEFINE_RELATIONSHIP' || intent === 'UPDATE_RELATIONSHIP' || intent === 'DELETE_RELATIONSHIP'
}

/**
 * Check if operation affects entities
 */
export function isEntityOperation(intent: OperationIntent): boolean {
  return intent === 'CREATE_ENTITY' || intent === 'UPDATE_ENTITY' || intent === 'DELETE_ENTITY'
}
