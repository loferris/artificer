/**
 * Hellbat Operation Theme System
 *
 * Provides consistent theming for worldbuilding operations
 * Built on Artificer UI ThemeRegistry for type-safe theme management
 */

import { ThemeRegistry } from '@artificer/ui'

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

/**
 * Operation theme registry - single source of truth for all operation theming
 */
export const operationThemes = new ThemeRegistry<OperationIntent>()

// Register all operation themes
operationThemes.register('CREATE_ENTITY', {
  icon: '✨',
  color: 'green',
  bgColor: 'bg-green-50',
  borderColor: 'border-green-200',
  textColor: 'text-green-700',
  label: 'Create Entity',
  description: 'Creates a new entity in the world'
})

operationThemes.register('UPDATE_ENTITY', {
  icon: '📝',
  color: 'blue',
  bgColor: 'bg-blue-50',
  borderColor: 'border-blue-200',
  textColor: 'text-blue-700',
  label: 'Update Entity',
  description: 'Updates an existing entity'
})

operationThemes.register('DELETE_ENTITY', {
  icon: '🗑️',
  color: 'red',
  bgColor: 'bg-red-50',
  borderColor: 'border-red-200',
  textColor: 'text-red-700',
  label: 'Delete Entity',
  description: 'Removes an entity from the world'
})

operationThemes.register('DEFINE_RELATIONSHIP', {
  icon: '🔗',
  color: 'purple',
  bgColor: 'bg-purple-50',
  borderColor: 'border-purple-200',
  textColor: 'text-purple-700',
  label: 'Define Relationship',
  description: 'Establishes a new relationship between entities'
})

operationThemes.register('UPDATE_RELATIONSHIP', {
  icon: '🔄',
  color: 'indigo',
  bgColor: 'bg-indigo-50',
  borderColor: 'border-indigo-200',
  textColor: 'text-indigo-700',
  label: 'Update Relationship',
  description: 'Modifies an existing relationship'
})

operationThemes.register('DELETE_RELATIONSHIP', {
  icon: '💔',
  color: 'red',
  bgColor: 'bg-red-50',
  borderColor: 'border-red-200',
  textColor: 'text-red-700',
  label: 'Delete Relationship',
  description: 'Removes a relationship between entities'
})

operationThemes.register('ADD_ATTRIBUTE', {
  icon: '➕',
  color: 'teal',
  bgColor: 'bg-teal-50',
  borderColor: 'border-teal-200',
  textColor: 'text-teal-700',
  label: 'Add Attribute',
  description: 'Adds a new attribute to an entity'
})

operationThemes.register('REMOVE_ATTRIBUTE', {
  icon: '➖',
  color: 'orange',
  bgColor: 'bg-orange-50',
  borderColor: 'border-orange-200',
  textColor: 'text-orange-700',
  label: 'Remove Attribute',
  description: 'Removes an attribute from an entity'
})

operationThemes.register('SET_PROPERTY', {
  icon: '⚙️',
  color: 'gray',
  bgColor: 'bg-gray-50',
  borderColor: 'border-gray-200',
  textColor: 'text-gray-700',
  label: 'Set Property',
  description: 'Sets a property value on an entity'
})

// Set default theme
operationThemes.setDefault('UPDATE_ENTITY')

/**
 * Type guard to check if a string is a valid operation intent
 */
export function isOperationIntent(value: string): value is OperationIntent {
  return operationThemes.has(value as OperationIntent)
}

/**
 * Get all operation intents
 */
export function getAllOperationIntents(): OperationIntent[] {
  return operationThemes.getAllIds()
}
