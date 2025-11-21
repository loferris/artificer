/**
 * Cost formatting and calculation utilities for Translator components
 * Used in: CostTracker, SpecialistCard, ABTestComparison
 */

export interface CostItem {
  amount: number
  label?: string
}

/**
 * Format a cost amount as USD with appropriate precision
 */
export function formatCost(amount: number, precision?: number): string {
  if (amount === 0) return '$0.00'

  // If precision is explicitly provided, use it
  if (precision !== undefined) {
    return `$${amount.toFixed(precision)}`
  }

  // For very small amounts, use more precision
  if (amount < 0.01) {
    return `$${amount.toFixed(4)}`
  }

  // For larger amounts, use 2 decimal places
  if (amount >= 1) {
    return `$${amount.toFixed(2)}`
  }

  // For amounts between 0.01 and 1, use 4 decimal places
  return `$${amount.toFixed(4)}`
}

/**
 * Calculate total from an array of cost items
 */
export function calculateTotal(items: CostItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

/**
 * Compare two costs and return a formatted difference
 */
export function compareCosts(
  costA: number,
  costB: number,
  format: 'absolute' | 'percentage' = 'absolute'
): string {
  const diff = costA - costB

  if (format === 'absolute') {
    const sign = diff >= 0 ? '+' : '-'
    const absDiff = Math.abs(diff)
    return `${sign}${formatCost(absDiff)}`
  }

  if (costB === 0) return 'N/A'

  const percentDiff = ((diff / costB) * 100).toFixed(1)
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${percentDiff}%`
}

/**
 * Calculate cost per unit (e.g., cost per job, cost per 1K tokens)
 */
export function calculateCostPerUnit(totalCost: number, units: number): number {
  if (units === 0) return 0
  return totalCost / units
}

/**
 * Estimate monthly cost based on current usage
 */
export function estimateMonthlyCost(
  totalCost: number,
  daysElapsed: number,
  daysInMonth: number = 30
): number {
  if (daysElapsed === 0) return 0
  const dailyAverage = totalCost / daysElapsed
  return dailyAverage * daysInMonth
}

/**
 * Format cost breakdown as a readable string
 */
export function formatCostBreakdown(items: CostItem[]): string {
  const total = calculateTotal(items)
  const breakdown = items
    .filter(item => item.amount > 0)
    .map(item => `${item.label}: ${formatCost(item.amount)}`)
    .join(', ')

  return `${breakdown} (Total: ${formatCost(total)})`
}

/**
 * Calculate remaining budget
 */
export function calculateRemainingBudget(spent: number, budget: number): {
  remaining: number
  percentage: number
  status: 'safe' | 'warning' | 'critical'
} {
  const remaining = budget - spent
  // Round to avoid floating point precision issues
  const percentage = Math.round((spent / budget) * 100 * 100) / 100

  let status: 'safe' | 'warning' | 'critical'
  if (percentage < 70) {
    status = 'safe'
  } else if (percentage < 90) {
    status = 'warning'
  } else {
    status = 'critical'
  }

  return { remaining, percentage, status }
}
