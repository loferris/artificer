import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { cn } from '@/lib/cn'
import {
  type ValidationResult,
  type Severity,
  getSeverityTheme,
  groupBySeverity,
  groupByValidator,
  groupByEntity,
  formatValidationSummary
} from '@/lib/validation-utils'
import { createComponentLogger } from '@/lib/componentLogger'

const logger = createComponentLogger('ValidationPanel')

export interface ValidationPanelProps {
  results: ValidationResult[]
  severity?: 'all' | Severity
  groupBy?: 'severity' | 'validator' | 'entity'
  collapsible?: boolean
  onSuggestionAccept?: (suggestion: string, resultId: string) => void
  onAutoFix?: (resultId: string) => void
  showFixButtons?: boolean
  className?: string
}

/**
 * Display validation results with errors, warnings, and suggestions
 *
 * Features:
 * - Group by severity, validator, or entity
 * - Expandable suggestions
 * - One-click auto-fixes
 * - Filter by severity
 * - Color-coded by severity
 * - Collapsible sections
 */
export function ValidationPanel({
  results,
  severity = 'all',
  groupBy = 'severity',
  collapsible = true,
  onSuggestionAccept,
  onAutoFix,
  showFixButtons = true,
  className
}: ValidationPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())

  useEffect(() => {
    logger.lifecycle('ValidationPanel', 'mount', {
      resultsCount: results.length,
      groupBy,
      severity
    })

    logger.info('Validation results loaded', {
      component: 'ValidationPanel'
    }, {
      totalResults: results.length,
      hasErrors: results.some(r => r.severity === 'error'),
      hasWarnings: results.some(r => r.severity === 'warning')
    })

    return () => {
      logger.lifecycle('ValidationPanel', 'unmount')
    }
  }, [])

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  const toggleResult = (resultId: string) => {
    setExpandedResults(prev => {
      const next = new Set(prev)
      if (next.has(resultId)) {
        next.delete(resultId)
      } else {
        next.add(resultId)
      }
      return next
    })
  }

  const handleAutoFix = (resultId: string) => {
    logger.interaction({
      component: 'ValidationPanel',
      action: 'auto_fix',
      metadata: { resultId }
    })
    onAutoFix?.(resultId)
  }

  const handleSuggestionAccept = (suggestion: string, resultId: string) => {
    logger.interaction({
      component: 'ValidationPanel',
      action: 'accept_suggestion',
      metadata: { resultId }
    })
    onSuggestionAccept?.(suggestion, resultId)
  }

  // Filter by severity if specified
  const filteredResults = severity === 'all'
    ? results
    : results.filter(r => r.severity === severity)

  if (filteredResults.length === 0) {
    return (
      <Card className={cn("border-green-200 bg-green-50", className)}>
        <CardContent className="py-6 text-center">
          <div className="text-2xl mb-2">✓</div>
          <div className="text-sm font-medium text-green-900">
            No validation issues
          </div>
          <div className="text-xs text-green-700 mt-1">
            All operations are valid
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group results
  let groupedResults: Record<string, ValidationResult[]> = {}

  if (groupBy === 'severity') {
    groupedResults = groupBySeverity(filteredResults) as Record<string, ValidationResult[]>
  } else if (groupBy === 'validator') {
    groupedResults = groupByValidator(filteredResults)
  } else if (groupBy === 'entity') {
    groupedResults = groupByEntity(filteredResults)
  }

  const renderResult = (result: ValidationResult) => {
    const theme = getSeverityTheme(result.severity)
    const isExpanded = expandedResults.has(result.id)

    return (
      <div
        key={result.id}
        className={cn(
          "p-3 rounded-lg border-l-4 bg-white",
          `border-l-${theme.color}-500`
        )}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg flex-shrink-0">{theme.icon}</span>

          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-900 mb-1">
              {result.message}
            </div>

            {result.entityName && (
              <div className="text-xs text-gray-600 mb-2">
                Entity: <span className="font-medium">{result.entityName}</span>
              </div>
            )}

            {result.suggestion && (
              <button
                onClick={() => toggleResult(result.id)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium mb-2"
              >
                {isExpanded ? 'Hide suggestion' : '💡 View suggestion'}
              </button>
            )}

            {isExpanded && result.suggestion && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                {result.suggestion}
              </div>
            )}

            {showFixButtons && result.autoFix && (
              <div className="mt-2">
                <Button
                  onClick={() => handleAutoFix(result.id)}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                >
                  Apply Fix
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Validation Results</h3>
            <Badge variant="gray" size="sm">
              {formatValidationSummary(filteredResults)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {Object.entries(groupedResults).map(([groupKey, groupResults]) => {
          if (groupResults.length === 0) return null

          const isExpanded = expandedGroups.has(groupKey) || !collapsible
          let groupTheme = getSeverityTheme('info')

          if (groupBy === 'severity') {
            groupTheme = getSeverityTheme(groupKey as Severity)
          }

          return (
            <div key={groupKey}>
              <button
                onClick={() => collapsible && toggleGroup(groupKey)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg transition-colors",
                  groupTheme.bgColor,
                  groupTheme.borderColor,
                  "border",
                  collapsible && "hover:opacity-80"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{groupTheme.icon}</span>
                  <span className={cn("font-medium", groupTheme.textColor)}>
                    {groupBy === 'severity' ? groupTheme.label : groupKey}
                  </span>
                  <Badge variant="gray" size="sm">
                    {groupResults.length}
                  </Badge>
                </div>
                {collapsible && (
                  <svg
                    className={cn(
                      "w-4 h-4 transition-transform",
                      groupTheme.textColor,
                      isExpanded && "rotate-180"
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </button>

              {isExpanded && (
                <div className="mt-2 space-y-2">
                  {groupResults.map(renderResult)}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
