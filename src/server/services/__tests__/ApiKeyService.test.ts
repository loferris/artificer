import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiKeyService } from '../auth/ApiKeyService';
import type { PrismaClient } from '@prisma/client';

// Mock the logger
vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ApiKeyService', () => {
  let mockPrisma: any;
  let apiKeyService: ApiKeyService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Prisma client
    mockPrisma = {
      apiKey: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
      },
    };

    apiKeyService = new ApiKeyService(mockPrisma as unknown as PrismaClient);
  });

  describe('create', () => {
    it('generates a new API key with correct format', async () => {
      const mockApiKey = {
        id: 'key-123',
        userId: 'user-1',
        name: 'Test Key',
        keyHash: 'hashed-key',
        expiresAt: null,
        ipWhitelist: [],
        scopes: ['*'],
        createdAt: new Date(),
        lastUsedAt: null,
      };

      mockPrisma.apiKey.create.mockResolvedValue(mockApiKey);

      const result = await apiKeyService.create({
        userId: 'user-1',
        name: 'Test Key',
      });

      expect(result.key).toMatch(/^sk_[a-f0-9]{64}$/);
      expect(result.id).toBe('key-123');
      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Test Key',
          keyHash: expect.any(String),
          expiresAt: undefined,
          ipWhitelist: [],
          scopes: ['*'],
        },
      });
    });

    it('creates API key with custom expiration and scopes', async () => {
      const expiresAt = new Date('2025-12-31');
      const mockApiKey = {
        id: 'key-123',
        userId: 'user-1',
        name: 'Custom Key',
        keyHash: 'hashed-key',
        expiresAt,
        ipWhitelist: ['192.168.1.1'],
        scopes: ['read', 'write'],
        createdAt: new Date(),
        lastUsedAt: null,
      };

      mockPrisma.apiKey.create.mockResolvedValue(mockApiKey);

      const result = await apiKeyService.create({
        userId: 'user-1',
        name: 'Custom Key',
        expiresAt,
        ipWhitelist: ['192.168.1.1'],
        scopes: ['read', 'write'],
      });

      expect(result.key).toMatch(/^sk_/);
      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Custom Key',
          keyHash: expect.any(String),
          expiresAt,
          ipWhitelist: ['192.168.1.1'],
          scopes: ['read', 'write'],
        },
      });
    });
  });

  describe('validate', () => {
    it('validates a valid API key', async () => {
      const mockApiKey = {
        id: 'key-123',
        userId: 'user-1',
        keyHash: 'hashed-key',
        expiresAt: null,
        ipWhitelist: [],
        scopes: ['*'],
        user: { id: 'user-1', email: 'test@example.com' },
      };

      mockPrisma.apiKey.findUnique.mockResolvedValue(mockApiKey);
      mockPrisma.apiKey.update.mockResolvedValue({});

      // Generate a test key to validate
      const testKey = 'sk_' + 'a'.repeat(64);

      const result = await apiKeyService.validate(testKey);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-1');
      expect(result.keyId).toBe('key-123');
      expect(result.scopes).toEqual(['*']);
    });

    it('rejects invalid API key format', async () => {
      const result = await apiKeyService.validate('invalid-key');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key format');
      expect(mockPrisma.apiKey.findUnique).not.toHaveBeenCalled();
    });

    it('rejects empty API key', async () => {
      const result = await apiKeyService.validate('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key format');
    });

    it('rejects non-existent API key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);

      const testKey = 'sk_' + 'b'.repeat(64);
      const result = await apiKeyService.validate(testKey);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('rejects expired API key', async () => {
      const mockApiKey = {
        id: 'key-123',
        userId: 'user-1',
        keyHash: 'hashed-key',
        expiresAt: new Date('2020-01-01'), // Expired
        ipWhitelist: [],
        scopes: ['*'],
        user: { id: 'user-1', email: 'test@example.com' },
      };

      mockPrisma.apiKey.findUnique.mockResolvedValue(mockApiKey);

      const testKey = 'sk_' + 'c'.repeat(64);
      const result = await apiKeyService.validate(testKey);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key expired');
    });

    it('validates IP whitelist - allowed IP', async () => {
      const mockApiKey = {
        id: 'key-123',
        userId: 'user-1',
        keyHash: 'hashed-key',
        expiresAt: null,
        ipWhitelist: ['192.168.1.1', '10.0.0.1'],
        scopes: ['*'],
        user: { id: 'user-1', email: 'test@example.com' },
      };

      mockPrisma.apiKey.findUnique.mockResolvedValue(mockApiKey);
      mockPrisma.apiKey.update.mockResolvedValue({});

      const testKey = 'sk_' + 'd'.repeat(64);
      const result = await apiKeyService.validate(testKey, '192.168.1.1');

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-1');
    });

    it('rejects IP not in whitelist', async () => {
      const mockApiKey = {
        id: 'key-123',
        userId: 'user-1',
        keyHash: 'hashed-key',
        expiresAt: null,
        ipWhitelist: ['192.168.1.1'],
        scopes: ['*'],
        user: { id: 'user-1', email: 'test@example.com' },
      };

      mockPrisma.apiKey.findUnique.mockResolvedValue(mockApiKey);

      const testKey = 'sk_' + 'e'.repeat(64);
      const result = await apiKeyService.validate(testKey, '192.168.1.2');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not whitelisted');
    });

    it('allows any IP when whitelist is empty', async () => {
      const mockApiKey = {
        id: 'key-123',
        userId: 'user-1',
        keyHash: 'hashed-key',
        expiresAt: null,
        ipWhitelist: [],
        scopes: ['*'],
        user: { id: 'user-1', email: 'test@example.com' },
      };

      mockPrisma.apiKey.findUnique.mockResolvedValue(mockApiKey);
      mockPrisma.apiKey.update.mockResolvedValue({});

      const testKey = 'sk_' + 'f'.repeat(64);
      const result = await apiKeyService.validate(testKey, '1.2.3.4');

      expect(result.valid).toBe(true);
    });

    it('updates lastUsedAt timestamp on successful validation', async () => {
      const mockApiKey = {
        id: 'key-123',
        userId: 'user-1',
        keyHash: 'hashed-key',
        expiresAt: null,
        ipWhitelist: [],
        scopes: ['*'],
        user: { id: 'user-1', email: 'test@example.com' },
      };

      mockPrisma.apiKey.findUnique.mockResolvedValue(mockApiKey);
      mockPrisma.apiKey.update.mockResolvedValue({});

      const testKey = 'sk_' + 'g'.repeat(64);
      await apiKeyService.validate(testKey);

      // Give the async update a moment to be called
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-123' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });
  });

  describe('revoke', () => {
    it('revokes an API key by setting expiration to now', async () => {
      mockPrisma.apiKey.update.mockResolvedValue({});

      await apiKeyService.revoke('key-123');

      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-123' },
        data: { expiresAt: expect.any(Date) },
      });
    });
  });

  describe('list', () => {
    it('lists all API keys for a user', async () => {
      const mockKeys = [
        {
          id: 'key-1',
          name: 'Key 1',
          lastUsedAt: new Date(),
          expiresAt: null,
          createdAt: new Date(),
          ipWhitelist: [],
          scopes: ['*'],
        },
        {
          id: 'key-2',
          name: 'Key 2',
          lastUsedAt: null,
          expiresAt: new Date('2025-12-31'),
          createdAt: new Date(),
          ipWhitelist: ['192.168.1.1'],
          scopes: ['read'],
        },
      ];

      mockPrisma.apiKey.findMany.mockResolvedValue(mockKeys);

      const result = await apiKeyService.list('user-1');

      expect(result).toEqual(mockKeys);
      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: {
          id: true,
          name: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
          ipWhitelist: true,
          scopes: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns empty array when user has no keys', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([]);

      const result = await apiKeyService.list('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('permanently deletes an API key', async () => {
      mockPrisma.apiKey.delete.mockResolvedValue({});

      await apiKeyService.delete('key-123');

      expect(mockPrisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: 'key-123' },
      });
    });
  });

  describe('hasScope', () => {
    it('returns true for wildcard scope', () => {
      expect(apiKeyService.hasScope(['*'], 'read')).toBe(true);
      expect(apiKeyService.hasScope(['*'], 'write')).toBe(true);
      expect(apiKeyService.hasScope(['*'], 'admin')).toBe(true);
    });

    it('returns true when scope is in list', () => {
      expect(apiKeyService.hasScope(['read', 'write'], 'read')).toBe(true);
      expect(apiKeyService.hasScope(['read', 'write'], 'write')).toBe(true);
    });

    it('returns false when scope is not in list', () => {
      expect(apiKeyService.hasScope(['read'], 'write')).toBe(false);
      expect(apiKeyService.hasScope(['read', 'write'], 'admin')).toBe(false);
    });

    it('returns false for empty scope list', () => {
      expect(apiKeyService.hasScope([], 'read')).toBe(false);
    });
  });
});
