import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { CopyButton } from '@/components/shared/CopyButton'
import { cn } from '@/lib/cn'
import { createComponentLogger } from '@/lib/componentLogger'

const logger = createComponentLogger('SourceAttribution')

export interface Source {
  id: string
  title: string
  content: string
  url?: string
  score?: number
  matchedText?: string
}

export interface SourceAttributionProps {
  sources: Source[]
  format?: 'inline' | 'sidebar' | 'popover'
  highlightMatches?: boolean
  onSourceClick?: (source: Source) => void
  showScores?: boolean
  className?: string
  maxVisible?: number
}

/**
 * Display RAG source attributions with document references
 *
 * Features:
 * - Multiple display formats (inline, sidebar, popover)
 * - Source confidence scores
 * - Matched text highlighting
 * - Expandable source content
 * - Click to view full source
 * - Copy source content
 */
export function SourceAttribution({
  sources,
  format = 'inline',
  highlightMatches = true,
  onSourceClick,
  showScores = true,
  className,
  maxVisible = 5
}: SourceAttributionProps) {
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    logger.lifecycle('SourceAttribution', 'mount', {
      sourcesCount: sources.length,
      format
    })

    return () => {
      logger.lifecycle('SourceAttribution', 'unmount')
    }
  }, [])

  const toggleSource = (sourceId: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(sourceId)) {
        next.delete(sourceId)
        logger.interaction({
          component: 'SourceAttribution',
          action: 'collapse_source',
          metadata: { sourceId }
        })
      } else {
        next.add(sourceId)
        logger.interaction({
          component: 'SourceAttribution',
          action: 'expand_source',
          metadata: { sourceId }
        })
      }
      return next
    })
  }

  const handleSourceClick = (source: Source) => {
    logger.interaction({
      component: 'SourceAttribution',
      action: 'source_click',
      metadata: { sourceId: source.id, title: source.title }
    })
    onSourceClick?.(source)
  }

  if (sources.length === 0) {
    return null
  }

  const visibleSources = showAll ? sources : sources.slice(0, maxVisible)
  const hasMore = sources.length > maxVisible

  const getScoreColor = (score?: number) => {
    if (!score) return 'gray'
    if (score >= 0.8) return 'green'
    if (score >= 0.6) return 'blue'
    if (score >= 0.4) return 'yellow'
    return 'gray'
  }

  const getScoreLabel = (score?: number) => {
    if (!score) return 'N/A'
    return `${Math.round(score * 100)}%`
  }

  if (format === 'inline') {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            📚 Sources ({sources.length})
          </span>
        </div>

        <div className="space-y-2">
          {visibleSources.map((source) => {
            const isExpanded = expandedSources.has(source.id)

            return (
              <Card key={source.id} className="border-blue-100 bg-blue-50/30">
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => toggleSource(source.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-blue-900">
                          {source.title}
                        </span>
                        {showScores && source.score !== undefined && (
                          <Badge
                            variant={getScoreColor(source.score) as any}
                            size="sm"
                          >
                            {getScoreLabel(source.score)}
                          </Badge>
                        )}
                      </div>

                      {highlightMatches && source.matchedText && !isExpanded && (
                        <div className="text-xs text-gray-600 line-clamp-2">
                          "{source.matchedText}"
                        </div>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <CopyButton text={source.content} size="sm" />
                      {source.url && (
                        <button
                          onClick={() => handleSourceClick(source)}
                          className="p-1.5 hover:bg-blue-100 rounded text-blue-600 text-xs"
                          title="View source"
                        >
                          🔗
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <div className="text-xs text-gray-700 whitespace-pre-wrap">
                        {source.content}
                      </div>
                      {source.url && (
                        <div className="mt-2 text-xs text-blue-600 truncate">
                          {source.url}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Show {sources.length - maxVisible} more sources
          </button>
        )}
      </div>
    )
  }

  if (format === 'sidebar') {
    return (
      <div className={cn("w-64 space-y-3", className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Sources</h3>
          <Badge variant="gray" size="sm">{sources.length}</Badge>
        </div>

        <div className="space-y-2">
          {sources.map((source) => (
            <button
              key={source.id}
              onClick={() => handleSourceClick(source)}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="text-sm font-medium text-gray-900 mb-1">
                {source.title}
              </div>
              {showScores && source.score !== undefined && (
                <Badge variant={getScoreColor(source.score) as any} size="sm">
                  {getScoreLabel(source.score)}
                </Badge>
              )}
              {source.matchedText && (
                <div className="text-xs text-gray-600 mt-2 line-clamp-2">
                  "{source.matchedText}"
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Popover format - just show count, details on hover/click
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <button className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors text-xs font-medium text-blue-700">
        <span>📚</span>
        <span>{sources.length} {sources.length === 1 ? 'source' : 'sources'}</span>
      </button>
    </div>
  )
}
