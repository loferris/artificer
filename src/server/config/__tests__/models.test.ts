/**
 * Model configuration tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeModels, getModels, loadModelConfigFromEnv, getModel, isModelAvailable } from '../models';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Model Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env = { ...originalEnv };
    // Clear any cached config (using internal module state reset)
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadModelConfigFromEnv', () => {
    it('should load models from environment variables', () => {
      process.env.CHAT_MODEL = 'anthropic/claude-sonnet-4.5';
      process.env.CHAT_FALLBACK_MODEL = 'deepseek/deepseek-chat-v3.1';

      const config = loadModelConfigFromEnv();

      expect(config.chat).toBe('anthropic/claude-sonnet-4.5');
      expect(config.chatFallback).toBe('deepseek/deepseek-chat-v3.1');
    });

    it('should use fallback models when env vars not set', () => {
      delete process.env.CHAT_MODEL;
      delete process.env.CHAT_FALLBACK_MODEL;

      const config = loadModelConfigFromEnv();

      expect(config.chat).toBeTruthy();
      expect(config.chatFallback).toBeTruthy();
      expect(config.chat).toContain('/');
      expect(config.chatFallback).toContain('/');
    });

    it('should fall back specialized models to base chat models', () => {
      process.env.CHAT_MODEL = 'anthropic/claude-sonnet-4.5';
      process.env.CHAT_FALLBACK_MODEL = 'deepseek/deepseek-chat-v3.1';
      delete process.env.ANALYZER_MODEL;
      delete process.env.ROUTER_MODEL;
      delete process.env.VALIDATOR_MODEL;

      const config = loadModelConfigFromEnv();

      expect(config.analyzer).toBe('deepseek/deepseek-chat-v3.1'); // Falls back to chatFallback
      expect(config.router).toBe('anthropic/claude-sonnet-4.5'); // Falls back to chat
      expect(config.validator).toBe('anthropic/claude-sonnet-4.5'); // Falls back to chat
    });

    it('should load embedding configuration', () => {
      process.env.EMBEDDING_MODEL = 'openai/text-embedding-3-small';
      process.env.EMBEDDING_DIMENSIONS = '1536';

      const config = loadModelConfigFromEnv();

      expect(config.embedding).toBe('openai/text-embedding-3-small');
      expect(config.embeddingDimensions).toBe(1536);
    });

    it('should parse available models from OPENROUTER_MODELS', () => {
      process.env.OPENROUTER_MODELS = 'model1,model2, model3 ';

      const config = loadModelConfigFromEnv();

      expect(config.available).toEqual(['model1', 'model2', 'model3']);
    });
  });

  describe('initializeModels', () => {
    it('should initialize with env vars when dynamic discovery disabled', async () => {
      process.env.USE_DYNAMIC_MODEL_DISCOVERY = 'false';
      process.env.CHAT_MODEL = 'test/model';

      const config = await initializeModels();

      expect(config.chat).toBe('test/model');
    });

    it('should only initialize once', async () => {
      process.env.USE_DYNAMIC_MODEL_DISCOVERY = 'false';

      const config1 = await initializeModels();
      const config2 = await initializeModels();

      expect(config1).toBe(config2);
    });

    it('should validate required models are configured', async () => {
      process.env.USE_DYNAMIC_MODEL_DISCOVERY = 'false';
      // Fallbacks will provide chat and chatFallback

      const config = await initializeModels();

      expect(config.chat).toBeTruthy();
      expect(config.chatFallback).toBeTruthy();
    });
  });

  describe('getModels', () => {
    it('should return initialized config', async () => {
      process.env.USE_DYNAMIC_MODEL_DISCOVERY = 'false';
      process.env.CHAT_MODEL = 'test/model';

      await initializeModels();
      const config = getModels();

      expect(config.chat).toBe('test/model');
    });

    it('should initialize synchronously with env vars if not initialized', () => {
      process.env.CHAT_MODEL = 'test/model';

      const config = getModels();

      expect(config.chat).toBe('test/model');
    });
  });

  describe('getModel', () => {
    it('should return model for specified role', async () => {
      process.env.USE_DYNAMIC_MODEL_DISCOVERY = 'false';
      process.env.CHAT_MODEL = 'test/getmodel-chat';

      await initializeModels();
      const model = getModel('chat');

      // Should return a valid model ID
      expect(model).toBeTruthy();
      expect(typeof model).toBe('string');
    });

    it('should use override when provided', async () => {
      process.env.USE_DYNAMIC_MODEL_DISCOVERY = 'false';

      const model = getModel('chat', 'override/model');

      expect(model).toBe('override/model');
    });

    it('should ignore empty override', async () => {
      process.env.USE_DYNAMIC_MODEL_DISCOVERY = 'false';

      const model = getModel('chat', '');

      // Should return the configured model (not empty)
      expect(model).toBeTruthy();
    });
  });

  describe('isModelAvailable', () => {
    it('should return true for available models', async () => {
      process.env.USE_DYNAMIC_MODEL_DISCOVERY = 'false';
      process.env.CHAT_MODEL = 'test/avail-model';
      process.env.CHAT_FALLBACK_MODEL = 'test/avail-fallback';

      await initializeModels();
      const config = getModels();

      // Check that chat model is in available list
      const isAvailable = isModelAvailable(config.chat);
      expect(isAvailable).toBe(true);
    });

    it('should return false for unavailable models', async () => {
      const isAvailable = isModelAvailable('definitely-not-available-model-12345');

      expect(isAvailable).toBe(false);
    });
  });

  describe('models proxy', () => {
    it('should allow accessing config via proxy', async () => {
      process.env.USE_DYNAMIC_MODEL_DISCOVERY = 'false';
      process.env.CHAT_MODEL = 'test/model';

      const { models } = await import('../models');

      expect(models.chat).toBe('test/model');
    });
  });
});
