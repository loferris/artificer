import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpecialistCard } from '../SpecialistCard'

describe('SpecialistCard', () => {
  let mockWriteText: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockWriteText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText }
    })
  })

  const mockProps = {
    specialist: 'cultural_specialist' as const,
    translation: 'She bowed deeply to show respect.',
    processingTime: 1234,
    cost: 0.008,
    rating: 4,
    insights: ['Preserved cultural context', 'Maintained formal tone']
  }

  it('renders specialist name and tagline', () => {
    render(<SpecialistCard {...mockProps} />)

    expect(screen.getByText('Cultural Specialist')).toBeInTheDocument()
    expect(screen.getByText('Preserves cultural authenticity')).toBeInTheDocument()
  })

  it('displays translation text', () => {
    render(<SpecialistCard {...mockProps} />)

    expect(screen.getByText('She bowed deeply to show respect.')).toBeInTheDocument()
  })

  it('shows processing stats', () => {
    render(<SpecialistCard {...mockProps} />)

    expect(screen.getByText(/1234ms/)).toBeInTheDocument()
    expect(screen.getByText(/\$0.0080/)).toBeInTheDocument()
    expect(screen.getByText(/4\/5/)).toBeInTheDocument()
  })

  it('renders copy button', () => {
    render(<SpecialistCard {...mockProps} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('shows insights count when collapsed', () => {
    render(<SpecialistCard {...mockProps} />)

    expect(screen.getByText('2 insights')).toBeInTheDocument()
  })

  it('expands to show insight details', () => {
    render(<SpecialistCard {...mockProps} />)

    const showDetailsButton = screen.getByText('Show details')
    fireEvent.click(showDetailsButton)

    expect(screen.getByText('Preserved cultural context')).toBeInTheDocument()
    expect(screen.getByText('Maintained formal tone')).toBeInTheDocument()
  })

  it('calls onRate when rating stars are clicked', () => {
    const onRate = vi.fn()
    render(<SpecialistCard {...mockProps} onRate={onRate} />)

    const stars = screen.getAllByText('★')
    fireEvent.click(stars[2]) // Click 3rd star

    expect(onRate).toHaveBeenCalledWith(3)
  })

  it('highlights selected state', () => {
    const { container } = render(<SpecialistCard {...mockProps} selected />)

    expect(container.firstChild).toHaveClass('ring-2')
  })

  it('applies specialist theme colors', () => {
    const { container } = render(<SpecialistCard {...mockProps} />)

    const header = container.querySelector('[class*="border-b-2"]')
    expect(header).toHaveClass('border-blue-200', 'bg-blue-50')
  })

  it('handles missing optional props gracefully', () => {
    render(<SpecialistCard specialist="prose_stylist" translation="Test text" />)

    expect(screen.getByText('Prose Stylist')).toBeInTheDocument()
    expect(screen.getByText('Test text')).toBeInTheDocument()
  })
})
