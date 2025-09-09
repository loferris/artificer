import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DemoBanner } from '../DemoBanner';

// Mock environment variables
const originalEnv = process.env;

describe('DemoBanner', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('renders null when not in production and demo mode is not enabled', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_DEMO_MODE = undefined;
    
    const { container } = render(<DemoBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the banner when in production', () => {
    process.env.NODE_ENV = 'production';
    
    render(<DemoBanner />);
    
    expect(screen.getByText(/Demo Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/This showcases the chat interface/i)).toBeInTheDocument();
    expect(screen.getByText(/🎉/)).toBeInTheDocument();
    expect(screen.getByText(/✨/)).toBeInTheDocument();
  });

  it('renders the banner when demo mode is explicitly enabled', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    
    render(<DemoBanner />);
    
    expect(screen.getByText(/Demo Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/This showcases the chat interface/i)).toBeInTheDocument();
  });

  it('displays the full message with feature hints', () => {
    process.env.NODE_ENV = 'production';
    
    render(<DemoBanner />);
    
    expect(screen.getByText(/Try asking about features or exporting conversations!/i)).toBeInTheDocument();
  });
});