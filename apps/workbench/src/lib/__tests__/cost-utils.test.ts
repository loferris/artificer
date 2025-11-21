import { describe, it, expect } from 'vitest'
import {
  formatCost,
  calculateTotal,
  compareCosts,
  calculateCostPerUnit,
  estimateMonthlyCost,
  formatCostBreakdown,
  calculateRemainingBudget,
  type CostItem
} from '../cost-utils'

describe('cost-utils', () => {
  describe('formatCost', () => {
    it('formats zero correctly', () => {
      expect(formatCost(0)).toBe('$0.00')
    })

    it('formats very small amounts with precision', () => {
      expect(formatCost(0.00789)).toBe('$0.0079')
      expect(formatCost(0.001)).toBe('$0.0010')
    })

    it('formats amounts between 0.01 and 1', () => {
      expect(formatCost(0.05)).toBe('$0.0500')
      expect(formatCost(0.5)).toBe('$0.5000')
    })

    it('formats amounts >= 1 with 2 decimals', () => {
      expect(formatCost(1.50)).toBe('$1.50')
      expect(formatCost(10.99)).toBe('$10.99')
      expect(formatCost(100)).toBe('$100.00')
    })

    it('respects custom precision', () => {
      expect(formatCost(0.123456, 2)).toBe('$0.12')
      expect(formatCost(0.123456, 6)).toBe('$0.123456')
    })
  })

  describe('calculateTotal', () => {
    it('calculates total from cost items', () => {
      const items: CostItem[] = [
        { amount: 0.01, label: 'Item 1' },
        { amount: 0.02, label: 'Item 2' },
        { amount: 0.03, label: 'Item 3' }
      ]

      expect(calculateTotal(items)).toBe(0.06)
    })

    it('handles empty array', () => {
      expect(calculateTotal([])).toBe(0)
    })

    it('handles single item', () => {
      expect(calculateTotal([{ amount: 5.50 }])).toBe(5.50)
    })

    it('handles items without labels', () => {
      const items: CostItem[] = [
        { amount: 1 },
        { amount: 2 },
        { amount: 3 }
      ]

      expect(calculateTotal(items)).toBe(6)
    })
  })

  describe('compareCosts', () => {
    it('compares costs with absolute difference', () => {
      expect(compareCosts(1.5, 1.0, 'absolute')).toBe('+$0.5000')
      expect(compareCosts(1.0, 1.5, 'absolute')).toBe('-$0.5000')
      expect(compareCosts(1.0, 1.0, 'absolute')).toBe('+$0.00')
      expect(compareCosts(2.0, 1.5, 'absolute')).toBe('+$0.5000')
    })

    it('compares costs with percentage difference', () => {
      expect(compareCosts(2.0, 1.0, 'percentage')).toBe('+100.0%')
      expect(compareCosts(1.5, 1.0, 'percentage')).toBe('+50.0%')
      expect(compareCosts(0.5, 1.0, 'percentage')).toBe('-50.0%')
    })

    it('handles division by zero for percentage', () => {
      expect(compareCosts(1.0, 0, 'percentage')).toBe('N/A')
    })

    it('defaults to absolute format', () => {
      expect(compareCosts(2.0, 1.5)).toBe('+$0.5000')
    })
  })

  describe('calculateCostPerUnit', () => {
    it('calculates cost per unit correctly', () => {
      expect(calculateCostPerUnit(10, 5)).toBe(2)
      expect(calculateCostPerUnit(1.50, 3)).toBe(0.5)
    })

    it('handles zero units', () => {
      expect(calculateCostPerUnit(10, 0)).toBe(0)
    })

    it('handles zero cost', () => {
      expect(calculateCostPerUnit(0, 5)).toBe(0)
    })
  })

  describe('estimateMonthlyCost', () => {
    it('estimates monthly cost correctly', () => {
      // $100 spent in 10 days = $10/day = $300/month (30 days)
      expect(estimateMonthlyCost(100, 10, 30)).toBe(300)

      // $50 spent in 5 days = $10/day = $300/month
      expect(estimateMonthlyCost(50, 5, 30)).toBe(300)
    })

    it('handles custom days in month', () => {
      // $100 spent in 10 days = $10/day = $310/month (31 days)
      expect(estimateMonthlyCost(100, 10, 31)).toBe(310)
    })

    it('handles zero days elapsed', () => {
      expect(estimateMonthlyCost(100, 0, 30)).toBe(0)
    })

    it('defaults to 30 days', () => {
      expect(estimateMonthlyCost(100, 10)).toBe(300)
    })
  })

  describe('formatCostBreakdown', () => {
    it('formats cost breakdown correctly', () => {
      const items: CostItem[] = [
        { amount: 0.01, label: 'Cleanup' },
        { amount: 0.02, label: 'Tagging' },
        { amount: 0.03, label: 'Translation' }
      ]

      const result = formatCostBreakdown(items)

      expect(result).toContain('Cleanup: $0.01')
      expect(result).toContain('Tagging: $0.02')
      expect(result).toContain('Translation: $0.03')
      expect(result).toContain('Total: $0.06')
    })

    it('filters out zero-cost items', () => {
      const items: CostItem[] = [
        { amount: 0.01, label: 'Cleanup' },
        { amount: 0, label: 'Free Item' },
        { amount: 0.02, label: 'Tagging' }
      ]

      const result = formatCostBreakdown(items)

      expect(result).toContain('Cleanup')
      expect(result).toContain('Tagging')
      expect(result).not.toContain('Free Item')
    })

    it('handles empty items', () => {
      const result = formatCostBreakdown([])
      expect(result).toBe(' (Total: $0.00)')
    })
  })

  describe('calculateRemainingBudget', () => {
    it('calculates remaining budget correctly', () => {
      const result = calculateRemainingBudget(30, 100)

      expect(result.remaining).toBe(70)
      expect(result.percentage).toBe(30)
      expect(result.status).toBe('safe')
    })

    it('returns "safe" status for < 70% spent', () => {
      expect(calculateRemainingBudget(50, 100).status).toBe('safe')
      expect(calculateRemainingBudget(69, 100).status).toBe('safe')
    })

    it('returns "warning" status for 70-90% spent', () => {
      expect(calculateRemainingBudget(70, 100).status).toBe('warning')
      expect(calculateRemainingBudget(85, 100).status).toBe('warning')
      expect(calculateRemainingBudget(89, 100).status).toBe('warning')
    })

    it('returns "critical" status for >= 90% spent', () => {
      expect(calculateRemainingBudget(90, 100).status).toBe('critical')
      expect(calculateRemainingBudget(95, 100).status).toBe('critical')
      expect(calculateRemainingBudget(100, 100).status).toBe('critical')
    })

    it('handles over-budget scenarios', () => {
      const result = calculateRemainingBudget(110, 100)

      expect(result.remaining).toBe(-10)
      expect(result.percentage).toBe(110)
      expect(result.status).toBe('critical')
    })
  })
})
