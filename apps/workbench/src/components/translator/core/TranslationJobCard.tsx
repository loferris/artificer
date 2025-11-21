import React from 'react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { StatusBadge, type Status } from '@artificer/ui'
import { BadgeGroup } from '@artificer/ui'
import { Progress } from '@/components/ui/progress'
import { formatLanguagePair } from '@/lib/language-utils'
import { formatTimeAgo, formatTimestamp } from '@artificer/ui'
import { formatCost } from '@/lib/cost-utils'
import { cn } from '@artificer/ui'

export interface TranslationJob {
  id: string
  sourceLanguage: string
  targetLanguage: string
  status: Status
  preview: string
  createdAt: Date
  progress: number
  candidatesCount?: number
  estimatedCost?: number
  actualCost?: number
}

export interface TranslationJobCardProps {
  job: TranslationJob
  onClick?: () => void
  className?: string
  showPreview?: boolean
}

/**
 * Quick overview card for a translation job in a list
 * ⭐⭐⭐ Must-Have Component
 *
 * Features:
 * - Source/target language flags
 * - Status badge with animation
 * - Text preview (truncated)
 * - Progress indicator
 * - Candidate count
 * - Timestamp
 * - Cost estimate/actual
 * - Click handler for navigation
 */
export function TranslationJobCard({
  job,
  onClick,
  className,
  showPreview = true
}: TranslationJobCardProps) {
  const progressVariant =
    job.status === 'completed' ? 'success' :
    job.status === 'failed' ? 'error' :
    job.status === 'running' ? 'blue' :
    'default'

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Language pair */}
          <div className="flex-1">
            <div className="text-sm font-medium mb-1">
              {formatLanguagePair(job.sourceLanguage, job.targetLanguage, 'full')}
            </div>
            <div className="text-xs text-gray-500">
              {formatTimeAgo(job.createdAt)}
            </div>
          </div>

          {/* Status */}
          <StatusBadge
            status={job.status}
            animated={job.status === 'running'}
          />
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Preview */}
        {showPreview && (
          <div className="text-sm text-gray-700 mb-3 line-clamp-2">
            {job.preview}
          </div>
        )}

        {/* Progress bar for running jobs */}
        {job.status === 'running' && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{Math.round(job.progress)}%</span>
            </div>
            <Progress
              value={job.progress}
              variant={progressVariant}
              animated
              size="sm"
            />
          </div>
        )}

        {/* Metadata badges */}
        <BadgeGroup
          items={[
            job.candidatesCount && {
              label: `${job.candidatesCount} candidates`,
              variant: 'blue',
              icon: '👥'
            },
            job.estimatedCost && !job.actualCost && {
              label: `~${formatCost(job.estimatedCost)}`,
              variant: 'gray',
              icon: '💰'
            },
            job.actualCost && {
              label: formatCost(job.actualCost),
              variant: 'green',
              icon: '💰'
            },
          ].filter(Boolean) as any}
        />
      </CardContent>

      <CardFooter className="border-t pt-3">
        <div className="flex items-center justify-between w-full text-xs text-gray-500">
          <span>ID: {job.id.slice(0, 8)}</span>
          <span>{formatTimestamp(job.createdAt, false)}</span>
        </div>
      </CardFooter>
    </Card>
  )
}
