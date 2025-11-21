import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExportDialog } from '../ExportDialog'

describe('ExportDialog', () => {
  const mockOnExport = vi.fn()
  const mockOnOpenChange = vi.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onExport: mockOnExport
  }

  it('renders when open', () => {
    render(<ExportDialog {...defaultProps} />)

    expect(screen.getByText('Export Translation')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ExportDialog {...defaultProps} open={false} />)

    expect(screen.queryByText('Export Translation')).not.toBeInTheDocument()
  })

  it('displays all format options', () => {
    render(<ExportDialog {...defaultProps} />)

    expect(screen.getAllByText('Plain Text').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Markdown').length).toBeGreaterThan(0)
    expect(screen.getAllByText('JSON').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Word Document').length).toBeGreaterThan(0)
  })

  it('selects txt format by default', () => {
    render(<ExportDialog {...defaultProps} />)

    const txtButton = screen.getAllByText('Plain Text')[0].closest('button')
    expect(txtButton).toHaveClass('border-blue-500', 'bg-blue-50')
  })

  it('switches format selection', () => {
    render(<ExportDialog {...defaultProps} />)

    const jsonButton = screen.getByText('JSON').closest('button')
    fireEvent.click(jsonButton!)

    expect(jsonButton).toHaveClass('border-blue-500', 'bg-blue-50')
  })

  it('displays export options checkboxes', () => {
    render(<ExportDialog {...defaultProps} />)

    expect(screen.getByText('Include All Candidates')).toBeInTheDocument()
    expect(screen.getByText('Include Metadata')).toBeInTheDocument()
    expect(screen.getByText('Include Original Text')).toBeInTheDocument()
  })

  it('toggles export options', () => {
    render(<ExportDialog {...defaultProps} />)

    const candidatesCheckbox = screen.getByText('Include All Candidates')
      .closest('label')
      ?.querySelector('input[type="checkbox"]') as HTMLInputElement

    expect(candidatesCheckbox.checked).toBe(false)
    fireEvent.click(candidatesCheckbox)
    expect(candidatesCheckbox.checked).toBe(true)
  })

  it('calls onExport with correct parameters', () => {
    render(<ExportDialog {...defaultProps} />)

    // Select markdown format
    const markdownButton = screen.getByText('Markdown').closest('button')
    fireEvent.click(markdownButton!)

    // Toggle some options
    const metadataCheckbox = screen.getByText('Include Metadata')
      .closest('label')
      ?.querySelector('input[type="checkbox"]')
    fireEvent.click(metadataCheckbox!)

    // Click export
    const exportButton = screen.getByText('Export Markdown')
    fireEvent.click(exportButton)

    expect(mockOnExport).toHaveBeenCalledWith('md', {
      format: 'md',
      includeCandidates: false,
      includeMetadata: true,
      includeOriginal: false
    })
  })

  it('closes dialog after export', () => {
    render(<ExportDialog {...defaultProps} />)

    const exportButton = screen.getByText('Export Plain Text')
    fireEvent.click(exportButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes dialog on cancel', () => {
    render(<ExportDialog {...defaultProps} />)

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows preview of export configuration', () => {
    render(<ExportDialog {...defaultProps} />)

    expect(screen.getByText('Export Preview')).toBeInTheDocument()
    expect(screen.getByText(/Final translation only/)).toBeInTheDocument()
  })

  it('updates preview when options change', () => {
    render(<ExportDialog {...defaultProps} />)

    const candidatesCheckbox = screen.getByText('Include All Candidates')
      .closest('label')
      ?.querySelector('input[type="checkbox"]')
    fireEvent.click(candidatesCheckbox!)

    expect(screen.getByText(/All candidates/)).toBeInTheDocument()
  })

  it('filters formats based on availableFormats prop', () => {
    render(<ExportDialog {...defaultProps} availableFormats={['txt', 'json']} />)

    expect(screen.getAllByText('Plain Text').length).toBeGreaterThan(0)
    expect(screen.getAllByText('JSON').length).toBeGreaterThan(0)
    expect(screen.queryByText('Markdown')).not.toBeInTheDocument()
    expect(screen.queryByText('Word Document')).not.toBeInTheDocument()
  })

  it('shows format icons', () => {
    render(<ExportDialog {...defaultProps} />)

    expect(screen.getByText('📄')).toBeInTheDocument() // txt
    expect(screen.getByText('📝')).toBeInTheDocument() // md
    expect(screen.getByText('{ }')).toBeInTheDocument() // json
    expect(screen.getByText('📘')).toBeInTheDocument() // docx
  })

  it('shows format descriptions', () => {
    render(<ExportDialog {...defaultProps} />)

    expect(screen.getByText('Simple text file, final translation only')).toBeInTheDocument()
    expect(screen.getByText('Formatted markdown with metadata')).toBeInTheDocument()
    expect(screen.getByText('Full pipeline results with all data')).toBeInTheDocument()
    expect(screen.getByText('Formatted document for editing')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <ExportDialog {...defaultProps} className="custom-class" />
    )

    const dialogContent = container.querySelector('.max-w-2xl')
    expect(dialogContent).toHaveClass('custom-class')
  })

  it('shows checkmark on selected format', () => {
    render(<ExportDialog {...defaultProps} />)

    const txtButton = screen.getAllByText('Plain Text')[0].closest('button')
    const checkmark = txtButton?.querySelector('svg')
    expect(checkmark).toBeInTheDocument()
  })

  it('updates export button text with selected format', () => {
    render(<ExportDialog {...defaultProps} />)

    expect(screen.getByText('Export Plain Text')).toBeInTheDocument()

    const jsonButton = screen.getByText('JSON').closest('button')
    fireEvent.click(jsonButton!)

    expect(screen.getByText('Export JSON')).toBeInTheDocument()
  })

  it('shows dialog description', () => {
    render(<ExportDialog {...defaultProps} />)

    expect(screen.getByText('Choose your export format and options')).toBeInTheDocument()
  })

  it('organizes options in sections', () => {
    render(<ExportDialog {...defaultProps} />)

    expect(screen.getByText('Export Format')).toBeInTheDocument()
    expect(screen.getByText('Export Options')).toBeInTheDocument()
  })
})
