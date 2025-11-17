import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BadgeGroup } from '../BadgeGroup'

describe('BadgeGroup', () => {
  const sampleItems = [
    { label: 'Item 1', variant: 'blue' as const },
    { label: 'Item 2', variant: 'green' as const },
    { label: 'Item 3', variant: 'orange' as const },
    { label: 'Item 4', variant: 'pink' as const },
    { label: 'Item 5', variant: 'purple' as const },
  ]

  it('renders all items when no max is set', () => {
    render(<BadgeGroup items={sampleItems} />)

    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
    expect(screen.getByText('Item 4')).toBeInTheDocument()
    expect(screen.getByText('Item 5')).toBeInTheDocument()
  })

  it('limits displayed items to max when set', () => {
    render(<BadgeGroup items={sampleItems} max={3} />)

    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
    expect(screen.queryByText('Item 4')).not.toBeInTheDocument()
    expect(screen.queryByText('Item 5')).not.toBeInTheDocument()
  })

  it('shows "show more" button when showMore is true and items exceed max', () => {
    render(<BadgeGroup items={sampleItems} max={3} showMore />)

    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('does not show "show more" button when items do not exceed max', () => {
    render(<BadgeGroup items={sampleItems} max={10} showMore />)

    expect(screen.queryByText(/more/)).not.toBeInTheDocument()
  })

  it('expands to show all items when "show more" is clicked', () => {
    render(<BadgeGroup items={sampleItems} max={3} showMore />)

    expect(screen.queryByText('Item 4')).not.toBeInTheDocument()

    const showMoreButton = screen.getByText('+2 more')
    fireEvent.click(showMoreButton)

    expect(screen.getByText('Item 4')).toBeInTheDocument()
    expect(screen.getByText('Item 5')).toBeInTheDocument()
  })

  it('shows "show less" button after expanding', () => {
    render(<BadgeGroup items={sampleItems} max={3} showMore />)

    const showMoreButton = screen.getByText('+2 more')
    fireEvent.click(showMoreButton)

    expect(screen.getByText('Show less')).toBeInTheDocument()
    expect(screen.queryByText('+2 more')).not.toBeInTheDocument()
  })

  it('collapses back to limited view when "show less" is clicked', () => {
    render(<BadgeGroup items={sampleItems} max={3} showMore />)

    fireEvent.click(screen.getByText('+2 more'))
    expect(screen.getByText('Item 4')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Show less'))
    expect(screen.queryByText('Item 4')).not.toBeInTheDocument()
  })

  it('renders items with icons when provided', () => {
    const itemsWithIcons = [
      { label: 'Korean', variant: 'blue' as const, icon: '🇰🇷' },
      { label: 'English', variant: 'green' as const, icon: '🇬🇧' },
    ]

    render(<BadgeGroup items={itemsWithIcons} />)

    expect(screen.getByText('🇰🇷')).toBeInTheDocument()
    expect(screen.getByText('🇬🇧')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<BadgeGroup items={sampleItems} className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles empty items array', () => {
    const { container } = render(<BadgeGroup items={[]} />)

    expect(container.firstChild).toBeInTheDocument()
    expect(container.firstChild?.childNodes.length).toBe(0)
  })

  it('handles single item', () => {
    render(<BadgeGroup items={[{ label: 'Single Item', variant: 'blue' }]} />)

    expect(screen.getByText('Single Item')).toBeInTheDocument()
  })

  it('does not show "show more" if showMore is false', () => {
    render(<BadgeGroup items={sampleItems} max={3} showMore={false} />)

    expect(screen.queryByText(/more/)).not.toBeInTheDocument()
  })
})
