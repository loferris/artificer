import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageList, type Message } from '../MessageList';

describe('MessageList', () => {
  const mockMessages: Message[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello, how are you?',
      timestamp: new Date('2024-01-01T10:00:00'),
    },
    {
      id: '2',
      role: 'assistant',
      content: 'I am doing well, thank you!',
      timestamp: new Date('2024-01-01T10:01:00'),
    },
  ];

  it('renders empty state when no messages', () => {
    render(<MessageList messages={[]} />);

    expect(screen.getByText(/start a conversation/i)).toBeInTheDocument();
  });

  it('renders all messages', () => {
    render(<MessageList messages={mockMessages} />);

    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument();
  });

  it('displays user messages with correct styling', () => {
    render(<MessageList messages={mockMessages} />);

    const userMessage = screen.getByText('Hello, how are you?').closest('div');
    expect(userMessage).toHaveClass('bg-blue-600');
  });

  it('displays assistant messages with correct styling', () => {
    render(<MessageList messages={mockMessages} />);

    const assistantMessage = screen.getByText('I am doing well, thank you!').closest('div');
    expect(assistantMessage).toHaveClass('bg-white');
  });

  it('shows loading indicator when isLoading is true', () => {
    render(<MessageList messages={[]} isLoading={true} />);

    expect(screen.getByText(/ai is thinking/i)).toBeInTheDocument();
  });

  it('displays RAG sources when available', () => {
    const messagesWithRAG: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Based on the documentation...',
        timestamp: new Date(),
        ragSources: [
          {
            filename: 'README.md',
            content: 'This is the documentation',
            score: 0.87,
          },
        ],
      },
    ];

    render(<MessageList messages={messagesWithRAG} />);

    expect(screen.getByText(/README.md/)).toBeInTheDocument();
  });

  it('expands RAG context when clicked', () => {
    const messagesWithRAG: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Based on the documentation...',
        timestamp: new Date(),
        ragSources: [
          {
            filename: 'README.md',
            content: 'This is the documentation content that should be visible when expanded',
            score: 0.87,
          },
        ],
      },
    ];

    render(<MessageList messages={messagesWithRAG} />);

    // Initially, detailed content should not be visible
    expect(screen.queryByText(/87% relevance/)).not.toBeInTheDocument();

    // Click to expand
    const sourcesButton = screen.getByRole('button', { name: /sources:/i });
    fireEvent.click(sourcesButton);

    // Now detailed content should be visible
    expect(screen.getByText(/87% relevance/)).toBeInTheDocument();
  });

  it('displays message timestamps', () => {
    const messagesWithTime: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Test',
        timestamp: new Date('2024-01-01T14:30:00'),
      },
    ];

    render(<MessageList messages={messagesWithTime} />);

    // Check for time display (format depends on locale, but should be there)
    const timeElements = screen.getAllByText(/\d{1,2}:\d{2}/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('displays message metadata (model, cost, tokens) when available', () => {
    const messagesWithMetadata: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Response',
        timestamp: new Date(),
        model: 'gpt-4',
        cost: 0.0042,
        tokens: 150,
      },
    ];

    render(<MessageList messages={messagesWithMetadata} />);

    expect(screen.getByText(/gpt-4/)).toBeInTheDocument();
    expect(screen.getByText(/150 tokens/)).toBeInTheDocument();
    expect(screen.getByText(/\$0.0042/)).toBeInTheDocument();
  });

  it('displays multiple RAG sources', () => {
    const messagesWithMultipleRAG: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Based on multiple sources...',
        timestamp: new Date(),
        ragSources: [
          {
            filename: 'README.md',
            content: 'Content 1',
            score: 0.87,
          },
          {
            filename: 'docs.md',
            content: 'Content 2',
            score: 0.74,
          },
        ],
      },
    ];

    render(<MessageList messages={messagesWithMultipleRAG} />);

    expect(screen.getByText(/README.md, docs.md/)).toBeInTheDocument();

    // Expand to see both sources
    const sourcesButton = screen.getByRole('button', { name: /sources:/i });
    fireEvent.click(sourcesButton);

    expect(screen.getByText(/87% relevance/)).toBeInTheDocument();
    expect(screen.getByText(/74% relevance/)).toBeInTheDocument();
  });

  it('hides RAG context when hide button is clicked', () => {
    const messagesWithRAG: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Based on the documentation...',
        timestamp: new Date(),
        ragSources: [
          {
            filename: 'README.md',
            content: 'Documentation content',
            score: 0.87,
          },
        ],
      },
    ];

    render(<MessageList messages={messagesWithRAG} />);

    // Expand
    const sourcesButton = screen.getByRole('button', { name: /sources:/i });
    fireEvent.click(sourcesButton);
    expect(screen.getByText(/87% relevance/)).toBeInTheDocument();

    // Hide
    const hideButton = screen.getByRole('button', { name: /hide context/i });
    fireEvent.click(hideButton);
    expect(screen.queryByText(/87% relevance/)).not.toBeInTheDocument();
  });
});
