/**
 * Test pure dynamic discovery without env var overrides
 */

import * as dotenv from 'dotenv';
dotenv.config();

// Clear all model env vars to test pure discovery
delete process.env.CHAT_MODEL;
delete process.env.CHAT_FALLBACK_MODEL;
delete process.env.ANALYZER_MODEL;
delete process.env.ROUTER_MODEL;
delete process.env.VALIDATOR_MODEL;
delete process.env.DOCUMENT_UPDATE_DECISION_MODEL;
delete process.env.DOCUMENT_UPDATE_GENERATION_MODEL;
delete process.env.DOCUMENT_UPDATE_SUMMARY_MODEL;
delete process.env.SUMMARIZATION_MODEL;
delete process.env.EMBEDDING_MODEL;

// Enable dynamic discovery
process.env.USE_DYNAMIC_MODEL_DISCOVERY = 'true';

import { loadDynamicModelConfig } from '../src/server/config/dynamicModels';

async function main() {
  console.log('🔬 Testing PURE dynamic discovery (no env var overrides)\n');

  const config = await loadDynamicModelConfig();

  console.log('✅ Models selected by discovery algorithm:\n');

  const roles = [
    'chat',
    'chatFallback',
    'analyzer',
    'router',
    'validator',
    'documentUpdateDecision',
    'documentUpdateGeneration',
    'documentUpdateSummary',
    'summarization',
    'embedding',
  ] as const;

  roles.forEach(role => {
    const model = config[role];
    console.log(`  ${role.padEnd(30)} → ${model}`);
  });

  console.log(`\n  Available models: ${config.available.length} total`);

  // Check for issues
  console.log('\n🔍 Analysis:');

  if (config.embedding.includes('embedding')) {
    console.log('  ✓ Embedding: Using fallback (OpenRouter has no embedding models)');
  } else {
    console.log('  ⚠️ Embedding: No model selected!');
  }

  if (config.chat.includes('sonnet') && config.chat.includes('4.5')) {
    console.log('  ✓ Chat: Correctly selected latest Sonnet (best quality)');
  } else {
    console.log(`  ⚠️ Chat: Selected ${config.chat} instead of claude-sonnet-4.5`);
  }

  if (config.chatFallback.includes('deepseek')) {
    console.log('  ✓ Fallback: Correctly selected DeepSeek (cheapest)');
  }

  if (config.validator.includes('sonnet')) {
    console.log('  ✓ Validator: Using quality model (Sonnet)');
  }

  // Check for free models being selected inappropriately
  const freeModels = Object.entries(config).filter(([key, val]) =>
    typeof val === 'string' && val.includes(':free')
  );

  if (freeModels.length > 0) {
    console.log(`\n  ⚠️ Free models selected (may have rate limits):`);
    freeModels.forEach(([role, model]) => {
      console.log(`    - ${role}: ${model}`);
    });
  }
}

main().catch(console.error);
