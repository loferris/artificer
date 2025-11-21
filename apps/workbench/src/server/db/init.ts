import { prisma } from './client';
import { logger } from '../utils/logger';

export async function initDatabase() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Optional: Run migrations or seed data here
    // await prisma.$executeRaw`PRAGMA foreign_keys = ON`;
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function closeDatabase() {
  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}
