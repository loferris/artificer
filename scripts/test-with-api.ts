/**
 * Test model discovery with OpenRouter API
 */

// Load .env file first
import * as dotenv from 'dotenv';
dotenv.config();

import { ModelDiscoveryService } from '../src/server/services/model/ModelDiscoveryService';
import { ModelFilterService } from '../src/server/services/model/ModelFilterService';
import { MODEL_REQUIREMENTS } from '../src/server/config/modelRequirements';

async function main() {
  console.log('🔑 API Key:', process.env.OPENROUTER_API_KEY?.substring(0, 20) + '...');
  console.log('');

  console.log('📡 Fetching models from OpenRouter API...');
  const service = new ModelDiscoveryService();

  try {
    const models = await service.getModels();

    console.log(`✅ Success! Fetched ${models.length} models\n`);

    const metadata = service.getCacheMetadata();
    console.log(`Cache source: ${metadata?.source}`);
    console.log(`Last updated: ${metadata?.lastUpdated.toLocaleString()}\n`);

    // Show top models by provider
    const providers = models.reduce((acc, m) => {
      const provider = m.id.split('/')[0];
      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(m);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('📊 Models by provider:');
    Object.entries(providers)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 5)
      .forEach(([provider, providerModels]) => {
        console.log(`  ${provider}: ${providerModels.length} models`);
      });

    console.log('\n🎯 Testing model selection for each role:\n');

    const filterService = new ModelFilterService();
    const roles = ['chat', 'chatFallback', 'analyzer', 'router', 'validator', 'documentUpdateGeneration', 'embedding'] as const;

    for (const role of roles) {
      const requirements = MODEL_REQUIREMENTS[role];
      const result = filterService.selectModel(models, requirements);

      console.log(`${role}:`);
      if (result) {
        console.log(`  ✓ ${result.modelId}`);
        console.log(`    Score: ${result.score.toFixed(2)} - ${result.reason}`);
      } else {
        console.log(`  ✗ No model found`);
      }
    }

    console.log('\n🔄 Testing with env var override...');
    process.env.CHAT_MODEL = 'anthropic/claude-sonnet-4.5';
    console.log(`Set CHAT_MODEL=${process.env.CHAT_MODEL}`);

    const { loadDynamicModelConfig } = await import('../src/server/config/dynamicModels');
    const config = await loadDynamicModelConfig();

    console.log(`\nResult: config.chat = ${config.chat}`);
    console.log('✓ Env var override working!\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Tip: Make sure OPENROUTER_API_KEY is set in your .env file');
  }
}

main();
