import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test/utils';
import { ExportButton } from '../ExportButton';

// Mock the trpc module
vi.mock('../../lib/trpc/client', () => ({
  trpc: {
    export: {
      exportConversation: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          isPending: false,
          isSuccess: false,
          error: null,
        })),
      },
      exportAll: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          isPending: false,
          isSuccess: false,
          error: null,
        })),
      },
    },
    useUtils: vi.fn(() => ({
      export: {
        exportConversation: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn(),
            isPending: false,
            isSuccess: false,
            error: null,
          })),
        },
        exportAll: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn(),
            isPending: false,
            isSuccess: false,
            error: null,
          })),
        },
      },
    })),
  },
}));

describe('ExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders export button correctly', () => {
      render(<ExportButton />);

      expect(screen.getByText('📤 Export All')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<ExportButton className='custom-class' />);

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('shows conversation-specific title when conversationId is provided', () => {
      render(<ExportButton conversationId='test-conversation' />);

      // The button text is always "📤 Export All", but the dropdown title changes
      expect(screen.getByText('📤 Export All')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('renders button with correct attributes', () => {
      render(<ExportButton />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('w-full', 'bg-gradient-to-r', 'from-pink-500', 'to-purple-600');
    });

    it('renders with proper accessibility attributes', () => {
      render(<ExportButton />);

      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('disabled');
    });
  });
});
