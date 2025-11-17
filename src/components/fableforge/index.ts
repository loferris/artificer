/**
 * FableForge Component Library
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

// Re-export shared components for convenience
export { CopyButton } from '../shared/CopyButton'
export { StatusBadge } from '../shared/StatusBadge'
export { BadgeGroup } from '../shared/BadgeGroup'
export { ExpandableSection } from '../shared/ExpandableSection'

// Re-export UI components
export { Badge } from '../ui/badge'
export { Button } from '../ui/button'
export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '../ui/card'
export { Progress } from '../ui/progress'

// Re-export utilities
export { getSpecialistTheme, getAllSpecialistTypes, isSpecialistType } from '@/lib/specialist-theme'
export type { SpecialistType, SpecialistTheme } from '@/lib/specialist-theme'

export { formatCost, calculateTotal, compareCosts } from '@/lib/cost-utils'
export { formatTimeAgo, formatDuration, formatTimestamp } from '@/lib/time-utils'
export { formatLanguagePair, getLanguageFlag, getLanguageName } from '@/lib/language-utils'
export { computeDiff, getSimilarityScore, highlightDifferences } from '@/lib/diff-engine'

// Re-export hooks
export { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
export { useExpandable, useMultiExpandable } from '@/hooks/useExpandable'
