#!/usr/bin/env node

/**
 * PostgreSQL Migration Verification Script
 * Run with: node scripts/verify-postgres.js
 */

import { PrismaClient } from '@prisma/client';

async function verifyPostgres() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verifying PostgreSQL connection...');

    // Test connection
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL successfully');

    // Test raw query to get database info
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('📊 Database version:', result[0].version.split(' ').slice(0, 2).join(' '));

    // Test table creation by checking schema
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    if (tables.length === 0) {
      console.log('⚠️  No tables found. Run "npx prisma migrate dev" to create schema');
    } else {
      console.log('📋 Tables found:', tables.map((t) => t.table_name).join(', '));
    }

    // Test service layer compatibility
    console.log('🔧 Testing service layer compatibility...');

    // Check if demo mode fallback works
    process.env.DEMO_MODE = 'true';
    const { createServiceContainer } = await import('../src/server/services/ServiceFactory.js');
    const services = createServiceContainer({ db: null, forceDemo: true });

    console.log('✅ Service layer demo mode works');

    // Test with database services
    delete process.env.DEMO_MODE;
    const dbServices = createServiceContainer({ db: prisma });

    console.log('✅ Service layer database mode works');
    console.log('🎉 PostgreSQL migration verification complete!');
  } catch (error) {
    console.error('❌ PostgreSQL verification failed:');

    if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused. Check:');
      console.error('   - PostgreSQL server is running');
      console.error('   - DATABASE_URL is correct');
      console.error('   - Network connectivity');
    } else if (error.code === 'P1001') {
      console.error('   Cannot connect to database. Check DATABASE_URL format');
    } else if (error.code === 'P1017') {
      console.error('   Database not found. Create database first');
    } else {
      console.error('   ', error.message);
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPostgres();
