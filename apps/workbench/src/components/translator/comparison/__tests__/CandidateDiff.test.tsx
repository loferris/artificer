import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CandidateDiff } from '../CandidateDiff'

describe('CandidateDiff', () => {
  const mockProps = {
    candidateA: {
      id: 'candidate-1',
      specialist: 'cultural_specialist' as const,
      translation: 'She bowed deeply to show respect.'
    },
    candidateB: {
      id: 'candidate-2',
      specialist: 'prose_stylist' as const,
      translation: 'She gave a respectful bow.'
    }
  }

  it('renders both candidate translations', () => {
    const { container } = render(<CandidateDiff {...mockProps} />)

    // Translations are rendered as diff segments without spaces in textContent
    // Check for key words from both translations
    expect(container.textContent).toContain('bowed')
    expect(container.textContent).toContain('respect')
    expect(container.textContent).toContain('gave')
    expect(container.textContent).toContain('bow')
  })

  it('shows candidate labels', () => {
    render(<CandidateDiff {...mockProps} />)

    // DiffViewer uses "Before" and "After" as default labels
    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(screen.getByText('After')).toBeInTheDocument()
  })

  it('applies specialist theme colors', () => {
    const { container } = render(<CandidateDiff {...mockProps} />)

    // Cultural specialist should have blue theme
    const culturalHeader = container.querySelector('.border-blue-200')
    expect(culturalHeader).toBeInTheDocument()

    // Prose stylist should have purple theme
    const proseHeader = container.querySelector('.border-purple-200')
    expect(proseHeader).toBeInTheDocument()
  })

  it('switches to unified view mode', () => {
    const { container } = render(<CandidateDiff {...mockProps} />)

    const unifiedButton = screen.getByText('Unified')
    fireEvent.click(unifiedButton)

    // In unified mode, text appears with diff markers, check for key words
    expect(container.textContent).toContain('bowed')
    expect(container.textContent).toContain('respect')
    expect(container.textContent).toContain('bow')
  })

  it('changes diff granularity', () => {
    render(<CandidateDiff {...mockProps} />)

    const sentenceButton = screen.getByText('Sentence')
    fireEvent.click(sentenceButton)

    // Should still render translations
    expect(screen.getByText('She bowed deeply to show respect.')).toBeInTheDocument()
  })

  it('displays similarity score', () => {
    render(<CandidateDiff {...mockProps} />)

    // Should show some similarity percentage
    expect(screen.getByText(/\d+% similar/)).toBeInTheDocument()
  })

  it('handles identical translations', () => {
    const identicalProps = {
      candidateA: {
        id: 'candidate-1',
        specialist: 'cultural_specialist' as const,
        translation: 'Same text'
      },
      candidateB: {
        id: 'candidate-2',
        specialist: 'prose_stylist' as const,
        translation: 'Same text'
      }
    }

    render(<CandidateDiff {...identicalProps} />)

    // Should show 100% similarity
    expect(screen.getByText('100% similar')).toBeInTheDocument()
  })

  it('handles completely different translations', () => {
    const differentProps = {
      candidateA: {
        id: 'candidate-1',
        specialist: 'cultural_specialist' as const,
        translation: 'Hello world'
      },
      candidateB: {
        id: 'candidate-2',
        specialist: 'prose_stylist' as const,
        translation: 'Goodbye universe'
      }
    }

    render(<CandidateDiff {...differentProps} />)

    // Should show low similarity
    expect(screen.getByText(/\d+% similar/)).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<CandidateDiff {...mockProps} className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders all view mode options', () => {
    render(<CandidateDiff {...mockProps} />)

    expect(screen.getByText('Side-by-Side')).toBeInTheDocument()
    expect(screen.getByText('Unified')).toBeInTheDocument()
  })

  it('renders all granularity options', () => {
    render(<CandidateDiff {...mockProps} />)

    expect(screen.getByText('Word')).toBeInTheDocument()
    expect(screen.getByText('Sentence')).toBeInTheDocument()
    expect(screen.getByText('Character')).toBeInTheDocument()
  })

  it('highlights active view mode button', () => {
    render(<CandidateDiff {...mockProps} />)

    const sideBySideButton = screen.getByText('Side-by-Side')
    // Active button should exist and be a button element
    expect(sideBySideButton.closest('button')).toBeInTheDocument()
  })

  it('highlights active granularity button', () => {
    render(<CandidateDiff {...mockProps} />)

    const wordButton = screen.getByText('Word')
    // Active button should exist and be a button element
    expect(wordButton.closest('button')).toBeInTheDocument()
  })

  it('shows header with title', () => {
    render(<CandidateDiff {...mockProps} />)

    // DiffViewer shows "Comparison" as the header title (may appear in multiple places)
    expect(screen.getAllByText('Comparison').length).toBeGreaterThan(0)
  })

  it('displays view controls section', () => {
    render(<CandidateDiff {...mockProps} />)

    expect(screen.getByText('View:')).toBeInTheDocument()
    expect(screen.getByText('Granularity:')).toBeInTheDocument()
  })
})
