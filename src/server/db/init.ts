import { prisma } from './client';

export async function initDatabase() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Optional: Run migrations or seed data here
    // await prisma.$executeRaw`PRAGMA foreign_keys = ON`;
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function closeDatabase() {
  await prisma.$disconnect();
}
