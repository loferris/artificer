import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

export type Status = 'pending' | 'running' | 'completed' | 'failed' | 'retry' | 'idle'

export interface StatusBadgeProps {
  status: Status
  animated?: boolean
  className?: string
}

interface StatusConfig {
  label: string
  variant: 'gray' | 'blue' | 'green' | 'red' | 'orange'
  icon: string
}

const statusConfig: Record<Status, StatusConfig> = {
  pending: {
    label: 'Pending',
    variant: 'gray',
    icon: '⏹'
  },
  running: {
    label: 'Running',
    variant: 'blue',
    icon: '⏳'
  },
  completed: {
    label: 'Completed',
    variant: 'green',
    icon: '✓'
  },
  failed: {
    label: 'Failed',
    variant: 'red',
    icon: '✗'
  },
  retry: {
    label: 'Retrying',
    variant: 'orange',
    icon: '🔄'
  },
  idle: {
    label: 'Idle',
    variant: 'gray',
    icon: '○'
  }
}

/**
 * Badge component for displaying status with icon
 * Used in: PipelineProgress, TranslationJobCard, and other status-displaying components
 */
export function StatusBadge({ status, animated = false, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      className={cn(
        animated && status === 'running' && 'animate-pulse',
        className
      )}
    >
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  )
}
