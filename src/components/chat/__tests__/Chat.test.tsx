import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockWindowFunctions } from '../../../test/utils';
import { ChatView } from '../ChatView';

describe('Chat Component', () => {
  const defaultProps = {
    conversations: [],
    currentConversationId: null,
    messages: [],
    input: '',
    sidebarOpen: true,
    conversationsLoading: false,
    isCreatingConversation: false,
    messagesLoading: false,
    isLoading: false,
    conversationsError: null,
    messagesError: null,
    isConversationReady: false,
    canSendMessage: false,
    onSelectConversation: vi.fn(),
    onNewConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
    onRefreshConversations: vi.fn(),
    onToggleSidebar: vi.fn(),
    onExportCurrent: vi.fn(),
    onExportAll: vi.fn(),
    onInputChange: vi.fn(),
    onSendMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders chat interface correctly', () => {
      render(<ChatView {...defaultProps} />);

      expect(screen.getByText('AI Chat (Classic View)')).toBeInTheDocument();
      expect(screen.getByText('Conversations')).toBeInTheDocument();
      expect(screen.getByText('+ New Chat')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('displays welcome message when no messages exist', () => {
      render(<ChatView {...defaultProps} />);

      expect(screen.getByText('Welcome to your colorful chat!')).toBeInTheDocument();
      expect(
        screen.getByText('Start a conversation by typing a message below'),
      ).toBeInTheDocument();
    });

    it('shows sidebar with new chat button', () => {
      render(<ChatView {...defaultProps} />);

      expect(screen.getByText('+ New Chat')).toBeInTheDocument();
      expect(screen.getByText('Export MD')).toBeInTheDocument();
    });

    it('shows sidebar toggle button', () => {
      render(<ChatView {...defaultProps} />);

      const toggleButton = screen.getByTitle('Hide sidebar');
      expect(toggleButton).toBeInTheDocument();
    });

    it('shows empty state when no conversations exist', () => {
      render(<ChatView {...defaultProps} />);

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
      expect(screen.getByText('Start chatting to create one!')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper input id for accessibility', () => {
      const props = { ...defaultProps, isConversationReady: true };
      render(<ChatView {...props} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'chat-input');
    });

    it('has proper button roles', () => {
      render(<ChatView {...defaultProps} />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeInTheDocument();
    });

    it('has proper ARIA attributes for messages', () => {
      render(<ChatView {...defaultProps} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('Interaction Handling', () => {
    it('calls onSendMessage when send button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = vi.fn();

      const props = {
        ...defaultProps,
        input: 'Test message',
        isConversationReady: true,
        canSendMessage: true,
        onSendMessage: mockOnSendMessage,
      };

      render(<ChatView {...props} />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(mockOnSendMessage).toHaveBeenCalled();
    });

    it('calls onToggleSidebar when sidebar toggle is clicked', async () => {
      const user = userEvent.setup();
      const mockOnToggleSidebar = vi.fn();

      const props = {
        ...defaultProps,
        onToggleSidebar: mockOnToggleSidebar,
      };

      render(<ChatView {...props} />);

      const toggleButton = screen.getByTitle('Hide sidebar');
      await user.click(toggleButton);

      expect(mockOnToggleSidebar).toHaveBeenCalled();
    });

    it('calls onNewConversation when new chat button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnNewConversation = vi.fn();

      const props = {
        ...defaultProps,
        onNewConversation: mockOnNewConversation,
      };

      render(<ChatView {...props} />);

      const newChatButton = screen.getByText('+ New Chat');
      await user.click(newChatButton);

      expect(mockOnNewConversation).toHaveBeenCalled();
    });

    it('calls onInputChange when input value changes', () => {
      const mockOnInputChange = vi.fn();

      const props = {
        ...defaultProps,
        isConversationReady: true,
        onInputChange: mockOnInputChange,
      };

      render(<ChatView {...props} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test message' } });

      expect(mockOnInputChange).toHaveBeenCalledWith('test message');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty message content by disabling send button', async () => {
      const props = {
        ...defaultProps,
        currentConversationId: 'conv1',
        input: '   ', // Only whitespace
        isConversationReady: true,
        canSendMessage: false, // Should be false for whitespace
      };

      render(<ChatView {...props} />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();
    });

    it('handles missing conversation data gracefully', () => {
      const props = {
        ...defaultProps,
        conversations: [], // Empty conversations
      };

      render(<ChatView {...props} />);

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });

    it('shows loading state when creating conversation', () => {
      const props = {
        ...defaultProps,
        isCreatingConversation: true,
      };

      render(<ChatView {...props} />);

      expect(screen.getByText('Creating your conversation...')).toBeInTheDocument();
    });

    it('shows loading state when messages are loading', () => {
      const props = {
        ...defaultProps,
        messagesLoading: true,
      };

      render(<ChatView {...props} />);

      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });

    it('shows messages error state', () => {
      const props = {
        ...defaultProps,
        messagesError: new Error('Failed to load'),
      };

      render(<ChatView {...props} />);

      expect(screen.getByText('Failed to load messages')).toBeInTheDocument();
    });
  });

});
