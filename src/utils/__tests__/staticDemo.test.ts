import { describe, it, expect } from 'vitest';
import * as staticDemo from '../staticDemo';

describe('Static Demo Utilities', () => {
  it('should export static demo utility functions', () => {
    expect(staticDemo.isStaticDemo).toBeDefined();
    expect(typeof staticDemo.isStaticDemo).toBe('function');
    
    expect(staticDemo.initializeStaticDemo).toBeDefined();
    expect(typeof staticDemo.initializeStaticDemo).toBe('function');
    
    expect(staticDemo.getStaticDemoData).toBeDefined();
    expect(typeof staticDemo.getStaticDemoData).toBe('function');
    
    expect(staticDemo.generateDemoResponse).toBeDefined();
    expect(typeof staticDemo.generateDemoResponse).toBe('function');
  });

  it('should export demo data', () => {
    expect(Array.isArray(staticDemo.DEMO_CONVERSATIONS)).toBe(true);
    expect(Array.isArray(staticDemo.DEMO_MESSAGES)).toBe(true);
    expect(staticDemo.DEMO_CONVERSATIONS.length).toBeGreaterThan(0);
    expect(staticDemo.DEMO_MESSAGES.length).toBeGreaterThan(0);
  });

  // Note: Detailed testing of the utility functions' internal logic is better handled
  // in integration tests or by mocking the specific behaviors
});