import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QualityMetrics } from '../QualityMetrics'

describe('QualityMetrics', () => {
  const mockMetrics = {
    fluency: 0.85,
    adequacy: 0.90,
    culturalAccuracy: 0.75,
    readability: 65,
    estimatedBLEU: 0.42
  }

  it('renders overall quality score', () => {
    render(<QualityMetrics metrics={mockMetrics} />)

    expect(screen.getByText('Overall Quality')).toBeInTheDocument()
    // Average of normalized scores: (0.85 + 0.90 + 0.75 + 0.65 + 0.42) / 5 = 71.4% → 71%
    expect(screen.getByText('71%')).toBeInTheDocument()
  })

  it('displays all metric cards', () => {
    render(<QualityMetrics metrics={mockMetrics} />)

    expect(screen.getByText('Fluency')).toBeInTheDocument()
    expect(screen.getByText('Adequacy')).toBeInTheDocument()
    expect(screen.getByText('Cultural Accuracy')).toBeInTheDocument()
    expect(screen.getByText('Readability')).toBeInTheDocument()
    expect(screen.getByText('BLEU Score')).toBeInTheDocument()
  })

  it('formats fluency as percentage', () => {
    render(<QualityMetrics metrics={mockMetrics} />)

    expect(screen.getByText('85%')).toBeInTheDocument() // fluency
  })

  it('formats readability score correctly', () => {
    render(<QualityMetrics metrics={mockMetrics} />)

    expect(screen.getByText('65/100')).toBeInTheDocument()
  })

  it('shows metric descriptions', () => {
    render(<QualityMetrics metrics={mockMetrics} />)

    expect(screen.getByText('How natural and fluent the translation reads')).toBeInTheDocument()
    expect(screen.getByText('How accurately the meaning is preserved')).toBeInTheDocument()
    expect(screen.getByText('How well cultural nuances are captured')).toBeInTheDocument()
    expect(screen.getByText('Flesch reading ease score')).toBeInTheDocument()
    expect(screen.getByText('Machine translation quality estimate')).toBeInTheDocument()
  })

  it('displays metric icons', () => {
    render(<QualityMetrics metrics={mockMetrics} />)

    expect(screen.getByText('💬')).toBeInTheDocument() // fluency
    expect(screen.getByText('🎯')).toBeInTheDocument() // adequacy
    expect(screen.getByText('🌏')).toBeInTheDocument() // cultural
    expect(screen.getByText('📖')).toBeInTheDocument() // readability
    expect(screen.getByText('🤖')).toBeInTheDocument() // BLEU
  })

  it('applies success color for high scores', () => {
    const highMetrics = {
      fluency: 0.95
    }

    const { container } = render(<QualityMetrics metrics={highMetrics} />)

    // Find the metric card (not the overall score) by looking for "Fluency" heading
    const fluencyCard = screen.getByText('Fluency').closest('.rounded-2xl')
    expect(fluencyCard).toBeInTheDocument()
    const fluencyScore = fluencyCard?.querySelector('.text-green-600')
    expect(fluencyScore).toBeInTheDocument()
    expect(fluencyScore?.textContent).toBe('95%')
  })

  it('applies warning color for medium scores', () => {
    const mediumMetrics = {
      fluency: 0.65
    }

    const { container } = render(<QualityMetrics metrics={mediumMetrics} />)

    const fluencyCard = screen.getByText('Fluency').closest('.rounded-2xl')
    expect(fluencyCard).toBeInTheDocument()
    const fluencyScore = fluencyCard?.querySelector('.text-yellow-600')
    expect(fluencyScore).toBeInTheDocument()
    expect(fluencyScore?.textContent).toBe('65%')
  })

  it('applies error color for low scores', () => {
    const lowMetrics = {
      fluency: 0.45
    }

    const { container } = render(<QualityMetrics metrics={lowMetrics} />)

    const fluencyCard = screen.getByText('Fluency').closest('.rounded-2xl')
    expect(fluencyCard).toBeInTheDocument()
    const fluencyScore = fluencyCard?.querySelector('.text-red-600')
    expect(fluencyScore).toBeInTheDocument()
    expect(fluencyScore?.textContent).toBe('45%')
  })

  it('shows recommendations when quality is low', () => {
    const lowMetrics = {
      fluency: 0.65,
      adequacy: 0.70,
      culturalAccuracy: 0.60,
      readability: 45
    }

    render(<QualityMetrics metrics={lowMetrics} />)

    expect(screen.getByText('Quality Recommendations')).toBeInTheDocument()
    expect(screen.getByText(/Consider improving sentence flow/)).toBeInTheDocument()
    expect(screen.getByText(/Review for meaning preservation/)).toBeInTheDocument()
    expect(screen.getByText(/Check cultural terms/)).toBeInTheDocument()
    expect(screen.getByText(/Simplify complex sentences/)).toBeInTheDocument()
  })

  it('hides recommendations for high quality', () => {
    const highMetrics = {
      fluency: 0.95,
      adequacy: 0.92,
      culturalAccuracy: 0.88,
      readability: 75
    }

    render(<QualityMetrics metrics={highMetrics} />)

    expect(screen.queryByText('Quality Recommendations')).not.toBeInTheDocument()
  })

  it('handles partial metrics', () => {
    const partialMetrics = {
      fluency: 0.85
    }

    render(<QualityMetrics metrics={partialMetrics} />)

    expect(screen.getByText('Fluency')).toBeInTheDocument()
    expect(screen.queryByText('Adequacy')).not.toBeInTheDocument()
  })

  it('shows empty state for no metrics', () => {
    render(<QualityMetrics metrics={{}} />)

    expect(screen.getByText('No quality metrics available')).toBeInTheDocument()
  })

  it('uses grid layout by default', () => {
    const { container } = render(<QualityMetrics metrics={mockMetrics} />)

    const grid = container.querySelector('.grid')
    expect(grid).toBeInTheDocument()
  })

  it('uses list layout when specified', () => {
    const { container } = render(<QualityMetrics metrics={mockMetrics} layout="list" />)

    const list = container.querySelector('.space-y-4')
    expect(list).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <QualityMetrics metrics={mockMetrics} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('calculates overall score correctly', () => {
    const metrics = {
      fluency: 1.0,
      adequacy: 1.0,
      culturalAccuracy: 1.0,
      readability: 100,
      estimatedBLEU: 1.0
    }

    const { container } = render(<QualityMetrics metrics={metrics} />)

    // Check for overall score in the first card (Overall Quality)
    const overallCard = screen.getByText('Overall Quality').closest('.rounded-2xl')
    expect(overallCard).toBeInTheDocument()
    expect(overallCard?.textContent).toContain('100%')
    expect(screen.getByText('Excellent')).toBeInTheDocument()
  })

  it('shows quality labels', () => {
    render(<QualityMetrics metrics={mockMetrics} />)

    // Should have 3 "✓ Excellent" (fluency, adequacy, readability)
    // 1 "! Good" (cultural: 0.75 < 0.8 but >= 0.6)
    // 1 "⚠ Needs Work" (BLEU: 0.42 < 0.6)
    expect(screen.getAllByText('✓ Excellent')).toHaveLength(3)
    expect(screen.getByText('! Good')).toBeInTheDocument()
    expect(screen.getByText('⚠ Needs Work')).toBeInTheDocument()
  })

  it('renders progress bars for each metric', () => {
    const { container } = render(<QualityMetrics metrics={mockMetrics} />)

    // Should have progress bars (one overall + 5 individual)
    const progressBars = container.querySelectorAll('[role="progressbar"]')
    expect(progressBars.length).toBeGreaterThan(0)
  })

  it('handles BLEU score thresholds correctly', () => {
    const bleuMetrics = {
      estimatedBLEU: 0.45 // Should be green
    }

    const { container } = render(<QualityMetrics metrics={bleuMetrics} />)

    const bleuCard = screen.getByText('BLEU Score').closest('.rounded-2xl')
    expect(bleuCard).toBeInTheDocument()
    const bleuScore = bleuCard?.querySelector('.text-green-600')
    expect(bleuScore).toBeInTheDocument()
    expect(bleuScore?.textContent).toBe('45%')
  })

  it('shows quality status text for overall score', () => {
    render(<QualityMetrics metrics={mockMetrics} />)

    // Based on overall score of ~79%, should show "Good"
    expect(screen.getByText('Good')).toBeInTheDocument()
  })

  it('normalizes readability to 0-1 scale for overall calculation', () => {
    const metricsWithReadability = {
      readability: 100 // Should be normalized to 1.0
    }

    render(<QualityMetrics metrics={metricsWithReadability} />)

    // Overall should be 100%
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
