/**
 * Final comprehensive test of model discovery system
 */

import * as dotenv from 'dotenv';
dotenv.config();

// Clear model env vars for pure discovery test
delete process.env.CHAT_MODEL;
delete process.env.CHAT_FALLBACK_MODEL;
delete process.env.ANALYZER_MODEL;
delete process.env.ROUTER_MODEL;
delete process.env.VALIDATOR_MODEL;

process.env.USE_DYNAMIC_MODEL_DISCOVERY = 'true';

import { loadDynamicModelConfig } from '../src/server/config/dynamicModels';
import { ModelDiscoveryService } from '../src/server/services/model/ModelDiscoveryService';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              Model Discovery System - Final Comprehensive Test               ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  // Get model details
  const service = new ModelDiscoveryService();
  const allModels = await service.getModels();
  const metadata = service.getCacheMetadata();

  console.log('📊 Discovery Status:');
  console.log(`  Source: ${metadata?.source}`);
  console.log(`  Total models: ${allModels.length}`);
  console.log(`  Cache age: ${metadata?.lastUpdated ? Math.round((Date.now() - new Date(metadata.lastUpdated).getTime()) / 1000) : '?'}s\n`);

  // Load config
  const config = await loadDynamicModelConfig();

  console.log('✅ Selected Models:\n');

  const selections = [
    { role: 'Primary Chat', model: config.chat, purpose: 'General conversations' },
    { role: 'Fallback Chat', model: config.chatFallback, purpose: 'When primary fails' },
    { role: 'Analyzer', model: config.analyzer, purpose: 'Classify query complexity' },
    { role: 'Router', model: config.router, purpose: 'Select execution model' },
    { role: 'Validator', model: config.validator, purpose: 'Validate response quality' },
    { role: 'Doc Decision', model: config.documentUpdateDecision, purpose: 'Decide doc updates' },
    { role: 'Doc Generation', model: config.documentUpdateGeneration, purpose: 'Generate doc content' },
    { role: 'Doc Summary', model: config.documentUpdateSummary, purpose: 'Summarize changes' },
    { role: 'Summarization', model: config.summarization, purpose: 'Compress conversations' },
    { role: 'Embedding', model: config.embedding, purpose: 'Vector embeddings' },
  ];

  selections.forEach(({ role, model, purpose }) => {
    const modelData = allModels.find(m => m.id === model);
    const contextStr = modelData?.context_length
      ? `${(modelData.context_length / 1000).toFixed(0)}k ctx`
      : 'N/A';
    const costStr = modelData
      ? `$${modelData.pricing.prompt.toFixed(2)}`
      : 'N/A';

    console.log(`  ${role.padEnd(20)} → ${model}`);
    console.log(`  ${' '.repeat(23)} ${purpose} (${contextStr}, ${costStr}/1M)`);
  });

  console.log('\n🔍 Quality Checks:\n');

  const checks = [
    {
      name: 'Primary chat quality',
      pass: config.chat.includes('sonnet-4.5'),
      message: config.chat.includes('sonnet-4.5')
        ? '✓ Using Claude Sonnet 4.5 (best quality)'
        : '✗ Not using latest Sonnet'
    },
    {
      name: 'Fallback quality',
      pass: config.chatFallback.includes('chat-v3.1'),
      message: config.chatFallback.includes('chat-v3.1')
        ? '✓ Using full DeepSeek v3.1 (671B), not distilled'
        : '✗ Using distilled or small model'
    },
    {
      name: 'Validator quality',
      pass: config.validator.includes('sonnet'),
      message: config.validator.includes('sonnet')
        ? '✓ Using Claude Sonnet for validation'
        : '✗ Not using quality validator'
    },
    {
      name: 'Summarization quality',
      pass: !config.summarization.includes('-3b-') && !config.summarization.includes('-1b-'),
      message: !config.summarization.includes('-3b-')
        ? `✓ Using ${config.summarization.split('/')[0]} (not tiny model)`
        : '✗ Using tiny model for summarization'
    },
    {
      name: 'No free models',
      pass: !Object.values(config).some(v => typeof v === 'string' && v.includes(':free')),
      message: !Object.values(config).some(v => typeof v === 'string' && v.includes(':free'))
        ? '✓ No free tier models selected'
        : '✗ Free tier models detected'
    },
    {
      name: 'Embedding configured',
      pass: config.embedding.includes('embedding'),
      message: config.embedding.includes('embedding')
        ? `✓ Embedding model set (${config.embedding})`
        : '✗ No embedding model'
    },
  ];

  checks.forEach(check => console.log(`  ${check.message}`));

  console.log('\n💰 Cost Analysis:\n');

  const modelCosts = selections
    .filter(s => s.role !== 'Embedding')
    .map(s => {
      const modelData = allModels.find(m => m.id === s.model);
      return {
        role: s.role,
        model: s.model,
        avgCost: modelData
          ? (modelData.pricing.prompt + modelData.pricing.completion) / 2
          : 0
      };
    })
    .sort((a, b) => b.avgCost - a.avgCost);

  modelCosts.forEach(({ role, avgCost }) => {
    const costTier = avgCost > 5 ? '💎 Premium' : avgCost > 0.5 ? '💰 Standard' : '💵 Budget';
    console.log(`  ${role.padEnd(20)} ${costTier.padEnd(12)} $${avgCost.toFixed(3)}/1M avg`);
  });

  const allPass = checks.every(c => c.pass);
  console.log('\n' + '═'.repeat(80));
  if (allPass) {
    console.log('🎉 All quality checks passed! Model discovery system working perfectly.');
  } else {
    console.log('⚠️  Some quality checks failed. Review selections above.');
  }
  console.log('═'.repeat(80) + '\n');
}

main().catch(console.error);
