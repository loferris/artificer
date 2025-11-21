import { describe, it, expect } from 'vitest';

// Test SSE format validation
describe('SSE Format Validation', () => {
  // Helper function to simulate SSE writing
  const writeSSEData = (data: any, event?: string): string => {
    let result = '';
    if (event) {
      result += `event: ${event}\n`;
    }
    result += `data: ${JSON.stringify(data)}\n\n`;
    return result;
  };

  const writeSSEComment = (comment: string): string => {
    return `: ${comment}\n\n`;
  };

  describe('SSE Data Format', () => {
    it('should format connection events correctly', () => {
      const data = { type: 'connected', timestamp: '2025-09-10T21:52:16.212Z' };
      const sse = writeSSEData(data, 'connection');

      expect(sse).toBe(
        'event: connection\ndata: {"type":"connected","timestamp":"2025-09-10T21:52:16.212Z"}\n\n',
      );

      // Verify it follows SSE spec
      expect(sse).toMatch(/^event: \w+\n/);
      expect(sse).toMatch(/data: \{.*\}\n\n$/);
    });

    it('should format chunk events correctly', () => {
      const data = { content: 'Hello world', finished: false };
      const sse = writeSSEData(data, 'chunk');

      expect(sse).toBe('event: chunk\ndata: {"content":"Hello world","finished":false}\n\n');
    });

    it('should format completion events correctly', () => {
      const data = { type: 'completed', timestamp: '2025-09-10T21:52:16.214Z' };
      const sse = writeSSEData(data, 'complete');

      expect(sse).toBe(
        'event: complete\ndata: {"type":"completed","timestamp":"2025-09-10T21:52:16.214Z"}\n\n',
      );
    });

    it('should format error events correctly', () => {
      const data = {
        type: 'error',
        error: 'Conversation not found',
        timestamp: '2025-09-10T21:52:16.214Z',
      };
      const sse = writeSSEData(data, 'error');

      expect(sse).toContain('event: error');
      expect(sse).toContain('"error":"Conversation not found"');
    });

    it('should format comments correctly', () => {
      const comment = writeSSEComment('SSE stream connected');

      expect(comment).toBe(': SSE stream connected\n\n');
      expect(comment).toMatch(/^: .+\n\n$/);
    });
  });

  describe('SSE Stream Structure', () => {
    it('should create a valid SSE stream sequence', () => {
      const stream = [
        writeSSEComment('SSE stream connected'),
        writeSSEData({ type: 'connected', timestamp: new Date().toISOString() }, 'connection'),
        writeSSEData({ content: 'Hello', finished: false }, 'chunk'),
        writeSSEData({ content: ' world', finished: false }, 'chunk'),
        writeSSEData({ content: '!', finished: true }, 'chunk'),
        writeSSEData({ type: 'completed', timestamp: new Date().toISOString() }, 'complete'),
        writeSSEComment('Stream ended'),
      ].join('');

      // Verify stream contains all required parts
      expect(stream).toContain(': SSE stream connected');
      expect(stream).toContain('event: connection');
      expect(stream).toContain('event: chunk');
      expect(stream).toContain('event: complete');
      expect(stream).toContain(': Stream ended');

      // Verify proper SSE formatting
      const lines = stream.split('\n');
      const eventLines = lines.filter((line) => line.startsWith('event: '));
      const dataLines = lines.filter((line) => line.startsWith('data: '));
      const commentLines = lines.filter((line) => line.startsWith(': '));

      expect(eventLines.length).toBeGreaterThan(0);
      expect(dataLines.length).toBeGreaterThan(0);
      expect(commentLines.length).toBeGreaterThan(0);

      // Each event should be followed by data
      expect(eventLines.length).toBe(dataLines.length);
    });
  });

  describe('JSON Validation', () => {
    it('should produce valid JSON in data fields', () => {
      const testData = [
        { content: 'Simple text', finished: false },
        { content: 'Text with "quotes"', finished: false },
        { content: 'Text with special chars: \n\t\r', finished: false },
        { content: '', finished: true, error: 'Empty content error' },
        {
          content: 'Final',
          finished: true,
          metadata: {
            messageId: 'msg-123',
            tokenCount: 15,
            cost: 0.001,
          },
        },
      ];

      for (const data of testData) {
        const sse = writeSSEData(data, 'chunk');
        const dataLine = sse.split('\n').find((line) => line.startsWith('data: '));

        expect(dataLine).toBeDefined();

        const jsonData = dataLine!.substring(6); // Remove 'data: '

        // Should be valid JSON
        expect(() => JSON.parse(jsonData)).not.toThrow();

        // Should match original data
        expect(JSON.parse(jsonData)).toEqual(data);
      }
    });

    it('should handle special characters correctly', () => {
      const specialData = {
        content: 'Special chars: \n\r\t"quotes"\\backslash/forward',
        finished: false,
        metadata: {
          unicode: '🚀 Unicode characters ñáéíóú',
          emoji: '😀😂🎉',
        },
      };

      const sse = writeSSEData(specialData, 'chunk');
      const dataLine = sse.split('\n').find((line) => line.startsWith('data: '));
      const parsed = JSON.parse(dataLine!.substring(6));

      expect(parsed).toEqual(specialData);
      expect(parsed.content).toContain('\n');
      expect(parsed.content).toContain('"quotes"');
      expect(parsed.metadata.unicode).toContain('🚀');
    });
  });

  describe('Error Stream Validation', () => {
    it('should create valid error stream', () => {
      const errorStream = [
        writeSSEComment('SSE stream connected'),
        writeSSEData({ type: 'connected', timestamp: new Date().toISOString() }, 'connection'),
        writeSSEData(
          {
            content: '',
            finished: true,
            error: 'Conversation not found',
          },
          'chunk',
        ),
        writeSSEData(
          {
            type: 'error',
            error: 'Service error',
            timestamp: new Date().toISOString(),
          },
          'error',
        ),
        writeSSEComment('Stream ended'),
      ].join('');

      expect(errorStream).toContain('event: error');
      expect(errorStream).toContain('"error":"Conversation not found"');
      expect(errorStream).toContain('"error":"Service error"');
    });
  });
});
