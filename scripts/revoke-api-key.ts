#!/usr/bin/env tsx

/**
 * Admin script to revoke an API key
 *
 * Usage:
 *   npm run revoke-api-key -- <key-id>
 */

import { PrismaClient } from '@prisma/client';
import { ApiKeyService } from '../src/server/services/auth';

const prisma = new PrismaClient();

async function main() {
  const keyId = process.argv[2];

  if (!keyId) {
    console.error('\n❌ Error: Key ID required\n');
    console.log('Usage: npm run revoke-api-key -- <key-id>\n');
    process.exit(1);
  }

  const apiKeyService = new ApiKeyService(prisma);

  // Find the key first to show details
  const key = await prisma.apiKey.findUnique({
    where: { id: keyId },
    include: { user: true },
  });

  if (!key) {
    console.error(`\n❌ API key not found: ${keyId}\n`);
    process.exit(1);
  }

  console.log('\n🔒 Revoking API Key...\n');
  console.log(`  Name: ${key.name}`);
  console.log(`  User: ${key.user.email || key.user.name}`);
  console.log(`  Created: ${key.createdAt.toISOString()}\n`);

  await apiKeyService.revoke(keyId);

  console.log('✅ API key revoked successfully!\n');
}

main()
  .catch((error) => {
    console.error('❌ Error revoking API key:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
