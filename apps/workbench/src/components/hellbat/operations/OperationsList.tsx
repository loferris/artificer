import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BadgeGroup } from '@/components/shared/BadgeGroup'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/cn'
import {
  type Operation,
  getOperationTheme,
  formatOperation,
  groupByIntent,
  groupByEntity,
  groupBySession
} from '@/lib/operation-utils'
import { formatTimeAgo } from '@/lib/time-utils'
import { getSeverityTheme } from '@/lib/validation-utils'
import { createComponentLogger } from '@/lib/componentLogger'

const logger = createComponentLogger('OperationsList')

export interface OperationsListProps {
  operations: Operation[]
  format?: 'timeline' | 'list' | 'grouped'
  groupBy?: 'entity' | 'intent' | 'session'
  onOperationClick?: (operation: Operation) => void
  showValidation?: boolean
  editable?: boolean
  className?: string
  maxItems?: number
}

/**
 * Display a list or timeline of worldbuilding operations
 *
 * Features:
 * - Timeline or list view
 * - Group by entity, intent, or session
 * - Validation indicators
 * - Expandable details
 * - Icons for operation types
 * - Entity highlighting
 */
export function OperationsList({
  operations,
  format = 'timeline',
  groupBy,
  onOperationClick,
  showValidation = true,
  editable = false,
  className,
  maxItems
}: OperationsListProps) {
  const [expandedOps, setExpandedOps] = useState<Set<string>>(new Set())

  useEffect(() => {
    logger.lifecycle('OperationsList', 'mount', {
      operationsCount: operations.length,
      format,
      groupBy
    })

    return () => {
      logger.lifecycle('OperationsList', 'unmount')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount/unmount for lifecycle logging

  const toggleOperation = (opId: string) => {
    setExpandedOps(prev => {
      const next = new Set(prev)
      if (next.has(opId)) {
        next.delete(opId)
        logger.interaction({
          component: 'OperationsList',
          action: 'collapse_operation',
          metadata: { opId }
        })
      } else {
        next.add(opId)
        logger.interaction({
          component: 'OperationsList',
          action: 'expand_operation',
          metadata: { opId }
        })
      }
      return next
    })
  }

  const handleOperationClick = (operation: Operation) => {
    logger.interaction({
      component: 'OperationsList',
      action: 'operation_click',
      metadata: {
        opId: operation.id,
        intent: operation.intent
      }
    })
    onOperationClick?.(operation)
  }

  if (operations.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-gray-500">
          No operations yet
        </CardContent>
      </Card>
    )
  }

  const displayOps = maxItems ? operations.slice(0, maxItems) : operations

  const renderOperation = (operation: Operation, index: number) => {
    const theme = getOperationTheme(operation.intent)
    const isExpanded = expandedOps.has(operation.id)
    const hasValidation = showValidation && operation.validation && operation.validation.length > 0
    const hasErrors = hasValidation && operation.validation!.some(v => v.severity === 'error')
    const hasWarnings = hasValidation && operation.validation!.some(v => v.severity === 'warning')

    return (
      <div key={operation.id} className="flex gap-4">
        {/* Timeline indicator */}
        {format === 'timeline' && (
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2",
                theme.bgColor,
                theme.borderColor
              )}
            >
              <span className="text-sm">{theme.icon}</span>
            </div>
            {index < displayOps.length - 1 && (
              <div className="w-px h-full bg-gray-200 mt-2" />
            )}
          </div>
        )}

        {/* Operation content */}
        <div className="flex-1 pb-6">
          <Card
            className={cn(
              "cursor-pointer hover:shadow-md transition-all",
              hasErrors && "border-red-300",
              hasWarnings && !hasErrors && "border-yellow-300"
            )}
            onClick={() => handleOperationClick(operation)}
          >
            <CardContent className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {format !== 'timeline' && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{theme.icon}</span>
                      <Badge variant={theme.color as any} size="sm">
                        {theme.label}
                      </Badge>
                    </div>
                  )}

                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {formatOperation(operation)}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>{formatTimeAgo(operation.timestamp)}</span>
                    {operation.entityType && (
                      <>
                        <span>•</span>
                        <Badge variant="gray" size="sm">
                          {operation.entityType}
                        </Badge>
                      </>
                    )}
                  </div>

                  {/* Attributes */}
                  {operation.attributes && Object.keys(operation.attributes).length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleOperation(operation.id)
                      }}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {isExpanded ? 'Hide details' : 'Show details'}
                    </button>
                  )}

                  {isExpanded && operation.attributes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
                      {Object.entries(operation.attributes).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="font-medium text-gray-700">{key}:</span>
                          <span className="text-gray-600">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Validation indicator */}
                {hasValidation && (
                  <div className="flex items-center gap-1">
                    {hasErrors && (
                      <Badge variant="red" size="sm">
                        {operation.validation!.filter(v => v.severity === 'error').length} errors
                      </Badge>
                    )}
                    {hasWarnings && (
                      <Badge variant="yellow" size="sm">
                        {operation.validation!.filter(v => v.severity === 'warning').length} warnings
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Validation details */}
              {hasValidation && isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  {operation.validation!.map((validation) => {
                    const vTheme = getSeverityTheme(validation.severity)
                    return (
                      <div
                        key={validation.id}
                        className={cn(
                          "p-2 rounded text-xs",
                          vTheme.bgColor,
                          vTheme.textColor
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span>{vTheme.icon}</span>
                          <span>{validation.message}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Grouped view
  if (groupBy) {
    let grouped: Record<string, Operation[]> = {}

    if (groupBy === 'entity') {
      grouped = groupByEntity(operations)
    } else if (groupBy === 'intent') {
      grouped = groupByIntent(operations)
    } else if (groupBy === 'session') {
      grouped = groupBySession(operations)
    }

    return (
      <div className={cn("space-y-4", className)}>
        {Object.entries(grouped).map(([groupKey, groupOps]) => (
          <Card key={groupKey}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{groupKey}</h3>
                <Badge variant="gray" size="sm">
                  {groupOps.length} {groupOps.length === 1 ? 'operation' : 'operations'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {groupOps.map((op, idx) => renderOperation(op, idx))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // List/Timeline view
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Operations</h3>
          <Badge variant="gray" size="sm">
            {operations.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn(format === 'timeline' && "space-y-0")}>
          {displayOps.map((op, idx) => renderOperation(op, idx))}
        </div>

        {maxItems && operations.length > maxItems && (
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show {operations.length - maxItems} more operations
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
