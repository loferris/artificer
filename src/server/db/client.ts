import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Ensure proper connection handling
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Set up event listeners for database logging
prisma.$on('query', (e) => {
  logger.dbQuery(e.query, e.duration);
});

prisma.$on('error', (e) => {
  logger.error('Database error', new Error(e.message));
});

prisma.$on('warn', (e) => {
  logger.warn('Database warning', { message: e.message });
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  logger.info('Shutting down database connection');
  await prisma.$disconnect();
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database connection');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing database connection');
  await prisma.$disconnect();
  process.exit(0);
});
