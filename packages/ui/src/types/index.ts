/**
 * Artificer UI - Core Types
 *
 * Shared type definitions for the Artificer UI library
 */

/**
 * Base theme interface for all domain themes
 * Provides consistent color, icon, and label structure
 */
export interface Theme<T extends string = string> {
  id: T
  icon: string
  color: string           // Badge variant: 'blue' | 'green' | 'red' | etc.
  bgColor: string        // Tailwind class: 'bg-blue-50'
  borderColor: string    // Tailwind class: 'border-blue-200'
  textColor: string      // Tailwind class: 'text-blue-700'
  label: string          // Human-readable name
  description?: string   // Tooltip/help text
  metadata?: Record<string, unknown>  // Domain-specific data
}

/**
 * Status types used across components
 */
export type Status = 'pending' | 'running' | 'completed' | 'failed' | 'retry' | 'idle' | 'cancelled'

/**
 * Diff segment types for text comparison
 */
export type DiffType = 'added' | 'removed' | 'unchanged' | 'modified'

export interface DiffSegment {
  type: DiffType
  value: string
  index: number
}

/**
 * Stream chunk for real-time streaming
 */
export interface StreamChunk {
  content: string
  done: boolean
  error?: string
}

/**
 * Badge item for badge groups
 */
export interface BadgeItem {
  label: string
  variant?: string
  icon?: string
  theme?: Theme
}

/**
 * Export format configuration
 */
export interface ExportFormat<T = unknown> {
  id: string
  label: string
  description: string
  icon: string
  fileExtension?: string
  mimeType?: string
  serialize: (data: T, options: Record<string, boolean>) => string | Promise<string>
  options?: ExportOption[]
}

export interface ExportOption {
  id: string
  label: string
  description: string
  defaultValue: boolean
}

/**
 * Component logger context
 */
export interface ComponentLogContext {
  component: string
  action?: string
}

/**
 * User interaction log entry
 */
export interface UserInteraction {
  component: string
  action: string
  metadata?: Record<string, unknown>
}

/**
 * Performance metrics log entry
 */
export interface PerformanceMetrics {
  component: string
  operation: string
  duration: number
  metadata?: Record<string, unknown>
}
