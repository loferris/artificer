import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DemoBanner } from '../DemoBanner';

// Mock environment variables
const originalEnv = process.env;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('DemoBanner', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('renders null when demo mode is not enabled', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');

    const { container } = render(<DemoBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the banner when demo mode is enabled after client hydration', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');

    render(<DemoBanner />);

    await waitFor(() => {
      expect(screen.getByText('AI Workflow Engine Demo')).toBeInTheDocument();
    });

    expect(screen.getByText(/Switch themes/)).toBeInTheDocument();
    expect(screen.getByText(/Export conversations/)).toBeInTheDocument();
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('✨')).toBeInTheDocument();
  });

  it('displays the feature hints', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');

    render(<DemoBanner />);

    await waitFor(() => {
      expect(screen.getByText('No API needed')).toBeInTheDocument();
    });
  });
});
