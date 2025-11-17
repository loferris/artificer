import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { computeDiff, type DiffGranularity, type DiffSegment } from '@/lib/diff-engine'
import { getSpecialistTheme, type SpecialistType } from '@/lib/specialist-theme'
import { CopyButton } from '@/components/shared/CopyButton'
import { cn } from '@/lib/cn'
import { createComponentLogger } from '@/lib/componentLogger'

const logger = createComponentLogger('CandidateDiff')

export interface CandidateDiffProps {
  candidateA: {
    id: string
    specialist: SpecialistType
    translation: string
  }
  candidateB: {
    id: string
    specialist: SpecialistType
    translation: string
  }
  highlightLevel?: DiffGranularity
  mode?: 'side-by-side' | 'unified'
  className?: string
}

/**
 * Highlight differences between two candidates
 * ⭐⭐ High Priority Component
 *
 * Features:
 * - Word/sentence/paragraph-level diff highlighting
 * - Side-by-side or unified view
 * - Color coding (additions, deletions, changes)
 * - Toggle between candidates quickly
 * - Copy either version
 */
export function CandidateDiff({
  candidateA,
  candidateB,
  highlightLevel = 'word',
  mode = 'side-by-side',
  className
}: CandidateDiffProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>(mode)
  const [granularity, setGranularity] = useState<DiffGranularity>(highlightLevel)
  const [diffResult, setDiffResult] = useState<ReturnType<typeof computeDiff> | null>(null)

  const themeA = getSpecialistTheme(candidateA.specialist)
  const themeB = getSpecialistTheme(candidateB.specialist)

  useEffect(() => {
    logger.lifecycle('CandidateDiff', 'mount', {
      candidateA: candidateA.specialist,
      candidateB: candidateB.specialist,
      granularity
    })

    const result = computeDiff(candidateA.translation, candidateB.translation, granularity)
    setDiffResult(result)

    logger.info('Diff computed', {
      component: 'CandidateDiff',
      action: 'compute_diff'
    }, {
      additions: result.stats.additions,
      deletions: result.stats.deletions,
      unchanged: result.stats.unchanged
    })

    return () => {
      logger.lifecycle('CandidateDiff', 'unmount')
    }
  }, [candidateA.translation, candidateB.translation, granularity])

  const handleGranularityChange = (newGranularity: DiffGranularity) => {
    logger.interaction({
      component: 'CandidateDiff',
      action: 'change_granularity',
      metadata: { from: granularity, to: newGranularity }
    })
    setGranularity(newGranularity)
  }

  const handleViewModeToggle = () => {
    const newMode = viewMode === 'side-by-side' ? 'unified' : 'side-by-side'
    logger.interaction({
      component: 'CandidateDiff',
      action: 'toggle_view_mode',
      metadata: { mode: newMode }
    })
    setViewMode(newMode)
  }

  const renderSegment = (segment: DiffSegment) => {
    const classes = {
      added: 'bg-green-100 text-green-800',
      removed: 'bg-red-100 text-red-800',
      unchanged: 'bg-transparent',
      modified: 'bg-yellow-100 text-yellow-800'
    }

    if (segment.type === 'unchanged') {
      return <span key={segment.index}>{segment.value} </span>
    }

    return (
      <span
        key={segment.index}
        className={cn('px-1 rounded', classes[segment.type])}
      >
        {segment.value}
      </span>
    )
  }

  if (!diffResult) {
    return <div>Computing differences...</div>
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Highlight Level:</span>
              {(['character', 'word', 'sentence', 'paragraph'] as DiffGranularity[]).map((level) => (
                <Button
                  key={level}
                  variant={granularity === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleGranularityChange(level)}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleViewModeToggle}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
              {viewMode === 'side-by-side' ? 'Unified View' : 'Side-by-Side'}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
              <span>Added: {diffResult.stats.additions}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
              <span>Removed: {diffResult.stats.deletions}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></div>
              <span>Unchanged: {diffResult.stats.unchanged}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diff Display */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Candidate A */}
          <Card>
            <CardHeader className={cn("border-b-2", themeA.borderColor, themeA.bgColor)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{themeA.icon}</span>
                  <div>
                    <h3 className="font-semibold text-sm">{themeA.label}</h3>
                    <p className="text-xs text-gray-600">Original</p>
                  </div>
                </div>
                <CopyButton text={candidateA.translation} showLabel={false} size="icon" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-sm leading-relaxed">
                {diffResult.segments
                  .filter(s => s.type === 'unchanged' || s.type === 'removed')
                  .map(renderSegment)}
              </div>
            </CardContent>
          </Card>

          {/* Candidate B */}
          <Card>
            <CardHeader className={cn("border-b-2", themeB.borderColor, themeB.bgColor)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{themeB.icon}</span>
                  <div>
                    <h3 className="font-semibold text-sm">{themeB.label}</h3>
                    <p className="text-xs text-gray-600">Comparison</p>
                  </div>
                </div>
                <CopyButton text={candidateB.translation} showLabel={false} size="icon" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-sm leading-relaxed">
                {diffResult.segments
                  .filter(s => s.type === 'unchanged' || s.type === 'added')
                  .map(renderSegment)}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">
              Unified Diff: {themeA.label} vs {themeB.label}
            </h3>
          </CardHeader>
          <CardContent>
            <div className="text-sm leading-relaxed">
              {diffResult.segments.map(renderSegment)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
