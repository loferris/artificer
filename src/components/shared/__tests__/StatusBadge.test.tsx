import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../StatusBadge'

describe('StatusBadge', () => {
  describe('rendering', () => {
    it('renders pending status correctly', () => {
      render(<StatusBadge status="pending" />)

      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('⏹')).toBeInTheDocument()
    })

    it('renders running status correctly', () => {
      render(<StatusBadge status="running" />)

      expect(screen.getByText('Running')).toBeInTheDocument()
      expect(screen.getByText('⏳')).toBeInTheDocument()
    })

    it('renders completed status correctly', () => {
      render(<StatusBadge status="completed" />)

      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('✓')).toBeInTheDocument()
    })

    it('renders failed status correctly', () => {
      render(<StatusBadge status="failed" />)

      expect(screen.getByText('Failed')).toBeInTheDocument()
      expect(screen.getByText('✗')).toBeInTheDocument()
    })

    it('renders retry status correctly', () => {
      render(<StatusBadge status="retry" />)

      expect(screen.getByText('Retrying')).toBeInTheDocument()
      expect(screen.getByText('🔄')).toBeInTheDocument()
    })

    it('renders idle status correctly', () => {
      render(<StatusBadge status="idle" />)

      expect(screen.getByText('Idle')).toBeInTheDocument()
      expect(screen.getByText('○')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('applies gray variant for pending status', () => {
      const { container } = render(<StatusBadge status="pending" />)

      const badge = container.firstChild
      expect(badge).toHaveClass('bg-gray-50')
    })

    it('applies blue variant for running status', () => {
      const { container } = render(<StatusBadge status="running" />)

      const badge = container.firstChild
      expect(badge).toHaveClass('bg-blue-50')
    })

    it('applies green variant for completed status', () => {
      const { container } = render(<StatusBadge status="completed" />)

      const badge = container.firstChild
      expect(badge).toHaveClass('bg-green-50')
    })

    it('applies red variant for failed status', () => {
      const { container } = render(<StatusBadge status="failed" />)

      const badge = container.firstChild
      expect(badge).toHaveClass('bg-red-50')
    })

    it('applies orange variant for retry status', () => {
      const { container } = render(<StatusBadge status="retry" />)

      const badge = container.firstChild
      expect(badge).toHaveClass('bg-orange-50')
    })

    it('applies custom className', () => {
      const { container } = render(<StatusBadge status="running" className="custom-class" />)

      const badge = container.firstChild
      expect(badge).toHaveClass('custom-class')
    })
  })

  describe('animation', () => {
    it('animates when animated prop is true', () => {
      const { container } = render(<StatusBadge status="running" animated />)

      const badge = container.firstChild
      expect(badge).toHaveClass('animate-pulse')
    })

    it('does not animate by default', () => {
      const { container } = render(<StatusBadge status="running" />)

      const badge = container.firstChild
      expect(badge).not.toHaveClass('animate-pulse')
    })

    it('does not animate when animated is false', () => {
      const { container } = render(<StatusBadge status="running" animated={false} />)

      const badge = container.firstChild
      expect(badge).not.toHaveClass('animate-pulse')
    })

    it('only animates running status even if animated is true', () => {
      const { container: completedContainer } = render(<StatusBadge status="completed" animated />)
      const { container: runningContainer } = render(<StatusBadge status="running" animated />)

      expect(completedContainer.firstChild).not.toHaveClass('animate-pulse')
      expect(runningContainer.firstChild).toHaveClass('animate-pulse')
    })
  })

  describe('accessibility', () => {
    it('renders with proper structure', () => {
      render(<StatusBadge status="running" />)

      const badge = screen.getByText('Running').closest('div')
      expect(badge).toBeInTheDocument()
    })

    it('includes both icon and text', () => {
      render(<StatusBadge status="completed" />)

      expect(screen.getByText('✓')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })
})
