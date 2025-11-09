#!/usr/bin/env tsx

/**
 * Admin script to list all API keys
 *
 * Usage:
 *   npm run list-api-keys
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      apiKeys: true,
    },
  });

  if (users.length === 0) {
    console.log('\n⚠️  No users found.\n');
    return;
  }

  console.log('\n📋 API Keys\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const user of users) {
    console.log(`\n👤 User: ${user.email || user.name || user.id}`);

    if (user.apiKeys.length === 0) {
      console.log('   No API keys');
      continue;
    }

    for (const key of user.apiKeys) {
      const isExpired = key.expiresAt && key.expiresAt < new Date();
      const status = isExpired ? '❌ EXPIRED' : '✅ ACTIVE';

      console.log(`\n   ${status} ${key.name}`);
      console.log(`   ID:          ${key.id}`);
      console.log(`   Created:     ${key.createdAt.toISOString()}`);
      console.log(`   Last Used:   ${key.lastUsedAt?.toISOString() || 'Never'}`);
      console.log(`   Expires:     ${key.expiresAt?.toISOString() || 'Never'}`);
      console.log(`   IP Whitelist: ${key.ipWhitelist.length > 0 ? key.ipWhitelist.join(', ') : 'None'}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((error) => {
    console.error('❌ Error listing API keys:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
