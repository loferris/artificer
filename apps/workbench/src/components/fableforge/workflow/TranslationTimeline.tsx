import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { formatTimeAgo, formatDuration } from '@/lib/time-utils'
import { formatLanguagePair } from '@/lib/language-utils'
import { formatCost } from '@/lib/cost-utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { createComponentLogger } from '@/lib/componentLogger'

const logger = createComponentLogger('TranslationTimeline')

export type TimelineJobStatus = 'completed' | 'running' | 'failed' | 'cancelled' | 'pending'

export interface TimelineJob {
  id: string
  title: string
  sourceLang: string
  targetLang: string
  status: TimelineJobStatus
  createdAt: Date | string
  completedAt?: Date | string
  duration?: number // milliseconds
  cost?: number
  quality?: number // 0-1
  wordCount?: number
  specialist?: string
  error?: string
}

export interface TranslationTimelineProps {
  jobs: TimelineJob[]
  onJobClick?: (jobId: string) => void
  maxItems?: number
  showFilters?: boolean
  className?: string
  layout?: 'timeline' | 'list'
}

interface FilterState {
  status: TimelineJobStatus | 'all'
  dateRange: 'today' | 'week' | 'month' | 'all'
}

/**
 * Display translation job history timeline
 *
 * Features:
 * - Chronological job history
 * - Status filtering
 * - Quick job stats
 * - Visual timeline view
 * - Expandable job details
 */
export function TranslationTimeline({
  jobs,
  onJobClick,
  maxItems,
  showFilters = false,
  className,
  layout = 'timeline'
}: TranslationTimelineProps) {
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    dateRange: 'all'
  })
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set())

  useEffect(() => {
    logger.lifecycle('TranslationTimeline', 'mount', {
      jobsCount: jobs.length,
      showFilters,
      layout
    })

    logger.info('Timeline loaded', {
      component: 'TranslationTimeline'
    }, {
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length
    })

    return () => {
      logger.lifecycle('TranslationTimeline', 'unmount')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount/unmount for lifecycle logging

  const handleJobClick = (jobId: string) => {
    logger.interaction({
      component: 'TranslationTimeline',
      action: 'job_click',
      metadata: { jobId }
    })
    onJobClick?.(jobId)
  }

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobs(prev => {
      const next = new Set(prev)
      if (next.has(jobId)) {
        next.delete(jobId)
        logger.interaction({
          component: 'TranslationTimeline',
          action: 'collapse_job',
          metadata: { jobId }
        })
      } else {
        next.add(jobId)
        logger.interaction({
          component: 'TranslationTimeline',
          action: 'expand_job',
          metadata: { jobId }
        })
      }
      return next
    })
  }

  const handleFilterChange = (type: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [type]: value }))
    logger.interaction({
      component: 'TranslationTimeline',
      action: 'filter_change',
      metadata: { filterType: type, value }
    })
  }

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    if (filters.status !== 'all' && job.status !== filters.status) {
      return false
    }

    if (filters.dateRange !== 'all') {
      const jobDate = new Date(job.createdAt)
      const now = new Date()
      const diffDays = (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24)

      switch (filters.dateRange) {
        case 'today':
          if (diffDays > 1) return false
          break
        case 'week':
          if (diffDays > 7) return false
          break
        case 'month':
          if (diffDays > 30) return false
          break
      }
    }

    return true
  })

  // Limit items if specified
  const displayJobs = maxItems ? filteredJobs.slice(0, maxItems) : filteredJobs

  if (jobs.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-gray-500">
          No translation jobs yet
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Status:</span>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="all">All</option>
                  <option value="completed">Completed</option>
                  <option value="running">Running</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Date:</span>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
              <div className="text-sm text-gray-600 ml-auto">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <div className="space-y-3">
        {displayJobs.map((job, index) => {
          const isExpanded = expandedJobs.has(job.id)
          const isClickable = !!onJobClick

          return (
            <Card
              key={job.id}
              className={cn(
                "transition-all",
                isClickable && "cursor-pointer hover:shadow-md"
              )}
              onClick={() => isClickable && handleJobClick(job.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  {/* Timeline Indicator */}
                  {layout === 'timeline' && (
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full border-2 flex-shrink-0",
                          job.status === 'completed' && "bg-green-500 border-green-600",
                          job.status === 'running' && "bg-blue-500 border-blue-600 animate-pulse",
                          job.status === 'failed' && "bg-red-500 border-red-600",
                          job.status === 'cancelled' && "bg-gray-400 border-gray-500",
                          job.status === 'pending' && "bg-yellow-500 border-yellow-600"
                        )}
                      />
                      {index < displayJobs.length - 1 && (
                        <div className="w-px h-full bg-gray-200 mt-2" />
                      )}
                    </div>
                  )}

                  {/* Job Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{job.title}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-600">
                            {formatLanguagePair(job.sourceLang, job.targetLang)}
                          </span>
                          {job.wordCount && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-600">
                                {job.wordCount.toLocaleString()} words
                              </span>
                            </>
                          )}
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-600">
                            {formatTimeAgo(new Date(job.createdAt))}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={job.status} size="sm" />
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {job.duration && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-gray-600">
                            {formatDuration(job.duration)}
                          </span>
                        </div>
                      )}
                      {job.cost !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-gray-600">
                            {formatCost(job.cost)}
                          </span>
                        </div>
                      )}
                      {job.quality !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-gray-600">
                            {Math.round(job.quality * 100)}% quality
                          </span>
                        </div>
                      )}
                      {job.specialist && (
                        <Badge variant="blue" size="sm">
                          {job.specialist}
                        </Badge>
                      )}
                    </div>

                    {/* Error Message */}
                    {job.status === 'failed' && job.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        {job.error}
                      </div>
                    )}

                    {/* Expandable Details */}
                    {(job.completedAt || isExpanded) && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleJobExpansion(job.id)
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {isExpanded ? 'Hide details' : 'Show details'}
                        </button>
                        {isExpanded && job.completedAt && (
                          <div className="mt-2 text-xs text-gray-600 space-y-1">
                            <div>Started: {new Date(job.createdAt).toLocaleString()}</div>
                            <div>Completed: {new Date(job.completedAt).toLocaleString()}</div>
                            {job.duration && (
                              <div>Duration: {formatDuration(job.duration)}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Show More */}
      {maxItems && filteredJobs.length > maxItems && (
        <Card className="border-dashed">
          <CardContent className="py-4 text-center">
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show {filteredJobs.length - maxItems} more jobs
            </button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {displayJobs.length === 0 && filteredJobs.length === 0 && jobs.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No jobs match the selected filters
          </CardContent>
        </Card>
      )}
    </div>
  )
}
