import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GroupedList, useExpandableCollection, useComponentLogger } from '@artificer/ui'
import {
  type ValidationResult,
  type Severity,
  validationThemes,
  ValidationBadge,
  groupBySeverity,
  groupByValidator,
  groupByEntity as groupValidationsByEntity,
  formatValidationSummary
} from '@artificer/worldbuilder'

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
 * Now using Artificer UI GroupedList and useExpandableCollection
 *
 * Features:
 * - Group by severity, validator, or entity
 * - Expandable suggestions
 * - One-click auto-fixes
 * - Filter by severity
 * - Color-coded by severity
 * - Collapsible sections
 *
 * Migration: Reduced from 286 lines to ~140 lines using @artificer/ui components
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
  const { logInteraction } = useComponentLogger({
    component: 'ValidationPanel',
    metadata: {
      resultsCount: results.length,
      groupBy,
      severity
    }
  })

  const { isOpen: isGroupOpen, toggle: toggleGroup } = useExpandableCollection({
    singleOpen: false
  })

  const { isOpen: isResultOpen, toggle: toggleResult } = useExpandableCollection({
    singleOpen: false
  })

  const handleAutoFix = (resultId: string) => {
    logInteraction('auto_fix', { resultId })
    onAutoFix?.(resultId)
  }

  const handleSuggestionAccept = (suggestion: string, resultId: string) => {
    logInteraction('accept_suggestion', { resultId })
    onSuggestionAccept?.(suggestion, resultId)
  }

  // Filter by severity if specified
  const filteredResults = severity === 'all'
    ? results
    : results.filter(r => r.severity === severity)

  if (filteredResults.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
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

  // Determine grouping function
  let groupFn: (result: ValidationResult) => string
  if (groupBy === 'severity') {
    groupFn = (r) => r.severity
  } else if (groupBy === 'validator') {
    groupFn = (r) => r.validator
  } else {
    groupFn = (r) => r.entityName || r.entityId || 'No Entity'
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Validation Results</h3>
          <ValidationBadge
            severity="info"
            count={filteredResults.length}
            showIcon={false}
          />
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {formatValidationSummary(filteredResults)}
        </p>
      </CardHeader>

      <CardContent>
        <GroupedList
          items={filteredResults}
          groupBy={groupFn}
          groupThemes={groupBy === 'severity' ? validationThemes : undefined}
          renderGroup={(groupKey, groupResults, theme) => (
            <button
              onClick={() => collapsible && toggleGroup(groupKey)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                theme ? `${theme.bgColor} ${theme.borderColor}` : 'bg-gray-50 border-gray-200'
              } ${collapsible ? 'hover:opacity-80' : ''}`}
            >
              <div className="flex items-center gap-2">
                {theme && <span className="text-lg">{theme.icon}</span>}
                <span className={`font-medium ${theme?.textColor || 'text-gray-700'}`}>
                  {theme?.label || groupKey}
                </span>
                <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">
                  {groupResults.length}
                </span>
              </div>
              {collapsible && (
                <svg
                  className={`w-4 h-4 transition-transform ${theme?.textColor || 'text-gray-700'} ${
                    isGroupOpen(groupKey) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          )}
          renderItem={(result, groupKey) => {
            if (collapsible && !isGroupOpen(groupKey)) return null

            const theme = validationThemes.get(result.severity)
            const isExpanded = isResultOpen(result.id)

            return (
              <div
                key={result.id}
                className={`p-3 rounded-lg border-l-4 bg-white ${
                  theme ? theme.borderColor.replace('border-', 'border-l-') : 'border-l-gray-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  {theme && <span className="text-lg flex-shrink-0">{theme.icon}</span>}

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
          }}
          className="space-y-3"
        />
      </CardContent>
    </Card>
  )
}
