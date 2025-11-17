import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TranslationTimeline } from '../TranslationTimeline'

describe('TranslationTimeline', () => {
  const mockJobs = [
    {
      id: '1',
      title: 'Novel Chapter 1',
      sourceLang: 'en',
      targetLang: 'ja',
      status: 'completed' as const,
      createdAt: new Date('2024-01-15'),
      completedAt: new Date('2024-01-15'),
      duration: 120000,
      cost: 0.50,
      quality: 0.85,
      wordCount: 1500,
      specialist: 'cultural'
    },
    {
      id: '2',
      title: 'Novel Chapter 2',
      sourceLang: 'en',
      targetLang: 'ja',
      status: 'running' as const,
      createdAt: new Date('2024-01-16'),
      wordCount: 1200
    },
    {
      id: '3',
      title: 'Novel Chapter 3',
      sourceLang: 'en',
      targetLang: 'ja',
      status: 'failed' as const,
      createdAt: new Date('2024-01-17'),
      error: 'API timeout'
    }
  ]

  it('renders all jobs', () => {
    render(<TranslationTimeline jobs={mockJobs} />)

    expect(screen.getByText('Novel Chapter 1')).toBeInTheDocument()
    expect(screen.getByText('Novel Chapter 2')).toBeInTheDocument()
    expect(screen.getByText('Novel Chapter 3')).toBeInTheDocument()
  })

  it('displays job statuses', () => {
    render(<TranslationTimeline jobs={mockJobs} />)

    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('shows language pairs', () => {
    render(<TranslationTimeline jobs={mockJobs} />)

    // Should show "English → Japanese"
    expect(screen.getAllByText(/English.*Japanese/)).toHaveLength(3)
  })

  it('displays word counts', () => {
    render(<TranslationTimeline jobs={mockJobs} />)

    expect(screen.getByText('1,500 words')).toBeInTheDocument()
    expect(screen.getByText('1,200 words')).toBeInTheDocument()
  })

  it('shows cost information', () => {
    render(<TranslationTimeline jobs={mockJobs} />)

    expect(screen.getByText('$0.50')).toBeInTheDocument()
  })

  it('displays quality scores', () => {
    render(<TranslationTimeline jobs={mockJobs} />)

    expect(screen.getByText('85% quality')).toBeInTheDocument()
  })

  it('shows duration for completed jobs', () => {
    render(<TranslationTimeline jobs={mockJobs} />)

    expect(screen.getByText('2m')).toBeInTheDocument()
  })

  it('displays specialist badges', () => {
    render(<TranslationTimeline jobs={mockJobs} />)

    expect(screen.getByText('cultural')).toBeInTheDocument()
  })

  it('shows error messages for failed jobs', () => {
    render(<TranslationTimeline jobs={mockJobs} />)

    expect(screen.getByText('API timeout')).toBeInTheDocument()
  })

  it('renders timeline indicators', () => {
    const { container } = render(<TranslationTimeline jobs={mockJobs} layout="timeline" />)

    // Should have timeline dots
    const timelineDots = container.querySelectorAll('.rounded-full')
    expect(timelineDots.length).toBeGreaterThan(0)
  })

  it('animates running job indicator', () => {
    const { container } = render(<TranslationTimeline jobs={mockJobs} />)

    // Running job should have animated dot
    const runningDot = container.querySelector('.animate-pulse')
    expect(runningDot).toBeInTheDocument()
  })

  it('calls onJobClick when job is clicked', () => {
    const mockOnJobClick = vi.fn()
    render(<TranslationTimeline jobs={mockJobs} onJobClick={mockOnJobClick} />)

    const jobCard = screen.getByText('Novel Chapter 1').closest('[class*="cursor-pointer"]')
    fireEvent.click(jobCard!)

    expect(mockOnJobClick).toHaveBeenCalledWith('1')
  })

  it('expands job details', () => {
    render(<TranslationTimeline jobs={mockJobs} />)

    const showDetailsButton = screen.getAllByText('Show details')[0]
    fireEvent.click(showDetailsButton)

    expect(screen.getByText('Hide details')).toBeInTheDocument()
    expect(screen.getByText(/Started:/)).toBeInTheDocument()
    expect(screen.getByText(/Completed:/)).toBeInTheDocument()
  })

  it('shows filters when enabled', () => {
    render(<TranslationTimeline jobs={mockJobs} showFilters />)

    expect(screen.getByText('Status:')).toBeInTheDocument()
    expect(screen.getByText('Date:')).toBeInTheDocument()
  })

  it('filters by status', () => {
    render(<TranslationTimeline jobs={mockJobs} showFilters />)

    const statusSelect = screen.getByDisplayValue('All')
    fireEvent.change(statusSelect, { target: { value: 'completed' } })

    expect(screen.getByText('Novel Chapter 1')).toBeInTheDocument()
    expect(screen.queryByText('Novel Chapter 2')).not.toBeInTheDocument()
  })

  it('shows job count', () => {
    render(<TranslationTimeline jobs={mockJobs} showFilters />)

    expect(screen.getByText('3 jobs')).toBeInTheDocument()
  })

  it('limits displayed jobs when maxItems specified', () => {
    render(<TranslationTimeline jobs={mockJobs} maxItems={2} />)

    expect(screen.getByText('Novel Chapter 1')).toBeInTheDocument()
    expect(screen.getByText('Novel Chapter 2')).toBeInTheDocument()
    expect(screen.queryByText('Novel Chapter 3')).not.toBeInTheDocument()
  })

  it('shows "Show more" button when jobs are limited', () => {
    render(<TranslationTimeline jobs={mockJobs} maxItems={2} />)

    expect(screen.getByText('Show 1 more jobs')).toBeInTheDocument()
  })

  it('renders list layout', () => {
    const { container } = render(<TranslationTimeline jobs={mockJobs} layout="list" />)

    // List layout should not have timeline indicators
    expect(container.querySelector('.w-px')).not.toBeInTheDocument()
  })

  it('shows empty state for no jobs', () => {
    render(<TranslationTimeline jobs={[]} />)

    expect(screen.getByText('No translation jobs yet')).toBeInTheDocument()
  })

  it('shows empty state when filters match nothing', () => {
    render(<TranslationTimeline jobs={mockJobs} showFilters />)

    const statusSelect = screen.getByDisplayValue('All')
    fireEvent.change(statusSelect, { target: { value: 'cancelled' } })

    expect(screen.getByText('No jobs match the selected filters')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <TranslationTimeline jobs={mockJobs} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('displays time ago for job creation', () => {
    render(<TranslationTimeline jobs={mockJobs} />)

    // Should show relative time like "3 days ago"
    expect(screen.getAllByText(/ago/)).toHaveLength(3)
  })

  it('renders status badges with correct styling', () => {
    render(<TranslationTimeline jobs={mockJobs} />)

    const completedBadge = screen.getByText('Completed')
    expect(completedBadge).toBeInTheDocument()

    const runningBadge = screen.getByText('Running')
    expect(runningBadge).toBeInTheDocument()

    const failedBadge = screen.getByText('Failed')
    expect(failedBadge).toBeInTheDocument()
  })

  it('handles jobs without optional fields', () => {
    const minimalJobs = [
      {
        id: '1',
        title: 'Simple Job',
        sourceLang: 'en',
        targetLang: 'ja',
        status: 'pending' as const,
        createdAt: new Date()
      }
    ]

    render(<TranslationTimeline jobs={minimalJobs} />)

    expect(screen.getByText('Simple Job')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('filters by date range', () => {
    render(<TranslationTimeline jobs={mockJobs} showFilters />)

    const dateSelect = screen.getByDisplayValue('All Time')
    fireEvent.change(dateSelect, { target: { value: 'today' } })

    // Old jobs should be filtered out
    expect(screen.queryByText('Novel Chapter 1')).not.toBeInTheDocument()
  })

  it('shows all date filter options', () => {
    render(<TranslationTimeline jobs={mockJobs} showFilters />)

    const dateSelect = screen.getByDisplayValue('All Time') as HTMLSelectElement
    const options = Array.from(dateSelect.options).map(opt => opt.value)

    expect(options).toContain('all')
    expect(options).toContain('today')
    expect(options).toContain('week')
    expect(options).toContain('month')
  })

  it('shows all status filter options', () => {
    render(<TranslationTimeline jobs={mockJobs} showFilters />)

    const statusSelect = screen.getByDisplayValue('All') as HTMLSelectElement
    const options = Array.from(statusSelect.options).map(opt => opt.value)

    expect(options).toContain('all')
    expect(options).toContain('completed')
    expect(options).toContain('running')
    expect(options).toContain('failed')
    expect(options).toContain('cancelled')
    expect(options).toContain('pending')
  })

  it('updates job count when filters change', () => {
    render(<TranslationTimeline jobs={mockJobs} showFilters />)

    expect(screen.getByText('3 jobs')).toBeInTheDocument()

    const statusSelect = screen.getByDisplayValue('All')
    fireEvent.change(statusSelect, { target: { value: 'completed' } })

    expect(screen.getByText('1 job')).toBeInTheDocument()
  })

  it('prevents event bubbling when expanding details', () => {
    const mockOnJobClick = vi.fn()
    render(<TranslationTimeline jobs={mockJobs} onJobClick={mockOnJobClick} />)

    const showDetailsButton = screen.getAllByText('Show details')[0]
    fireEvent.click(showDetailsButton)

    // onJobClick should not be called when clicking expand button
    expect(mockOnJobClick).not.toHaveBeenCalled()
  })
})
