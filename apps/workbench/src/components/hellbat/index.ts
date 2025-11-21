/**
 * Hellbat Component Library
 *
 * A comprehensive set of React components for worldbuilding AI applications
 */

// Chat Components
export { StreamingMessage } from './chat/StreamingMessage'
export type { StreamingMessageProps } from './chat/StreamingMessage'

export { SourceAttribution } from './chat/SourceAttribution'
export type { SourceAttributionProps, Source } from './chat/SourceAttribution'

// Validation Components
export { ValidationPanel } from './validation/ValidationPanel'
export type { ValidationPanelProps } from './validation/ValidationPanel'

// Operations Components
export { OperationsList } from './operations/OperationsList'
export type { OperationsListProps } from './operations/OperationsList'

export { OperationDiff } from './operations/OperationDiff'
export type { OperationDiffProps } from './operations/OperationDiff'

// Utility Components
export { WorldExportDialog } from './utilities/WorldExportDialog'
export type { WorldExportDialogProps, WorldExportFormat, WorldExportOptions } from './utilities/WorldExportDialog'

// Re-export shared components from @artificer/ui
export { CopyButton, StatusBadge, BadgeGroup, ExpandableSection, type Status } from '@artificer/ui'

// Re-export UI components
export { Badge } from '../ui/badge'
export { Button } from '../ui/button'
export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '../ui/card'
export { Progress } from '../ui/progress'
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '../ui/dialog'

// Re-export utilities
export {
  type Operation,
  type OperationIntent,
  operationThemes,
  formatOperation,
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
  isOperationIntent,
  getAllOperationIntents
} from '@artificer/hellbat'

export {
  type ValidationResult,
  type Severity,
  type GroupedValidation,
  validationThemes,
  groupBySeverity,
  groupByValidator,
  groupValidationsByEntity,
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
  isSeverity,
  getAllSeverities,
  getSeverityOrder
} from '@artificer/hellbat'

export {
  type StreamChunk,
  type StreamOptions,
  handleSSE,
  streamPost,
  simulateStreaming,
  createAbortController
} from '@/lib/streaming-utils'

// Re-export time-utils from FableForge
export { formatTimeAgo, formatDuration, formatTimestamp } from '@artificer/ui'

// Re-export diff-engine from FableForge
export { computeDiff, getSimilarityScore, highlightDifferences } from '@artificer/ui'

// Re-export hooks
export { useConversation } from '@/hooks/useConversation'
export type { UseConversationOptions, UseConversationReturn, Message, Conversation, SendMessageOptions } from '@/hooks/useConversation'

export { useStreamingMessage } from '@/hooks/useStreamingMessage'
export type { UseStreamingMessageOptions, UseStreamingMessageReturn } from '@/hooks/useStreamingMessage'

export { useValidation } from '@/hooks/useValidation'
export type { UseValidationOptions, UseValidationReturn } from '@/hooks/useValidation'

// Re-export copy hooks from FableForge
export { useCopyToClipboard } from '@artificer/ui'
export { useExpandable, useMultiExpandable } from '@artificer/ui'
