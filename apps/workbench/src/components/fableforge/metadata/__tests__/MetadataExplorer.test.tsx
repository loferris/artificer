import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MetadataExplorer } from '../MetadataExplorer'

describe('MetadataExplorer', () => {
  const mockMetadata = {
    characters: [
      {
        name: 'Keiko',
        traits: ['respectful', 'traditional'],
        voiceStyle: 'Formal, polite',
        dialogueSamples: ['Good morning, honored guest.']
      }
    ],
    culturalTerms: [
      {
        term: 'Sensei',
        explanation: 'Teacher or master',
        context: 'Used to address respected educators'
      }
    ],
    relationships: [
      {
        from: 'Keiko',
        to: 'Master',
        type: 'student-teacher',
        dynamics: 'Respectful and formal'
      }
    ],
    scene: {
      setting: 'Traditional Japanese dojo',
      tone: 'Respectful',
      timeOfDay: 'Morning'
    }
  }

  it('renders tab navigation', () => {
    render(<MetadataExplorer metadata={mockMetadata} />)

    expect(screen.getByText('Characters')).toBeInTheDocument()
    expect(screen.getByText('Cultural Terms')).toBeInTheDocument()
    expect(screen.getByText('Relationships')).toBeInTheDocument()
    expect(screen.getByText('Scene')).toBeInTheDocument()
  })

  it('shows Characters tab by default', () => {
    render(<MetadataExplorer metadata={mockMetadata} />)

    expect(screen.getByText('Keiko')).toBeInTheDocument()
    expect(screen.getByText('respectful')).toBeInTheDocument()
  })

  it('switches to Cultural Terms tab', () => {
    render(<MetadataExplorer metadata={mockMetadata} />)

    const culturalTab = screen.getByText('Cultural Terms')
    fireEvent.click(culturalTab)

    expect(screen.getByText('Sensei')).toBeInTheDocument()
    expect(screen.getByText('Teacher or master')).toBeInTheDocument()
  })

  it('switches to Relationships tab', () => {
    render(<MetadataExplorer metadata={mockMetadata} />)

    const relationshipsTab = screen.getByText('Relationships')
    fireEvent.click(relationshipsTab)

    expect(screen.getByText('Keiko')).toBeInTheDocument()
    expect(screen.getByText('Master')).toBeInTheDocument()
    expect(screen.getByText('student-teacher')).toBeInTheDocument()
  })

  it('switches to Scene tab', () => {
    render(<MetadataExplorer metadata={mockMetadata} />)

    const sceneTab = screen.getByText('Scene')
    fireEvent.click(sceneTab)

    expect(screen.getByText('Traditional Japanese dojo')).toBeInTheDocument()
    expect(screen.getByText('Respectful')).toBeInTheDocument()
  })

  it('highlights active tab', () => {
    render(<MetadataExplorer metadata={mockMetadata} />)

    const charactersTab = screen.getByText('Characters').closest('button')
    expect(charactersTab).toHaveClass('bg-blue-50', 'text-blue-700')
  })

  it('displays character traits as badges', () => {
    render(<MetadataExplorer metadata={mockMetadata} />)

    expect(screen.getByText('respectful')).toBeInTheDocument()
    expect(screen.getByText('traditional')).toBeInTheDocument()
  })

  it('shows character dialogue samples', () => {
    render(<MetadataExplorer metadata={mockMetadata} />)

    expect(screen.getByText('Good morning, honored guest.')).toBeInTheDocument()
  })

  it('displays cultural term context', () => {
    render(<MetadataExplorer metadata={mockMetadata} />)

    const culturalTab = screen.getByText('Cultural Terms')
    fireEvent.click(culturalTab)

    expect(screen.getByText('Used to address respected educators')).toBeInTheDocument()
  })

  it('shows relationship dynamics', () => {
    render(<MetadataExplorer metadata={mockMetadata} />)

    const relationshipsTab = screen.getByText('Relationships')
    fireEvent.click(relationshipsTab)

    expect(screen.getByText('Respectful and formal')).toBeInTheDocument()
  })

  it('handles empty characters array', () => {
    const emptyMetadata = {
      ...mockMetadata,
      characters: []
    }

    render(<MetadataExplorer metadata={emptyMetadata} />)

    expect(screen.getByText('No characters defined')).toBeInTheDocument()
  })

  it('handles empty cultural terms', () => {
    const emptyMetadata = {
      ...mockMetadata,
      culturalTerms: []
    }

    render(<MetadataExplorer metadata={emptyMetadata} />)

    const culturalTab = screen.getByText('Cultural Terms')
    fireEvent.click(culturalTab)

    expect(screen.getByText('No cultural terms defined')).toBeInTheDocument()
  })

  it('handles empty relationships', () => {
    const emptyMetadata = {
      ...mockMetadata,
      relationships: []
    }

    render(<MetadataExplorer metadata={emptyMetadata} />)

    const relationshipsTab = screen.getByText('Relationships')
    fireEvent.click(relationshipsTab)

    expect(screen.getByText('No relationships defined')).toBeInTheDocument()
  })

  it('handles missing scene data', () => {
    const emptyMetadata = {
      ...mockMetadata,
      scene: undefined
    }

    render(<MetadataExplorer metadata={emptyMetadata} />)

    const sceneTab = screen.getByText('Scene')
    fireEvent.click(sceneTab)

    expect(screen.getByText('No scene context available')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <MetadataExplorer metadata={mockMetadata} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders multiple characters', () => {
    const multiCharMetadata = {
      ...mockMetadata,
      characters: [
        ...mockMetadata.characters,
        {
          name: 'Master',
          traits: ['wise', 'patient'],
          voiceStyle: 'Calm, authoritative'
        }
      ]
    }

    render(<MetadataExplorer metadata={multiCharMetadata} />)

    expect(screen.getByText('Keiko')).toBeInTheDocument()
    expect(screen.getByText('Master')).toBeInTheDocument()
  })

  it('renders multiple cultural terms', () => {
    const multiTermMetadata = {
      ...mockMetadata,
      culturalTerms: [
        ...mockMetadata.culturalTerms,
        {
          term: 'Dojo',
          explanation: 'Training hall',
          context: 'Place for martial arts practice'
        }
      ]
    }

    render(<MetadataExplorer metadata={multiTermMetadata} />)

    const culturalTab = screen.getByText('Cultural Terms')
    fireEvent.click(culturalTab)

    expect(screen.getByText('Sensei')).toBeInTheDocument()
    expect(screen.getByText('Dojo')).toBeInTheDocument()
  })

  it('handles optional character properties', () => {
    const minimalCharMetadata = {
      ...mockMetadata,
      characters: [
        {
          name: 'MinimalChar'
        }
      ]
    }

    render(<MetadataExplorer metadata={minimalCharMetadata} />)

    expect(screen.getByText('MinimalChar')).toBeInTheDocument()
  })

  it('shows tab icons', () => {
    render(<MetadataExplorer metadata={mockMetadata} />)

    // Each tab should have an emoji icon
    expect(screen.getByText('👥')).toBeInTheDocument() // Characters
    expect(screen.getByText('📚')).toBeInTheDocument() // Cultural Terms
    expect(screen.getByText('🔗')).toBeInTheDocument() // Relationships
    expect(screen.getByText('🎬')).toBeInTheDocument() // Scene
  })
})
