import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { computeDiff, getSimilarityScore, type DiffGranularity } from '@/lib/diff-engine'
import { getOperationTheme, formatOperation, type Operation } from '@/lib/operation-utils'
import { CopyButton } from '@/components/shared/CopyButton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { createComponentLogger } from '@/lib/componentLogger'

const logger = createComponentLogger('OperationDiff')

export interface OperationDiffProps {
  before: Operation
  after: Operation
  highlightLevel?: DiffGranularity
  mode?: 'side-by-side' | 'unified'
  showMetadata?: boolean
  className?: string
}

/**
 * Show diff between two versions of an operation
 *
 * Features:
 * - Side-by-side or unified diff view
 * - Word/sentence/character-level granularity
 * - Color-coded additions/deletions
 * - Metadata comparison
 * - Similarity score
 */
export function OperationDiff({
  before,
  after,
  highlightLevel = 'word',
  mode = 'side-by-side',
  showMetadata = true,
  className
}: OperationDiffProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>(mode)
  const [granularity, setGranularity] = useState<DiffGranularity>(highlightLevel)

  const beforeTheme = getOperationTheme(before.intent)
  const afterTheme = getOperationTheme(after.intent)

  const beforeText = formatOperation(before)
  const afterText = formatOperation(after)

  useEffect(() => {
    logger.lifecycle('OperationDiff', 'mount', {
      beforeIntent: before.intent,
      afterIntent: after.intent,
      viewMode,
      granularity
    })

    return () => {
      logger.lifecycle('OperationDiff', 'unmount')
    }
  }, [])

  const diffSegments = computeDiff(beforeText, afterText, granularity)
  const similarity = getSimilarityScore(beforeText, afterText)

  const renderDiffText = (segments: typeof diffSegments, type: 'before' | 'after') => {
    return segments.map((seg, idx) => {
      if (type === 'before' && seg.type === 'added') return null
      if (type === 'after' && seg.type === 'removed') return null

      let bgColor = ''
      if (seg.type === 'added') bgColor = 'bg-green-100'
      if (seg.type === 'removed') bgColor = 'bg-red-100'

      return (
        <span key={idx} className={bgColor}>
          {seg.value}
        </span>
      )
    })
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Operation Comparison</h3>
              <Badge variant={similarity >= 0.8 ? 'green' : similarity >= 0.5 ? 'yellow' : 'red'} size="sm">
                {Math.round(similarity * 100)}% similar
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm">
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
                {(['word', 'sentence', 'character'] as DiffGranularity[]).map((g) => (
                  <Button
                    key={g}
                    variant={granularity === g ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGranularity(g)}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Diff view */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Before */}
          <Card className={cn("border-l-4", beforeTheme.borderColor)}>
            <CardHeader className={beforeTheme.bgColor}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{beforeTheme.icon}</span>
                  <div>
                    <div className="font-semibold text-sm">Before</div>
                    <div className="text-xs text-gray-600">{beforeTheme.label}</div>
                  </div>
                </div>
                <CopyButton text={beforeText} size="sm" />
              </div>
            </CardHeader>
            <CardContent className="py-4">
              <div className="text-sm whitespace-pre-wrap">
                {renderDiffText(diffSegments, 'before')}
              </div>

              {showMetadata && before.attributes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-2">Attributes:</div>
                  <div className="text-xs text-gray-600 space-y-1">
                    {Object.entries(before.attributes).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* After */}
          <Card className={cn("border-l-4", afterTheme.borderColor)}>
            <CardHeader className={afterTheme.bgColor}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{afterTheme.icon}</span>
                  <div>
                    <div className="font-semibold text-sm">After</div>
                    <div className="text-xs text-gray-600">{afterTheme.label}</div>
                  </div>
                </div>
                <CopyButton text={afterText} size="sm" />
              </div>
            </CardHeader>
            <CardContent className="py-4">
              <div className="text-sm whitespace-pre-wrap">
                {renderDiffText(diffSegments, 'after')}
              </div>

              {showMetadata && after.attributes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-2">Attributes:</div>
                  <div className="text-xs text-gray-600 space-y-1">
                    {Object.entries(after.attributes).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
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

      {/* Change summary */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-medium">Changes:</span>
              <Badge variant="green" size="sm">
                {diffSegments.filter(s => s.type === 'added').length} additions
              </Badge>
              <Badge variant="red" size="sm">
                {diffSegments.filter(s => s.type === 'removed').length} deletions
              </Badge>
              <Badge variant="gray" size="sm">
                {diffSegments.filter(s => s.type === 'unchanged').length} unchanged
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
