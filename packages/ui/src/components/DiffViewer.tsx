/**
 * Artificer UI - Diff Viewer Component
 *
 * Generic component for displaying diffs between two items
 * Supports side-by-side and unified views with theme support
 */

import React, { useState, useMemo, ReactNode } from 'react'
import { Card, CardHeader, CardContent } from '../shadcn/card'
import { Button } from '../shadcn/button'
import { Badge } from '../shadcn/badge'
import { CopyButton } from '../shadcn/CopyButton'
import { cn } from '../lib/cn'
import { computeDiff, getSimilarityScore, type DiffGranularity } from '../lib/diff-engine'
import type { Theme } from '../types'
import { createComponentLogger } from '../lib/componentLogger'

const logger = createComponentLogger('DiffViewer')

export interface DiffViewerProps<T = unknown> {
  /**
   * Data for the "before" state
   */
  before: T

  /**
   * Data for the "after" state
   */
  after: T

  /**
   * Function to extract text from before data
   */
  getBeforeText: (data: T) => string

  /**
   * Function to extract text from after data
   */
  getAfterText: (data: T) => string

  /**
   * Label for before section
   */
  beforeLabel?: string

  /**
   * Label for after section
   */
  afterLabel?: string

  /**
   * Theme for before section
   */
  beforeTheme?: Theme

  /**
   * Theme for after section
   */
  afterTheme?: Theme

  /**
   * Initial view mode
   */
  mode?: 'side-by-side' | 'unified'

  /**
   * Initial diff granularity
   */
  granularity?: DiffGranularity

  /**
   * Whether to show mode/granularity controls
   */
  showControls?: boolean

  /**
   * Whether to show similarity score
   */
  showSimilarity?: boolean

  /**
   * Whether to show copy buttons
   */
  showCopyButtons?: boolean

  /**
   * Optional custom metadata renderer for before section
   */
  renderBeforeMetadata?: (data: T) => ReactNode

  /**
   * Optional custom metadata renderer for after section
   */
  renderAfterMetadata?: (data: T) => ReactNode

  /**
   * Additional className
   */
  className?: string
}

/**
 * Generic diff viewer component
 *
 * Displays differences between two items with side-by-side or unified view.
 * Eliminates duplicate diff UI between CandidateDiff and OperationDiff.
 *
 * @example
 * ```tsx
 * <DiffViewer
 *   before={candidateA}
 *   after={candidateB}
 *   getBeforeText={c => c.translation}
 *   getAfterText={c => c.translation}
 *   beforeTheme={specialistThemes.get(candidateA.specialist)}
 *   afterTheme={specialistThemes.get(candidateB.specialist)}
 * />
 * ```
 */
