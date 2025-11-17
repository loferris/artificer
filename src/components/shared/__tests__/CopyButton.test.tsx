import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CopyButton } from '../CopyButton'

describe('CopyButton', () => {
  let mockWriteText: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockWriteText = vi.fn().mockResolvedValue(undefined)

    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText
      }
    })

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders with copy icon and label by default', () => {
    render(<CopyButton text="test text" />)

    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('Copy')).toBeInTheDocument()
  })

  it('renders without label when showLabel is false', () => {
    render(<CopyButton text="test text" showLabel={false} />)

    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.queryByText('Copy')).not.toBeInTheDocument()
  })

  it('copies text to clipboard when clicked', async () => {
    render(<CopyButton text="test text to copy" />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('test text to copy')
    })
  })

  it('shows "Copied!" after successful copy', async () => {
    render(<CopyButton text="test text" />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })
  })

  it('resets to "Copy" after timeout', async () => {
    render(<CopyButton text="test text" />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })

    vi.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText('Copy')).toBeInTheDocument()
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
    })
  })

  it('applies custom className', () => {
    render(<CopyButton text="test" className="custom-class" />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('applies outline variant by default', () => {
    render(<CopyButton text="test" />)

    const button = screen.getByRole('button')
    expect(button.className).toContain('border')
  })

  it('applies custom variant', () => {
    render(<CopyButton text="test" variant="ghost" />)

    const button = screen.getByRole('button')
    // Ghost variant should not have border
    expect(button.className).toContain('hover:bg')
  })

  it('applies custom size', () => {
    render(<CopyButton text="test" size="sm" />)

    const button = screen.getByRole('button')
    expect(button.className).toContain('h-8')
  })

  it('shows green background when copied', async () => {
    render(<CopyButton text="test text" />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(button.className).toContain('bg-green-50')
    })
  })

  it('handles multiple clicks correctly', async () => {
    render(<CopyButton text="test text" />)

    const button = screen.getByRole('button')

    fireEvent.click(button)
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })

    fireEvent.click(button)
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(2)
    })
  })

  it('renders checkmark icon when copied', async () => {
    render(<CopyButton text="test text" />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      const svg = button.querySelector('svg')
      expect(svg).toBeInTheDocument()
      // Checkmark has fillRule attribute
      expect(svg?.querySelector('[fill-rule]')).toBeInTheDocument()
    })
  })

  it('renders copy icon initially', () => {
    render(<CopyButton text="test text" />)

    const button = screen.getByRole('button')
    const svg = button.querySelector('svg')

    expect(svg).toBeInTheDocument()
    // Copy icon has stroke attribute
    expect(svg?.getAttribute('stroke')).toBe('currentColor')
  })
})
