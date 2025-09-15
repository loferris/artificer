import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { initDatabase, closeDatabase } from '../init';

vi.mock('../client', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

describe('Database Initialization', () => {
  // Mock console methods
  const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initDatabase', () => {
    it('successfully initializes database connection', async () => {
      const { prisma } = await import('../client');
      (prisma.$connect as Mock).mockResolvedValue(undefined);

      const loggerModule = await import('../../utils/logger');
      const loggerInfoSpy = vi.spyOn(loggerModule.logger, 'info').mockImplementation(() => {});

      await initDatabase();

      expect(prisma.$connect).toHaveBeenCalled();
      expect(loggerInfoSpy).toHaveBeenCalledWith('✅ Database connected successfully');

      loggerInfoSpy.mockRestore();
    });

    it('handles database connection failure', async () => {
      const { prisma } = await import('../client');
      const connectionError = new Error('Connection failed');
      (prisma.$connect as Mock).mockRejectedValue(connectionError);

      // Mock the logger import and spy on its error method
      const loggerModule = await import('../../utils/logger');
      const loggerErrorSpy = vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => {});

      await expect(initDatabase()).rejects.toThrow('Connection failed');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '❌ Database connection failed:',
        connectionError,
      );

      loggerErrorSpy.mockRestore();
    });

    it('handles non-Error objects in catch block', async () => {
      const { prisma } = await import('../client');
      const stringError = 'String error';
      (prisma.$connect as Mock).mockRejectedValue(stringError);

      // Mock the logger import and spy on its error method
      const loggerModule = await import('../../utils/logger');
      const loggerErrorSpy = vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => {});

      await expect(initDatabase()).rejects.toBe(stringError);

      expect(loggerErrorSpy).toHaveBeenCalledWith('❌ Database connection failed:', stringError);

      loggerErrorSpy.mockRestore();
    });
  });

  describe('closeDatabase', () => {
    it('successfully closes database connection', async () => {
      const { prisma } = await import('../client');
      (prisma.$disconnect as Mock).mockResolvedValue(undefined);

      await closeDatabase();

      expect(prisma.$disconnect).toHaveBeenCalled();
    });

    it('handles database disconnection errors', async () => {
      const { prisma } = await import('../client');
      const disconnectError = new Error('Disconnection failed');
      (prisma.$disconnect as Mock).mockRejectedValue(disconnectError);

      const loggerModule = await import('../../utils/logger');
      const loggerErrorSpy = vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => {});

      // Should not throw, just log the error
      await expect(closeDatabase()).resolves.toBeUndefined();

      expect(prisma.$disconnect).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error closing database connection:', disconnectError);

      loggerErrorSpy.mockRestore();
    });
  });
});
