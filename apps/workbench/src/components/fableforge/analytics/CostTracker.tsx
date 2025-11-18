import React, { useEffect, useMemo } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { formatCost, calculateTotal, calculateRemainingBudget } from '@/lib/cost-utils'
import { createComponentLogger } from '@/lib/componentLogger'

const logger = createComponentLogger('CostTracker')

export interface CostBreakdown {
  stage: string
  cost: number
  percentage?: number
}

export interface BudgetInfo {
  total: number
  spent: number
  remaining: number
  monthlyLimit?: number
  monthlySpent?: number
}

export interface CostTrackerProps {
  breakdown: CostBreakdown[]
  budget?: BudgetInfo
  showProjections?: boolean
  className?: string
  layout?: 'detailed' | 'compact'
}

interface BudgetStatus {
  status: 'safe' | 'warning' | 'critical' | 'exceeded'
  color: string
  bgColor: string
  label: string
  icon: string
}

function getBudgetStatus(percentUsed: number): BudgetStatus {
  if (percentUsed >= 100) {
    return {
      status: 'exceeded',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      label: 'Budget Exceeded',
      icon: '🚨'
    }
  }
  if (percentUsed >= 90) {
    return {
      status: 'critical',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      label: 'Critical',
      icon: '⚠️'
    }
  }
  if (percentUsed >= 75) {
    return {
      status: 'warning',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      label: 'Warning',
      icon: '⚡'
    }
  }
  return {
    status: 'safe',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'On Track',
    icon: '✓'
  }
}

function getProgressVariant(percentUsed: number): 'success' | 'warning' | 'error' {
  if (percentUsed >= 90) return 'error'
  if (percentUsed >= 75) return 'warning'
  return 'success'
}

/**
 * Track costs and budget usage
 *
 * Features:
 * - Cost breakdown by pipeline stage
 * - Budget tracking with status indicators
 * - Running total and projections
 * - Monthly limit tracking
 * - Visual progress bars
 */
