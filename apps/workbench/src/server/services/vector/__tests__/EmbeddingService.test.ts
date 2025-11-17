import { describe, it, expect, vi } from 'vitest';
import { EmbeddingService } from '../EmbeddingService';

describe('EmbeddingService', () => {
  describe('constructor', () => {
    it('should throw without API key', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      expect(() => new EmbeddingService()).toThrow('OpenAI API key is required');

      process.env.OPENAI_API_KEY = originalKey;
    });

    it('should use default model and dimensions', () => {
      const service = new EmbeddingService();
      const modelInfo = service.getModelInfo();

      expect(modelInfo.model).toBe('text-embedding-3-small');
      expect(modelInfo.dimensions).toBe(1536);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate token count', () => {
      const service = new EmbeddingService();

      expect(service.estimateTokens('test')).toBe(1); // 4 chars / 4 ≈ 1
      expect(service.estimateTokens('a'.repeat(100))).toBe(25); // 100 / 4 = 25
    });
  });

  describe('estimateCost', () => {
    it('should estimate embedding cost', () => {
      const service = new EmbeddingService();

      const texts = ['a'.repeat(4000)]; // ~1000 tokens
      const cost = service.estimateCost(texts);

      expect(cost).toBeCloseTo(0.00002, 6); // $0.00002 per 1k tokens
    });
  });

  describe('validateText', () => {
    it('should validate normal text', () => {
      const service = new EmbeddingService();

      const result = service.validateText('Valid text content');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty text', () => {
      const service = new EmbeddingService();

      const result = service.validateText('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Text cannot be empty');
    });

    it('should reject text that is too long', () => {
      const service = new EmbeddingService();

      const longText = 'a'.repeat(40000); // ~10k tokens
      const result = service.validateText(longText);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('getModelInfo', () => {
    it('should return model information', () => {
      const service = new EmbeddingService();

      const info = service.getModelInfo();

      expect(info).toMatchObject({
        model: 'text-embedding-3-small',
        dimensions: 1536,
        maxTokens: 8191,
        costPer1kTokens: 0.00002,
      });
    });
  });
});
