/**
 * Verbose test of ModelDiscoveryService
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { ModelDiscoveryService } from '../src/server/services/model/ModelDiscoveryService';

async function main() {
  console.log('🔧 Testing ModelDiscoveryService with verbose logging\n');

  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log('API Key loaded:', !!apiKey);
  console.log('API Key value:', apiKey?.substring(0, 20) + '...\n');

  console.log('Creating ModelDiscoveryService...');
  const service = new ModelDiscoveryService();

  console.log('\nAttempting to fetch models...');

  try {
    const models = await service.getModels();

    console.log(`\n✅ getModels() returned ${models.length} models`);

    const metadata = service.getCacheMetadata();
    console.log(`\nCache metadata:`);
    console.log(`  Source: ${metadata?.source}`);
    console.log(`  Last updated: ${metadata?.lastUpdated}`);
    console.log(`  Model count: ${metadata?.modelCount}`);

    if (metadata?.source === 'fallback') {
      console.log('\n⚠️  Using fallback models - API call may have failed');
      console.log('    Check if OPENROUTER_API_KEY is valid');
    } else if (metadata?.source === 'api') {
      console.log('\n✅ Successfully fetched from API!');
    } else if (metadata?.source === 'file') {
      console.log('\n📁 Using cached models from file');
    }

    console.log('\nSample models:');
    models.slice(0, 5).forEach(m => {
      console.log(`  • ${m.id}`);
      console.log(`    Pricing: $${m.pricing.prompt}/$${m.pricing.completion} per 1M tokens`);
    });

  } catch (error: any) {
    console.error('\n❌ Error in getModels():', error.message);
    console.error(error.stack);
  }

  console.log('\n\n🔄 Now testing refresh() to force API call...');

  try {
    const models = await service.refresh();

    console.log(`\n✅ refresh() returned ${models.length} models`);

    const metadata = service.getCacheMetadata();
    console.log(`\nNew cache metadata:`);
    console.log(`  Source: ${metadata?.source}`);
    console.log(`  Model count: ${metadata?.modelCount}`);

    if (metadata?.source === 'api') {
      console.log('\n🎉 SUCCESS! API call worked!');
      console.log('\nTop 20 models from API:');
      models.slice(0, 20).forEach(m => {
        console.log(`  • ${m.id}`);
      });
    } else {
      console.log('\n⚠️  Still using fallback - something is wrong');
    }

  } catch (error: any) {
    console.error('\n❌ Error in refresh():', error.message);
    console.error('\nFull error:');
    console.error(error);
  }
}

main();