export function CostTracker({
  breakdown,
  budget,
  showProjections = false,
  className,
  layout = 'detailed'
}: CostTrackerProps) {
  useEffect(() => {
    logger.lifecycle('CostTracker', 'mount', {
      stagesCount: breakdown.length,
      hasBudget: !!budget,
      showProjections,
      layout
    })

    logger.info('Cost tracking', {
      component: 'CostTracker'
    }, {
      totalCost: breakdown.reduce((sum, b) => sum + b.cost, 0),
      budgetTotal: budget?.total,
      budgetRemaining: budget?.remaining
    })

    return () => {
      logger.lifecycle('CostTracker', 'unmount')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount/unmount for lifecycle logging

  const totalCost = useMemo(() => breakdown.reduce((sum, b) => sum + b.cost, 0), [breakdown])

  const budgetStatus = useMemo(() => {
    if (!budget) return null
    const percentUsed = (budget.spent / budget.total) * 100
    return getBudgetStatus(percentUsed)
  }, [budget])

  const monthlyStatus = useMemo(() => {
    if (!budget?.monthlyLimit || !budget.monthlySpent) return null
    const percentUsed = (budget.monthlySpent / budget.monthlyLimit) * 100
    return {
      percentUsed,
      ...getBudgetStatus(percentUsed)
    }
  }, [budget])

  // Calculate projections (simple 30-day linear projection)
  const projections = useMemo(() => {
    if (!showProjections || !budget?.monthlySpent) return null

    const dailyAverage = budget.monthlySpent / 30
    const projectedMonthly = dailyAverage * 30
    const projectedAnnual = dailyAverage * 365

    return {
      daily: dailyAverage,
      monthly: projectedMonthly,
      annual: projectedAnnual
    }
  }, [showProjections, budget])

  if (breakdown.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-gray-500">
          No cost data available
        </CardContent>
      </Card>
    )
  }

  if (layout === 'compact') {
    return (
      <Card className={className}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">Total Cost</div>
              <div className="text-2xl font-bold">{formatCost(totalCost)}</div>
            </div>
            {budget && (
              <div className="text-right">
                <div className="text-xs text-gray-600">Remaining</div>
                <div className={cn("text-xl font-semibold", budgetStatus?.color)}>
                  {formatCost(budget.remaining)}
                </div>
              </div>
            )}
          </div>
          {budget && (
            <Progress
              value={(budget.spent / budget.total) * 100}
              variant={getProgressVariant((budget.spent / budget.total) * 100)}
              className="mt-3"
              size="sm"
            />
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Overall Budget Status */}
      {budget && budgetStatus && (
        <Card className={budgetStatus.bgColor}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{budgetStatus.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold">Budget Status</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {formatCost(budget.spent)} of {formatCost(budget.total)} used
                  </p>
                </div>
              </div>
              <Badge variant={budgetStatus.status === 'safe' ? 'green' : budgetStatus.status === 'warning' ? 'yellow' : 'red'}>
                {budgetStatus.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress
              value={(budget.spent / budget.total) * 100}
              variant={getProgressVariant((budget.spent / budget.total) * 100)}
            />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-600">Spent</div>
                <div className="text-lg font-semibold">{formatCost(budget.spent)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Remaining</div>
                <div className={cn("text-lg font-semibold", budgetStatus.color)}>
                  {formatCost(budget.remaining)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Total</div>
                <div className="text-lg font-semibold">{formatCost(budget.total)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Limit Tracking */}
      {monthlyStatus && budget && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Monthly Limit</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Current month usage
                </p>
              </div>
              <div className="text-right">
                <div className={cn("text-xl font-bold", monthlyStatus.color)}>
                  {Math.round(monthlyStatus.percentUsed)}%
                </div>
                <div className="text-xs text-gray-600">
                  {formatCost(budget.monthlySpent ?? 0)} / {formatCost(budget.monthlyLimit ?? 0)}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress
              value={monthlyStatus.percentUsed}
              variant={getProgressVariant(monthlyStatus.percentUsed)}
              size="sm"
            />
          </CardContent>
        </Card>
      )}

      {/* Cost Breakdown by Stage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Cost Breakdown</h3>
            <div className="text-right">
              <div className="text-xs text-gray-600">Total</div>
              <div className="text-xl font-bold">{formatCost(totalCost)}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {breakdown.map((item, index) => {
              const percentage = item.percentage ?? (item.cost / totalCost) * 100

              return (
                <div key={item.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.stage}</span>
                    <span className="text-gray-600">
                      {formatCost(item.cost)} ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <Progress value={percentage} variant="blue" size="sm" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Projections */}
      {projections && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <div>
                <h4 className="font-medium text-blue-900">Cost Projections</h4>
                <p className="text-xs text-blue-700 mt-1">Based on current usage</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-blue-700">Daily Avg</div>
                <div className="text-lg font-semibold text-blue-900">
                  {formatCost(projections.daily)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-blue-700">Monthly Est</div>
                <div className="text-lg font-semibold text-blue-900">
                  {formatCost(projections.monthly)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-blue-700">Annual Est</div>
                <div className="text-lg font-semibold text-blue-900">
                  {formatCost(projections.annual)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {budgetStatus && budgetStatus.status !== 'safe' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-900 mb-1">Budget Alert</h4>
                <ul className="text-xs text-yellow-800 space-y-1">
                  {budgetStatus.status === 'exceeded' && (
                    <li>• Budget has been exceeded - consider increasing limit or reducing usage</li>
                  )}
                  {budgetStatus.status === 'critical' && (
                    <li>• Approaching budget limit - monitor usage closely</li>
                  )}
                  {budgetStatus.status === 'warning' && (
                    <li>• Over 75% of budget used - review upcoming expenses</li>
                  )}
                  {budget && budget.remaining < totalCost && (
                    <li>• Current job cost exceeds remaining budget</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
