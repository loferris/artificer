/**
 * Test complete model configuration loading
 */

import * as dotenv from 'dotenv';
dotenv.config();

// Enable dynamic discovery
process.env.USE_DYNAMIC_MODEL_DISCOVERY = 'true';

import { loadDynamicModelConfig } from '../src/server/config/dynamicModels';

async function main() {
  console.log('🔧 Testing complete model configuration loading\n');

  console.log('Environment:');
  console.log(`  USE_DYNAMIC_MODEL_DISCOVERY: ${process.env.USE_DYNAMIC_MODEL_DISCOVERY}`);
  console.log(`  CHAT_MODEL: ${process.env.CHAT_MODEL || '(not set - will use discovery)'}`);
  console.log(`  CHAT_FALLBACK_MODEL: ${process.env.CHAT_FALLBACK_MODEL || '(not set - will use discovery)'}`);
  console.log(`  OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? 'set' : 'NOT SET'}`);
  console.log('');

  console.log('📡 Loading model configuration with dynamic discovery...\n');

  const config = await loadDynamicModelConfig();

  console.log('✅ Configuration loaded successfully!\n');

  console.log('Model assignments:');
  console.log(`  chat: ${config.chat}`);
  console.log(`  chatFallback: ${config.chatFallback}`);
  console.log(`  analyzer: ${config.analyzer}`);
  console.log(`  router: ${config.router}`);
  console.log(`  validator: ${config.validator}`);
  console.log(`  documentUpdateDecision: ${config.documentUpdateDecision}`);
  console.log(`  documentUpdateGeneration: ${config.documentUpdateGeneration}`);
  console.log(`  documentUpdateSummary: ${config.documentUpdateSummary}`);
  console.log(`  summarization: ${config.summarization}`);
  console.log(`  embedding: ${config.embedding} (${config.embeddingDimensions}D)`);
  console.log(`  available: ${config.available.length} models`);

  console.log('\n✨ Key observations:');

  if (config.chat.includes('sonnet')) {
    console.log('  ✓ Chat correctly selected Sonnet (quality preference)');
  }

  if (config.chatFallback.includes('deepseek')) {
    console.log('  ✓ Fallback correctly selected DeepSeek (cost preference)');
  }

  if (config.embedding.includes('embedding')) {
    console.log('  ✓ Embedding model selected (from fallback since OpenRouter has no embeddings)');
  } else {
    console.log('  ⚠ No embedding model selected!');
  }

  console.log('\n🎯 Testing env var override...');
  process.env.CHAT_MODEL = 'override/test-model';
  const overrideConfig = await loadDynamicModelConfig();

  console.log(`  CHAT_MODEL override: ${overrideConfig.chat}`);

  if (overrideConfig.chat === 'override/test-model') {
    console.log('  ✓ Env var override working correctly!');
  } else {
    console.log('  ✗ Env var override NOT working');
  }
}

main().catch(console.error);
