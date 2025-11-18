/**
 * Artificer UI
 *
 * A unified, domain-agnostic React component library for AI workflow applications
 *
 * @packageDocumentation
 */

// ============================================================================
// Components
// ============================================================================

export {
  GroupedList,
  DiffViewer,
  ExportDialog,
  ThemedBadge,
  ThemedCard,
  CardHeader,
  CardContent,
  CardFooter
} from './components'

export type {
  GroupedListProps,
  DiffViewerProps,
  ExportDialogProps,
  ThemedBadgeProps,
  ThemedCardProps
} from './components'

// ============================================================================
// Theme System
// ============================================================================

export {
  ThemeRegistry,
  createThemeRecord,
  getTheme,
  applyThemeClasses,
  getThemeBorderClass,
  getThemeBgClass,
  mergeThemeClasses,
  filterThemes,
  getThemeIcon,
  sortThemesByLabel,
  sortThemesByOrder,
  groupThemesByColor,
  findThemeByLabel,
  validateTheme
} from './theme'

// ============================================================================
// Hooks
// ============================================================================

export {
  useExpandableCollection,
  useComponentLogger,
  useRenderPerformance
} from './hooks'

export type {
  UseExpandableCollectionOptions,
  UseExpandableCollectionReturn,
  UseComponentLoggerOptions,
  UseComponentLoggerReturn
} from './hooks'

// ============================================================================
// Types
// ============================================================================

export type {
  Theme,
  Status,
  DiffType,
  DiffSegment,
  StreamChunk,
  BadgeItem,
  ExportFormat,
  ExportOption,
  ComponentLogContext,
  UserInteraction,
  PerformanceMetrics
} from './types'

// ============================================================================
// Re-exports from existing libraries
// ============================================================================

// Diff engine
export {
  computeDiff,
  getSimilarityScore,
  highlightDifferences,
  mergeSegments
} from './lib/diff-engine'
export type { DiffGranularity } from './lib/diff-engine'

// Time utilities
export {
  formatTimeAgo,
  formatDuration,
  estimateRemainingTime,
  formatTimestamp
} from './lib/time-utils'

// CN utility
export { cn } from './lib/cn'

// Component logger
export { createComponentLogger } from './lib/componentLogger'
export type { ClientLogger } from './lib/componentLogger'

// ============================================================================
// Library Metadata
// ============================================================================

export const ARTIFICER_UI_VERSION = '1.0.0'
export const ARTIFICER_UI_NAME = '@artificer/ui'
