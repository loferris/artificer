import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PipelineProgress } from '../PipelineProgress'
import type { PipelineStage } from '../PipelineProgress'

describe('PipelineProgress', () => {
  const mockStages: PipelineStage[] = [
    { id: 'cleanup', label: 'Cleanup', status: 'completed' },
    { id: 'tagging', label: 'Tagging', status: 'running' },
    { id: 'refinement', label: 'Refinement', status: 'pending' },
    { id: 'translation', label: 'Translation', status: 'pending' },
  ]

  it('renders all pipeline stages', () => {
    render(<PipelineProgress stages={mockStages} progress={50} />)

    expect(screen.getByText('Cleanup')).toBeInTheDocument()
    expect(screen.getByText('Tagging')).toBeInTheDocument()
    expect(screen.getByText('Refinement')).toBeInTheDocument()
    expect(screen.getByText('Translation')).toBeInTheDocument()
  })

  it('shows progress percentage', () => {
    render(<PipelineProgress stages={mockStages} progress={66} />)

    expect(screen.getByText('66%')).toBeInTheDocument()
  })

  it('renders progress bar', () => {
    const { container } = render(<PipelineProgress stages={mockStages} progress={50} />)

    const progressBar = container.querySelector('[style*="width"]')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveStyle({ width: '50%' })
  })

  it('shows estimated time remaining when provided', () => {
    render(<PipelineProgress stages={mockStages} progress={50} estimatedTimeRemaining={120} />)

    expect(screen.getByText(/Estimated time remaining:/)).toBeInTheDocument()
    expect(screen.getByText(/2m/)).toBeInTheDocument()
  })

  it('does not show time estimate when not provided', () => {
    render(<PipelineProgress stages={mockStages} progress={50} />)

    expect(screen.queryByText(/Estimated time remaining:/)).not.toBeInTheDocument()
  })

  it('hides stage labels when showStageLabels is false', () => {
    render(<PipelineProgress stages={mockStages} progress={50} showStageLabels={false} />)

    // Status badges should still be there
    expect(screen.getByText('Completed')).toBeInTheDocument()
    // But stage labels should be hidden
    expect(screen.queryByText('Cleanup')).not.toBeInTheDocument()
  })

  it('highlights current stage', () => {
    render(<PipelineProgress stages={mockStages} currentStage="tagging" progress={50} />)

    const taggingLabel = screen.getByText('Tagging')
    expect(taggingLabel).toHaveClass('text-gray-900', 'font-medium')
  })

  it('animates current stage status badge', () => {
    const { container } = render(<PipelineProgress stages={mockStages} currentStage="tagging" progress={50} />)

    // Find the Running badge (which should be animated for the current stage)
    const runningBadge = screen.getByText('Running').closest('div')
    expect(runningBadge).toHaveClass('animate-pulse')
  })

  it('applies custom className', () => {
    const { container } = render(
      <PipelineProgress stages={mockStages} progress={50} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('shows connector lines between stages', () => {
    const { container } = render(<PipelineProgress stages={mockStages} progress={50} />)

    // Should have 3 connectors for 4 stages
    const connectors = container.querySelectorAll('.flex-1.mx-2')
    expect(connectors.length).toBe(3)
  })

  it('styles completed stage connectors differently', () => {
    const { container } = render(<PipelineProgress stages={mockStages} progress={50} />)

    const connectors = container.querySelectorAll('.h-px')
    // First connector (after completed stage) should be green
    expect(connectors[0]).toHaveClass('bg-green-300')
    // Other connectors should be gray
    expect(connectors[1]).toHaveClass('bg-gray-200')
  })

  it('handles zero progress', () => {
    render(<PipelineProgress stages={mockStages} progress={0} />)

    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('handles 100% progress', () => {
    render(<PipelineProgress stages={mockStages} progress={100} />)

    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('rounds progress to nearest integer', () => {
    render(<PipelineProgress stages={mockStages} progress={66.7} />)

    expect(screen.getByText('67%')).toBeInTheDocument()
  })

  it('shows "Overall Progress" label', () => {
    render(<PipelineProgress stages={mockStages} progress={50} />)

    expect(screen.getByText('Overall Progress')).toBeInTheDocument()
  })

  it('handles single stage', () => {
    const singleStage: PipelineStage[] = [
      { id: 'cleanup', label: 'Cleanup', status: 'completed' }
    ]

    render(<PipelineProgress stages={singleStage} progress={100} />)

    expect(screen.getByText('Cleanup')).toBeInTheDocument()
  })

  it('animates progress bar when in progress', () => {
    const { container } = render(<PipelineProgress stages={mockStages} progress={50} />)

    const progressBar = container.querySelector('[class*="transition-all"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('does not show time estimate for 0 seconds', () => {
    render(<PipelineProgress stages={mockStages} progress={50} estimatedTimeRemaining={0} />)

    expect(screen.queryByText(/Estimated time remaining:/)).not.toBeInTheDocument()
  })

  it('formats time estimates correctly', () => {
    render(<PipelineProgress stages={mockStages} progress={50} estimatedTimeRemaining={65} />)

    expect(screen.getByText(/1m 5s/)).toBeInTheDocument()
  })
})
