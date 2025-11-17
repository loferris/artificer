import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CostTracker } from '../CostTracker'

describe('CostTracker', () => {
  const mockBreakdown = [
    { stage: 'Translation', cost: 0.05, percentage: 50 },
    { stage: 'Refinement', cost: 0.03, percentage: 30 },
    { stage: 'Synthesis', cost: 0.02, percentage: 20 }
  ]

  const mockBudget = {
    total: 1.00,
    spent: 0.10,
    remaining: 0.90,
    monthlyLimit: 10.00,
    monthlySpent: 2.50
  }

  it('renders cost breakdown', () => {
    render(<CostTracker breakdown={mockBreakdown} />)

    expect(screen.getByText('Cost Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Translation')).toBeInTheDocument()
    expect(screen.getByText('Refinement')).toBeInTheDocument()
    expect(screen.getByText('Synthesis')).toBeInTheDocument()
  })

  it('displays total cost', () => {
    render(<CostTracker breakdown={mockBreakdown} />)

    expect(screen.getByText('$0.10')).toBeInTheDocument()
  })

  it('shows budget status when budget provided', () => {
    render(<CostTracker breakdown={mockBreakdown} budget={mockBudget} />)

    expect(screen.getByText('Budget Status')).toBeInTheDocument()
    expect(screen.getByText('On Track')).toBeInTheDocument()
  })

  it('displays safe status for low budget usage', () => {
    render(<CostTracker breakdown={mockBreakdown} budget={mockBudget} />)

    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.getByText('On Track')).toBeInTheDocument()
  })

  it('displays warning status for high budget usage', () => {
    const warningBudget = {
      ...mockBudget,
      spent: 0.80,
      remaining: 0.20
    }

    render(<CostTracker breakdown={mockBreakdown} budget={warningBudget} />)

    expect(screen.getByText('Warning')).toBeInTheDocument()
  })

  it('displays critical status for very high budget usage', () => {
    const criticalBudget = {
      ...mockBudget,
      spent: 0.95,
      remaining: 0.05
    }

    render(<CostTracker breakdown={mockBreakdown} budget={criticalBudget} />)

    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('displays exceeded status when over budget', () => {
    const exceededBudget = {
      ...mockBudget,
      spent: 1.10,
      remaining: -0.10
    }

    render(<CostTracker breakdown={mockBreakdown} budget={exceededBudget} />)

    expect(screen.getByText('Budget Exceeded')).toBeInTheDocument()
  })

  it('shows monthly limit tracking', () => {
    render(<CostTracker breakdown={mockBreakdown} budget={mockBudget} />)

    expect(screen.getByText('Monthly Limit')).toBeInTheDocument()
    expect(screen.getByText('$2.50 / $10.00')).toBeInTheDocument()
  })

  it('calculates monthly usage percentage', () => {
    render(<CostTracker breakdown={mockBreakdown} budget={mockBudget} />)

    // 2.50 / 10.00 = 25%
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('shows cost projections when enabled', () => {
    render(<CostTracker breakdown={mockBreakdown} budget={mockBudget} showProjections />)

    expect(screen.getByText('Cost Projections')).toBeInTheDocument()
    expect(screen.getByText('Daily Avg')).toBeInTheDocument()
    expect(screen.getByText('Monthly Est')).toBeInTheDocument()
    expect(screen.getByText('Annual Est')).toBeInTheDocument()
  })

  it('hides projections by default', () => {
    render(<CostTracker breakdown={mockBreakdown} budget={mockBudget} />)

    expect(screen.queryByText('Cost Projections')).not.toBeInTheDocument()
  })

  it('displays budget breakdown stats', () => {
    render(<CostTracker breakdown={mockBreakdown} budget={mockBudget} />)

    expect(screen.getByText('Spent')).toBeInTheDocument()
    expect(screen.getByText('Remaining')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('shows warnings for budget alerts', () => {
    const warningBudget = {
      ...mockBudget,
      spent: 0.80,
      remaining: 0.20
    }

    render(<CostTracker breakdown={mockBreakdown} budget={warningBudget} />)

    expect(screen.getByText('Budget Alert')).toBeInTheDocument()
    expect(screen.getByText(/Over 75% of budget used/)).toBeInTheDocument()
  })

  it('shows critical warnings when approaching limit', () => {
    const criticalBudget = {
      ...mockBudget,
      spent: 0.95,
      remaining: 0.05
    }

    render(<CostTracker breakdown={mockBreakdown} budget={criticalBudget} />)

    expect(screen.getByText(/Approaching budget limit/)).toBeInTheDocument()
  })

  it('renders compact layout', () => {
    const { container } = render(
      <CostTracker breakdown={mockBreakdown} budget={mockBudget} layout="compact" />
    )

    expect(screen.getByText('Total Cost')).toBeInTheDocument()
    expect(screen.getByText('Remaining')).toBeInTheDocument()
    // Should not show full breakdown in compact mode
    expect(screen.queryByText('Cost Breakdown')).not.toBeInTheDocument()
  })

  it('renders detailed layout by default', () => {
    render(<CostTracker breakdown={mockBreakdown} budget={mockBudget} />)

    expect(screen.getByText('Cost Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Budget Status')).toBeInTheDocument()
  })

  it('calculates stage percentages automatically', () => {
    const breakdownWithoutPercentages = [
      { stage: 'Stage A', cost: 0.05 },
      { stage: 'Stage B', cost: 0.05 }
    ]

    render(<CostTracker breakdown={breakdownWithoutPercentages} />)

    // Each should be 50%
    expect(screen.getAllByText(/50%/)).toHaveLength(2)
  })

  it('shows empty state for no data', () => {
    render(<CostTracker breakdown={[]} />)

    expect(screen.getByText('No cost data available')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <CostTracker breakdown={mockBreakdown} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders progress bars for stages', () => {
    const { container } = render(<CostTracker breakdown={mockBreakdown} />)

    const progressBars = container.querySelectorAll('[role="progressbar"]')
    // Should have progress bars for each stage
    expect(progressBars.length).toBeGreaterThan(0)
  })

  it('renders progress bar for budget usage', () => {
    render(<CostTracker breakdown={mockBreakdown} budget={mockBudget} />)

    // Should have budget progress bar in detailed view
    const { container } = render(<CostTracker breakdown={mockBreakdown} budget={mockBudget} />)
    const progressBars = container.querySelectorAll('[role="progressbar"]')
    expect(progressBars.length).toBeGreaterThan(0)
  })

  it('handles budget without monthly limit', () => {
    const budgetWithoutMonthly = {
      total: 1.00,
      spent: 0.10,
      remaining: 0.90
    }

    render(<CostTracker breakdown={mockBreakdown} budget={budgetWithoutMonthly} />)

    expect(screen.queryByText('Monthly Limit')).not.toBeInTheDocument()
  })

  it('formats costs correctly', () => {
    render(<CostTracker breakdown={mockBreakdown} budget={mockBudget} />)

    // Should show dollar amounts with proper formatting
    expect(screen.getByText(/\$0\.05/)).toBeInTheDocument()
    expect(screen.getByText(/\$0\.03/)).toBeInTheDocument()
    expect(screen.getByText(/\$0\.02/)).toBeInTheDocument()
  })

  it('shows budget usage as percentage', () => {
    render(<CostTracker breakdown={mockBreakdown} budget={mockBudget} />)

    // Budget info should show percentage used (10%)
    expect(screen.getByText(/\$0.10 of \$1.00 used/)).toBeInTheDocument()
  })

  it('displays appropriate status icon', () => {
    render(<CostTracker breakdown={mockBreakdown} budget={mockBudget} />)

    // Safe status should show checkmark
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('shows warning icon for critical budget', () => {
    const criticalBudget = {
      ...mockBudget,
      spent: 0.95,
      remaining: 0.05
    }

    render(<CostTracker breakdown={mockBreakdown} budget={criticalBudget} />)

    expect(screen.getByText('⚠️')).toBeInTheDocument()
  })
})
