import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authRouter } from '../auth';
import { TRPCError } from '@trpc/server';

// Mock the logger
vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Auth Router', () => {
  let mockContext: any;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      user: {
        findUnique: vi.fn(),
      },
    };

    // Base context without authentication
    mockContext = {
      req: {
        headers: {
          'user-agent': 'test-agent',
        },
      },
      res: {
        setHeader: vi.fn(),
      },
      user: null,
      authenticatedUser: null,
      clientIp: '192.168.1.1',
      db: mockDb,
    };
  });

  describe('public endpoint', () => {
    it('returns public message without authentication', async () => {
      const caller = authRouter.createCaller(mockContext);
      const result = await caller.public();

      expect(result.message).toBe('This is a public endpoint - no authentication required');
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });

    it('works with any client IP', async () => {
      mockContext.clientIp = '10.0.0.1';
      const caller = authRouter.createCaller(mockContext);
      const result = await caller.public();

      expect(result.message).toBeDefined();
    });
  });

  describe('protected endpoint', () => {
    it('returns authenticated user info when authenticated', async () => {
      const authenticatedContext = {
        ...mockContext,
        authenticatedUser: {
          id: 'user-123',
          keyId: 'key-456',
          scopes: ['read', 'write'],
        },
      };

      const caller = authRouter.createCaller(authenticatedContext);
      const result = await caller.protected();

      expect(result.message).toBe('Successfully authenticated!');
      expect(result.userId).toBe('user-123');
      expect(result.keyId).toBe('key-456');
      expect(result.scopes).toEqual(['read', 'write']);
      expect(result.clientIp).toBe('192.168.1.1');
      expect(result.timestamp).toBeDefined();
    });

    it('includes wildcard scope when present', async () => {
      const authenticatedContext = {
        ...mockContext,
        authenticatedUser: {
          id: 'user-789',
          keyId: 'key-101',
          scopes: ['*'],
        },
      };

      const caller = authRouter.createCaller(authenticatedContext);
      const result = await caller.protected();

      expect(result.scopes).toEqual(['*']);
    });

    it('returns undefined values when user is not authenticated', async () => {
      const caller = authRouter.createCaller(mockContext);
      const result = await caller.protected();

      expect(result.userId).toBeUndefined();
      expect(result.keyId).toBeUndefined();
      expect(result.scopes).toBeUndefined();
      expect(result.message).toBe('Successfully authenticated!');
    });
  });

  describe('whoami endpoint', () => {
    it('returns user info when authenticated and db is available', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date('2024-01-01'),
      };

      mockDb.user.findUnique.mockResolvedValue(mockUser);

      const authenticatedContext = {
        ...mockContext,
        authenticatedUser: {
          id: 'user-123',
          keyId: 'key-456',
          scopes: ['read', 'write'],
        },
      };

      const caller = authRouter.createCaller(authenticatedContext);
      const result = await caller.whoami();

      expect(result.user).toEqual(mockUser);
      expect(result.keyId).toBe('key-456');
      expect(result.scopes).toEqual(['read', 'write']);
      expect(mockDb.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });
    });

    it('returns error when db is not available (demo mode)', async () => {
      const authenticatedContext = {
        ...mockContext,
        db: null,
        authenticatedUser: {
          id: 'user-123',
          keyId: 'key-456',
          scopes: ['*'],
        },
      };

      const caller = authRouter.createCaller(authenticatedContext);
      const result = await caller.whoami();

      expect(result.error).toBe('Database not available in demo mode');
    });

    it('returns null user when user not found in database', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      const authenticatedContext = {
        ...mockContext,
        authenticatedUser: {
          id: 'user-999',
          keyId: 'key-456',
          scopes: ['*'],
        },
      };

      const caller = authRouter.createCaller(authenticatedContext);
      const result = await caller.whoami();

      expect(result.user).toBeNull();
      expect(result.keyId).toBe('key-456');
      expect(result.scopes).toEqual(['*']);
    });

    it('handles database errors gracefully', async () => {
      mockDb.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const authenticatedContext = {
        ...mockContext,
        authenticatedUser: {
          id: 'user-123',
          keyId: 'key-456',
          scopes: ['*'],
        },
      };

      const caller = authRouter.createCaller(authenticatedContext);

      await expect(caller.whoami()).rejects.toThrow('Database connection failed');
    });

    it('returns scopes with wildcard permission', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@example.com',
        name: 'Admin User',
        createdAt: new Date('2024-01-01'),
      };

      mockDb.user.findUnique.mockResolvedValue(mockUser);

      const authenticatedContext = {
        ...mockContext,
        authenticatedUser: {
          id: 'user-123',
          keyId: 'key-admin',
          scopes: ['*'],
        },
      };

      const caller = authRouter.createCaller(authenticatedContext);
      const result = await caller.whoami();

      expect(result.scopes).toEqual(['*']);
    });
  });

  describe('integration scenarios', () => {
    it('public endpoint works even with authenticated user', async () => {
      const authenticatedContext = {
        ...mockContext,
        authenticatedUser: {
          id: 'user-123',
          keyId: 'key-456',
          scopes: ['*'],
        },
      };

      const caller = authRouter.createCaller(authenticatedContext);
      const result = await caller.public();

      expect(result.message).toBe('This is a public endpoint - no authentication required');
    });

    it('handles multiple different IP addresses', async () => {
      const ips = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '127.0.0.1'];

      for (const ip of ips) {
        mockContext.clientIp = ip;
        const authenticatedContext = {
          ...mockContext,
          authenticatedUser: {
            id: 'user-123',
            keyId: 'key-456',
            scopes: ['*'],
          },
        };

        const caller = authRouter.createCaller(authenticatedContext);
        const result = await caller.protected();

        expect(result.clientIp).toBe(ip);
      }
    });

    it('handles missing authenticatedUser gracefully', async () => {
      const caller = authRouter.createCaller(mockContext);
      const result = await caller.protected();

      expect(result.userId).toBeUndefined();
      expect(result.keyId).toBeUndefined();
      expect(result.scopes).toBeUndefined();
    });
  });
});