export function DiffViewer<T>({
  before,
  after,
  getBeforeText,
  getAfterText,
  beforeLabel = 'Before',
  afterLabel = 'After',
  beforeTheme,
  afterTheme,
  mode = 'side-by-side',
  granularity = 'word',
  showControls = true,
  showSimilarity = true,
  showCopyButtons = true,
  renderBeforeMetadata,
  renderAfterMetadata,
  className
}: DiffViewerProps<T>) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>(mode)
  const [diffGranularity, setDiffGranularity] = useState<DiffGranularity>(granularity)

  const beforeText = useMemo(() => getBeforeText(before), [before, getBeforeText])
  const afterText = useMemo(() => getAfterText(after), [after, getAfterText])

  const diffResult = useMemo(() => {
    return computeDiff(beforeText, afterText, diffGranularity)
  }, [beforeText, afterText, diffGranularity])

  const diffSegments = diffResult.segments
  const stats = diffResult.stats

  const similarity = useMemo(() => {
    return getSimilarityScore(beforeText, afterText)
  }, [beforeText, afterText])

  // Memoize diff rendering for both before and after views
  const beforeDiffContent = useMemo(() => {
    return diffSegments.map((seg, idx) => {
      // Skip segments not relevant to before view
      if (seg.type === 'added') return null

      let bgColor = ''
      if (seg.type === 'removed') bgColor = 'bg-red-100'
      if (seg.type === 'modified') bgColor = 'bg-yellow-100'

      return (
        <span key={idx} className={bgColor}>
          {seg.value}
        </span>
      )
    })
  }, [diffSegments])

  const afterDiffContent = useMemo(() => {
    return diffSegments.map((seg, idx) => {
      // Skip segments not relevant to after view
      if (seg.type === 'removed') return null

      let bgColor = ''
      if (seg.type === 'added') bgColor = 'bg-green-100'
      if (seg.type === 'modified') bgColor = 'bg-yellow-100'

      return (
        <span key={idx} className={bgColor}>
          {seg.value}
        </span>
      )
    })
  }, [diffSegments])

  const renderDiffText = (type: 'before' | 'after') => {
    return type === 'before' ? beforeDiffContent : afterDiffContent
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with controls */}
      {showControls && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Comparison</h3>
                {showSimilarity && (
                  <Badge
                    variant={
                      similarity >= 0.8 ? 'green' : similarity >= 0.5 ? 'yellow' : 'red'
                    }
                    size="sm"
                  >
                    {Math.round(similarity * 100)}% similar
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">View:</span>
                <div className="flex gap-1">
                  <Button
                    variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('side-by-side')}
                  >
                    Side-by-Side
                  </Button>
                  <Button
                    variant={viewMode === 'unified' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('unified')}
                  >
                    Unified
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-600">Granularity:</span>
                <div className="flex gap-1">
                  {(['word', 'sentence', 'character'] as DiffGranularity[]).map(g => (
                    <Button
                      key={g}
                      variant={diffGranularity === g ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDiffGranularity(g)}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Diff content */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Before */}
          <Card className={cn('border-l-4', beforeTheme?.borderColor)}>
            <CardHeader className={beforeTheme?.bgColor}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {beforeTheme?.icon && (
                    <span className="text-lg">{beforeTheme.icon}</span>
                  )}
                  <div>
                    <div className="font-semibold text-sm">{beforeLabel}</div>
                    {beforeTheme?.label && (
                      <div className="text-xs text-gray-600">{beforeTheme.label}</div>
                    )}
                  </div>
                </div>
                {showCopyButtons && <CopyButton text={beforeText} size="sm" />}
              </div>
            </CardHeader>
            <CardContent className="py-4">
              <div className="text-sm whitespace-pre-wrap">
                {renderDiffText('before')}
              </div>

              {renderBeforeMetadata && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {renderBeforeMetadata(before)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* After */}
          <Card className={cn('border-l-4', afterTheme?.borderColor)}>
            <CardHeader className={afterTheme?.bgColor}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {afterTheme?.icon && <span className="text-lg">{afterTheme.icon}</span>}
                  <div>
                    <div className="font-semibold text-sm">{afterLabel}</div>
                    {afterTheme?.label && (
                      <div className="text-xs text-gray-600">{afterTheme.label}</div>
                    )}
                  </div>
                </div>
                {showCopyButtons && <CopyButton text={afterText} size="sm" />}
              </div>
            </CardHeader>
            <CardContent className="py-4">
              <div className="text-sm whitespace-pre-wrap">
                {renderDiffText('after')}
              </div>

              {renderAfterMetadata && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {renderAfterMetadata(after)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Unified view */
        <Card>
          <CardContent className="py-4">
            <div className="text-sm whitespace-pre-wrap font-mono">
              {diffSegments.map((seg, idx) => {
                let className = ''
                let prefix = ' '

                if (seg.type === 'added') {
                  className = 'bg-green-100 text-green-900'
                  prefix = '+'
                } else if (seg.type === 'removed') {
                  className = 'bg-red-100 text-red-900'
                  prefix = '-'
                } else if (seg.type === 'modified') {
                  className = 'bg-yellow-100 text-yellow-900'
                  prefix = '~'
                }

                return (
                  <div key={idx} className={className}>
                    <span className="select-none text-gray-400">{prefix} </span>
                    {seg.value}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats summary */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-3">
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-medium">Changes:</span>
              <Badge variant="green" size="sm">
                {stats.additions} additions
              </Badge>
              <Badge variant="red" size="sm">
                {stats.deletions} deletions
              </Badge>
              {stats.modifications > 0 && (
                <Badge variant="yellow" size="sm">
                  {stats.modifications} modified
                </Badge>
              )}
              <Badge variant="gray" size="sm">
                {stats.unchanged} unchanged
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
