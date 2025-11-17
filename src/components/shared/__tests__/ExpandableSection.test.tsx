import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExpandableSection } from '../ExpandableSection'

describe('ExpandableSection', () => {
  const preview = <div>Preview content</div>
  const details = <div>Detailed content</div>

  it('renders preview content', () => {
    render(<ExpandableSection preview={preview} details={details} />)

    expect(screen.getByText('Preview content')).toBeInTheDocument()
  })

  it('does not show details by default', () => {
    render(<ExpandableSection preview={preview} details={details} />)

    expect(screen.queryByText('Detailed content')).not.toBeInTheDocument()
  })

  it('shows "Show details" button by default', () => {
    render(<ExpandableSection preview={preview} details={details} />)

    expect(screen.getByText('Show details')).toBeInTheDocument()
  })

  it('shows details when defaultOpen is true', () => {
    render(<ExpandableSection preview={preview} details={details} defaultOpen />)

    expect(screen.getByText('Detailed content')).toBeInTheDocument()
  })

  it('shows "Hide details" button when open', () => {
    render(<ExpandableSection preview={preview} details={details} defaultOpen />)

    expect(screen.getByText('Hide details')).toBeInTheDocument()
  })

  it('toggles details visibility when button is clicked', () => {
    render(<ExpandableSection preview={preview} details={details} />)

    expect(screen.queryByText('Detailed content')).not.toBeInTheDocument()

    const button = screen.getByText('Show details')
    fireEvent.click(button)

    expect(screen.getByText('Detailed content')).toBeInTheDocument()
    expect(screen.getByText('Hide details')).toBeInTheDocument()
  })

  it('collapses when clicking "Hide details"', () => {
    render(<ExpandableSection preview={preview} details={details} defaultOpen />)

    expect(screen.getByText('Detailed content')).toBeInTheDocument()

    const button = screen.getByText('Hide details')
    fireEvent.click(button)

    expect(screen.queryByText('Detailed content')).not.toBeInTheDocument()
    expect(screen.getByText('Show details')).toBeInTheDocument()
  })

  it('uses custom open label', () => {
    render(<ExpandableSection preview={preview} details={details} defaultOpen openLabel="Collapse" />)

    expect(screen.getByText('Collapse')).toBeInTheDocument()
  })

  it('uses custom close label', () => {
    render(<ExpandableSection preview={preview} details={details} closeLabel="Expand" />)

    expect(screen.getByText('Expand')).toBeInTheDocument()
  })

  it('hides labels when showLabel is false', () => {
    render(<ExpandableSection preview={preview} details={details} showLabel={false} />)

    expect(screen.queryByText('Show details')).not.toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<ExpandableSection preview={preview} details={details} className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('applies custom buttonClassName', () => {
    render(<ExpandableSection preview={preview} details={details} buttonClassName="custom-button" />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-button')
  })

  it('applies custom detailsClassName', () => {
    render(<ExpandableSection preview={preview} details={details} defaultOpen detailsClassName="custom-details" />)

    const detailsContainer = screen.getByText('Detailed content').parentElement
    expect(detailsContainer).toHaveClass('custom-details')
  })

  it('rotates arrow icon when toggled', () => {
    const { container } = render(<ExpandableSection preview={preview} details={details} />)

    const arrow = container.querySelector('svg')
    expect(arrow).not.toHaveClass('rotate-180')

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(arrow).toHaveClass('rotate-180')
  })

  it('handles complex preview content', () => {
    const complexPreview = (
      <div>
        <h3>Title</h3>
        <p>Description</p>
      </div>
    )

    render(<ExpandableSection preview={complexPreview} details={details} />)

    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
  })

  it('handles complex details content', () => {
    const complexDetails = (
      <div>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </div>
    )

    render(<ExpandableSection preview={preview} details={complexDetails} defaultOpen />)

    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })
})
