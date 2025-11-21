import React, { useEffect, useRef } from 'react'
import { Progress } from '@/components/ui/progress'
import { StatusBadge, type Status } from '@artificer/ui'
import { formatDuration } from '@artificer/ui'
import { cn } from '@artificer/ui'
import { createComponentLogger } from '@artificer/ui'

const logger = createComponentLogger('PipelineProgress')

export interface PipelineStage {
  id: string
  label: string
  status: Status
}

export interface PipelineProgressProps {
  stages: PipelineStage[]
  currentStage?: string
  progress: number
  estimatedTimeRemaining?: number
  className?: string
  showStageLabels?: boolean
}

/**
 * Real-time visualization of pipeline stages
 * ⭐⭐⭐ Must-Have Component
 *
 * Features:
 * - Multi-stage progress visualization
 * - Status indicators with animations
 * - Time estimates
 * - Error states
 * - Responsive layout
 */
export function PipelineProgress({
  stages,
  currentStage,
  progress,
  estimatedTimeRemaining,
  className,
  showStageLabels = true
}: PipelineProgressProps) {
  const initialPropsRef = useRef({
    stagesCount: stages.length,
    currentStage,
    progress,
    estimatedTimeRemaining
  })
  useEffect(() => {
    const { stagesCount, currentStage: initialStage, progress: initialProgress, estimatedTimeRemaining: initialEta } = initialPropsRef.current
    logger.lifecycle('PipelineProgress', 'mount', {
      stagesCount,
      currentStage: initialStage,
      progress: initialProgress
    })

    logger.info('Pipeline progress update', {
      component: 'PipelineProgress',
      action: 'progress_update'
    }, {
      progress: `${Math.round(initialProgress)}%`,
      currentStage: initialStage,
      estimatedTimeRemaining: initialEta
    })

    return () => {
      logger.lifecycle('PipelineProgress', 'unmount')
    }
  }, []) // Only run on mount/unmount for lifecycle logging

  useEffect(() => {
    logger.debug('Pipeline stage changed', {
      component: 'PipelineProgress',
      action: 'stage_change'
    }, {
      currentStage,
      progress
    })
  }, [currentStage, progress])

  return (
    <div className={cn("bg-white border border-gray-200 rounded-2xl shadow-sm p-6", className)}>
      {/* Stage indicators */}
      <div className="flex items-center justify-between mb-6">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.id}>
            <div className="flex flex-col items-center gap-2 min-w-0">
              <StatusBadge
                status={stage.status}
                animated={stage.id === currentStage}
              />
              {showStageLabels && (
                <span className={cn(
                  "text-xs text-center",
                  stage.id === currentStage ? "text-gray-900 font-medium" : "text-gray-600"
                )}>
                  {stage.label}
                </span>
              )}
            </div>

            {/* Connector line between stages */}
            {index < stages.length - 1 && (
              <div className="flex-1 mx-2">
                <div className={cn(
                  "h-px transition-colors",
                  stage.status === 'completed' ? "bg-green-300" : "bg-gray-200"
                )} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-700 font-medium">Overall Progress</span>
          <span className="text-gray-600">{Math.round(progress)}%</span>
        </div>
        <Progress
          value={progress}
          variant="blue"
          animated={progress > 0 && progress < 100}
        />
      </div>

      {/* Time estimate */}
      {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
        <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Estimated time remaining: {formatDuration(estimatedTimeRemaining)}</span>
        </div>
      )}
    </div>
  )
}
