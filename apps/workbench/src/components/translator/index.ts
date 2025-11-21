/**
 * Translator Component Library
 *
 * A comprehensive set of React components for literary translation workflows
 */

// Core Components (⭐⭐⭐ Must-Have)
export { PipelineProgress } from './core/PipelineProgress'
export type { PipelineProgressProps, PipelineStage } from './core/PipelineProgress'

export { TranslationJobCard } from './core/TranslationJobCard'
export type { TranslationJobCardProps, TranslationJob } from './core/TranslationJobCard'

export { CandidateComparison } from './core/CandidateComparison'
export type { CandidateComparisonProps, Candidate } from './core/CandidateComparison'

export { SpecialistCard } from './core/SpecialistCard'
export type { SpecialistCardProps } from './core/SpecialistCard'

// Comparison Components
export { CandidateDiff } from './comparison/CandidateDiff'
export type { CandidateDiffProps } from './comparison/CandidateDiff'

// Metadata Components
export { MetadataExplorer } from './metadata/MetadataExplorer'
export type { MetadataExplorerProps } from './metadata/MetadataExplorer'

// Analytics Components
export { QualityMetrics } from './analytics/QualityMetrics'
export type { QualityMetricsProps, QualityMetricsData } from './analytics/QualityMetrics'

export { CostTracker } from './analytics/CostTracker'
export type { CostTrackerProps, CostBreakdown, BudgetInfo } from './analytics/CostTracker'

// Workflow Components
export { TranslationTimeline } from './workflow/TranslationTimeline'
export type { TranslationTimelineProps, TimelineJob, TimelineJobStatus } from './workflow/TranslationTimeline'

// Utility Components
export { ExportDialog } from './utilities/ExportDialog'
export type { ExportDialogProps, ExportFormat, ExportOptions } from './utilities/ExportDialog'

// Re-export shared components from @artificer/ui
export { CopyButton, StatusBadge, BadgeGroup, ExpandableSection, type Status } from '@artificer/ui'

// Re-export UI components
export { Badge } from '../ui/badge'
export { Button } from '../ui/button'
export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '../ui/card'
export { Progress } from '../ui/progress'
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '../ui/dialog'

// Re-export utilities
export { specialistThemes, getAllSpecialistTypes, isSpecialistType, getSpecialistTagline } from '@artificer/translator'
export type { SpecialistType } from '@artificer/translator'

export { formatCost, calculateTotal, compareCosts } from '@/lib/cost-utils'
export { formatTimeAgo, formatDuration, formatTimestamp } from '@artificer/ui'
export { formatLanguagePair, getLanguageFlag, getLanguageName } from '@/lib/language-utils'
export { computeDiff, getSimilarityScore, highlightDifferences } from '@artificer/ui'

// Re-export hooks
export { useCopyToClipboard } from '@artificer/ui'
export { useExpandable, useMultiExpandable } from '@artificer/ui'
