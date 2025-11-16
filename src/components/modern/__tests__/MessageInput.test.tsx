import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageInput } from '../MessageInput';

describe('MessageInput', () => {
  it('renders with placeholder text', () => {
    render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        placeholder="Type a message..."
      />
    );

    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  it('displays the current value', () => {
    render(
      <MessageInput
        value="Hello world"
        onChange={vi.fn()}
        onSend={vi.fn()}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Hello world');
  });

  it('calls onChange when user types', () => {
    const handleChange = vi.fn();
    render(
      <MessageInput
        value=""
        onChange={handleChange}
        onSend={vi.fn()}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New message' } });

    expect(handleChange).toHaveBeenCalledWith('New message');
  });

  it('calls onSend when Enter key is pressed', () => {
    const handleSend = vi.fn();
    render(
      <MessageInput
        value="Test message"
        onChange={vi.fn()}
        onSend={handleSend}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(handleSend).toHaveBeenCalledTimes(1);
  });

  it('does not call onSend when Shift+Enter is pressed', () => {
    const handleSend = vi.fn();
    render(
      <MessageInput
        value="Test message"
        onChange={vi.fn()}
        onSend={handleSend}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(handleSend).not.toHaveBeenCalled();
  });

  it('calls onSend when Send button is clicked', () => {
    const handleSend = vi.fn();
    render(
      <MessageInput
        value="Test message"
        onChange={vi.fn()}
        onSend={handleSend}
      />
    );

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    expect(handleSend).toHaveBeenCalledTimes(1);
  });

  it('disables send button when value is empty', () => {
    render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
      />
    );

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('disables send button when value is only whitespace', () => {
    render(
      <MessageInput
        value="   "
        onChange={vi.fn()}
        onSend={vi.fn()}
      />
    );

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when value has content', () => {
    render(
      <MessageInput
        value="Hello"
        onChange={vi.fn()}
        onSend={vi.fn()}
      />
    );

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).not.toBeDisabled();
  });

  it('shows loading state when isLoading is true', () => {
    render(
      <MessageInput
        value="Test"
        onChange={vi.fn()}
        onSend={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.getByText(/sending/i)).toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    render(
      <MessageInput
        value="Test"
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={true}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('shows character count when value has content', () => {
    render(
      <MessageInput
        value="Hello world"
        onChange={vi.fn()}
        onSend={vi.fn()}
      />
    );

    expect(screen.getByText('11 chars')).toBeInTheDocument();
  });

  it('does not call onSend when disabled', () => {
    const handleSend = vi.fn();
    render(
      <MessageInput
        value="Test"
        onChange={vi.fn()}
        onSend={handleSend}
        disabled={true}
      />
    );

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    expect(handleSend).not.toHaveBeenCalled();
  });
});
