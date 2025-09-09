import { describe, it, expect } from 'vitest';
import * as demo from '../demo';

describe('Demo Utilities', () => {
  it('should export demo utility functions', () => {
    expect(demo.isDemoMode).toBeDefined();
    expect(typeof demo.isDemoMode).toBe('function');
    
    expect(demo.isServerSideDemo).toBeDefined();
    expect(typeof demo.isServerSideDemo).toBe('function');
    
    expect(demo.isClientSideDemo).toBeDefined();
    expect(typeof demo.isClientSideDemo).toBe('function');
    
    expect(demo.shouldUseDemoFallback).toBeDefined();
    expect(typeof demo.shouldUseDemoFallback).toBe('function');
  });

  // Note: Detailed testing of the utility functions' internal logic is better handled
  // in integration tests or by mocking the specific behaviors
});