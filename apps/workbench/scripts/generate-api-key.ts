#!/usr/bin/env tsx

/**
 * Admin script to generate API keys
 *
 * Usage:
 *   npm run generate-api-key
 *   npm run generate-api-key -- --name "LibreChat Production" --expires 365
 */

import { PrismaClient } from '@prisma/client';
import { ApiKeyService } from '../src/server/services/auth';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let keyName = 'API Key';
  let expiresInDays: number | null = null;
  let ipWhitelist: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      keyName = args[i + 1];
      i++;
    } else if (args[i] === '--expires' && args[i + 1]) {
      expiresInDays = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--ip' && args[i + 1]) {
      ipWhitelist = args[i + 1].split(',').map(ip => ip.trim());
      i++;
    }
  }

  console.log('\n🔑 Generating API Key...\n');

  // Check if a user exists, create one if not
  let user = await prisma.user.findFirst();

  if (!user) {
    console.log('📝 No user found. Creating default user...');
    user = await prisma.user.create({
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        name: 'Admin',
      },
    });
    console.log(`✅ Created user: ${user.email}\n`);
  }

  // Generate API key
  const apiKeyService = new ApiKeyService(prisma);

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : undefined;

  const { key, id } = await apiKeyService.create({
    userId: user.id,
    name: keyName,
    expiresAt,
    ipWhitelist,
  });

  // Display the key
  console.log('✅ API Key Generated Successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n  ${key}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  IMPORTANT: Save this key securely! It will not be shown again.\n');
  console.log('Key Details:');
  console.log(`  Name:         ${keyName}`);
  console.log(`  Key ID:       ${id}`);
  console.log(`  User:         ${user.email}`);
  console.log(`  Created:      ${new Date().toISOString()}`);
  console.log(`  Expires:      ${expiresAt ? expiresAt.toISOString() : 'Never'}`);
  console.log(`  IP Whitelist: ${ipWhitelist.length > 0 ? ipWhitelist.join(', ') : 'None (uses global)'}`);
  console.log('\nUsage:');
  console.log(`  curl -H "Authorization: Bearer ${key}" http://localhost:3000/api/...\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((error) => {
    console.error('❌ Error generating API key:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
