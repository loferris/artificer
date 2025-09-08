import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initDatabase, closeDatabase } from '../init';

vi.mock('../client', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Database Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initDatabase', () => {
    it('successfully initializes database connection', async () => {
      const { prisma } = await import('../client');
      (prisma.$connect as vi.Mock).mockResolvedValue(undefined);

      await initDatabase();

      expect(prisma.$connect).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Database connected successfully');
    });

    it('handles database connection failure', async () => {
      const { prisma } = await import('../client');
      const connectionError = new Error('Connection failed');
      (prisma.$connect as vi.Mock).mockRejectedValue(connectionError);

      await expect(initDatabase()).rejects.toThrow('Connection failed');

      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ Database connection failed:',
        connectionError,
      );
    });

    it('handles non-Error objects in catch block', async () => {
      const { prisma } = await import('../client');
      const stringError = 'String error';
      (prisma.$connect as vi.Mock).mockRejectedValue(stringError);

      await expect(initDatabase()).rejects.toBe(stringError);

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Database connection failed:', stringError);
    });
  });

  describe('closeDatabase', () => {
    it('successfully closes database connection', async () => {
      const { prisma } = await import('../client');
      (prisma.$disconnect as vi.Mock).mockResolvedValue(undefined);

      await closeDatabase();

      expect(prisma.$disconnect).toHaveBeenCalled();
    });

    it('handles database disconnection errors', async () => {
      const { prisma } = await import('../client');
      const disconnectError = new Error('Disconnect failed');
      (prisma.$disconnect as vi.Mock).mockRejectedValue(disconnectError);

      await expect(closeDatabase()).rejects.toThrow('Disconnect failed');
    });
  });
});
