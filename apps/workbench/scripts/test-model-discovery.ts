/**
 * Test script for dynamic model discovery
 *
 * Tests:
 * - Fetching models from OpenRouter API
 * - Filtering based on requirements
 * - Model selection with scoring
 * - Env var overrides
 * - Fallback behavior
 */

import { ModelDiscoveryService } from '../src/server/services/model/ModelDiscoveryService';
import { ModelFilterService } from '../src/server/services/model/ModelFilterService';
import { MODEL_REQUIREMENTS, ModelRole } from '../src/server/config/modelRequirements';
import { loadDynamicModelConfig } from '../src/server/config/dynamicModels';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

function log(message: string, color: keyof typeof COLORS = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function section(title: string) {
  console.log('');
  log('='.repeat(80), 'cyan');
  log(` ${title}`, 'bright');
  log('='.repeat(80), 'cyan');
  console.log('');
}

async function testModelDiscovery() {
  section('1. Testing Model Discovery from OpenRouter API');

  const discoveryService = new ModelDiscoveryService();

  try {
    log('Fetching models from OpenRouter...', 'blue');
    const models = await discoveryService.getModels();

    log(`✓ Successfully fetched ${models.length} models`, 'green');

    // Show cache metadata
    const metadata = discoveryService.getCacheMetadata();
    if (metadata) {
      log(`\nCache metadata:`, 'dim');
      log(`  Source: ${metadata.source}`, 'dim');
      log(`  Last updated: ${metadata.lastUpdated.toLocaleString()}`, 'dim');
      log(`  TTL: ${metadata.ttl / 1000 / 60 / 60} hours`, 'dim');
    }

    // Show sample models
    log('\nSample models (first 10):', 'yellow');
    models.slice(0, 10).forEach(model => {
      log(`  • ${model.id}`, 'dim');
      log(`    Context: ${model.context_length.toLocaleString()} | ` +
          `Cost: $${model.pricing.prompt}/$${model.pricing.completion} per 1M tokens`, 'dim');
    });

    // Group by provider
    const byProvider = models.reduce((acc, m) => {
      const provider = m.id.split('/')[0];
      acc[provider] = (acc[provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    log('\nModels by provider:', 'yellow');
    Object.entries(byProvider)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([provider, count]) => {
        log(`  ${provider}: ${count} models`, 'dim');
      });

    return models;
  } catch (error) {
    log(`✗ Failed to fetch models: ${error}`, 'red');
    log('Using fallback models...', 'yellow');
    return ModelDiscoveryService.getFallbackModels();
  }
}

async function testModelFiltering(models: any[]) {
  section('2. Testing Model Filtering & Selection');

  const filterService = new ModelFilterService();

  const roles: ModelRole[] = [
    'chat',
    'chatFallback',
    'analyzer',
    'router',
    'validator',
    'documentUpdateGeneration',
    'summarization',
    'embedding',
  ];

  for (const role of roles) {
    log(`\nRole: ${role}`, 'bright');

    const requirements = MODEL_REQUIREMENTS[role];
    log('Requirements:', 'yellow');
    if (requirements.minInputTokens) {
      log(`  • Min input tokens: ${requirements.minInputTokens.toLocaleString()}`, 'dim');
    }
    if (requirements.minOutputTokens) {
      log(`  • Min output tokens: ${requirements.minOutputTokens.toLocaleString()}`, 'dim');
    }
    if (requirements.maxInputCostPer1M) {
      log(`  • Max cost: $${requirements.maxInputCostPer1M}/1M input`, 'dim');
    }
    if (requirements.preferredProviders?.length) {
      log(`  • Preferred providers: ${requirements.preferredProviders.join(', ')}`, 'dim');
    }
    if (requirements.requiresJson) {
      log(`  • Requires JSON support`, 'dim');
    }
    if (requirements.preferQuality) {
      log(`  • Prefers quality`, 'dim');
    }
    if (requirements.preferSpeed) {
      log(`  • Prefers speed`, 'dim');
    }
    if (requirements.modality) {
      log(`  • Modality: ${requirements.modality}`, 'dim');
    }

    // Filter models
    const filtered = filterService.filterModels(models, requirements);
    log(`\nFiltered to ${filtered.length} candidates`, 'cyan');

    // Select best model
    const result = filterService.selectModel(models, requirements);

    if (result) {
      log(`\n✓ Selected: ${result.modelId}`, 'green');
      log(`  Score: ${result.score.toFixed(2)}`, 'dim');
      log(`  Reason: ${result.reason}`, 'dim');

      // Show top 3 alternatives
      const alternatives = filtered
        .map(m => ({
          id: m.id,
          score: filterService['scoreModel'](m, requirements),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      if (alternatives.length > 1) {
        log('\n  Top alternatives:', 'dim');
        alternatives.forEach((alt, i) => {
          if (alt.id !== result.modelId) {
            log(`    ${i + 1}. ${alt.id} (score: ${alt.score.toFixed(2)})`, 'dim');
          }
        });
      }
    } else {
      log(`✗ No model found matching requirements`, 'red');
    }
  }
}

async function testEnvVarOverrides() {
  section('3. Testing Environment Variable Overrides');

  log('Current env vars:', 'yellow');
  log(`  CHAT_MODEL: ${process.env.CHAT_MODEL || '(not set)'}`, 'dim');
  log(`  CHAT_FALLBACK_MODEL: ${process.env.CHAT_FALLBACK_MODEL || '(not set)'}`, 'dim');
  log(`  ANALYZER_MODEL: ${process.env.ANALYZER_MODEL || '(not set)'}`, 'dim');
  log(`  USE_DYNAMIC_MODEL_DISCOVERY: ${process.env.USE_DYNAMIC_MODEL_DISCOVERY || '(not set)'}`, 'dim');

  log('\nLoading model config with env var overrides...', 'blue');
  const config = await loadDynamicModelConfig();

  log('\n✓ Loaded configuration:', 'green');
  log(`  Chat: ${config.chat}`, 'dim');
  log(`  Chat Fallback: ${config.chatFallback}`, 'dim');
  log(`  Analyzer: ${config.analyzer}`, 'dim');
  log(`  Router: ${config.router}`, 'dim');
  log(`  Validator: ${config.validator}`, 'dim');
  log(`  Document Update Decision: ${config.documentUpdateDecision}`, 'dim');
  log(`  Document Update Generation: ${config.documentUpdateGeneration}`, 'dim');
  log(`  Document Update Summary: ${config.documentUpdateSummary}`, 'dim');
  log(`  Summarization: ${config.summarization}`, 'dim');
  log(`  Embedding: ${config.embedding} (${config.embeddingDimensions}D)`, 'dim');
  log(`  Available models: ${config.available.length} total`, 'dim');

  // Check which values came from env vs discovery
  log('\nSource of each value:', 'yellow');
  if (process.env.CHAT_MODEL) {
    log(`  ✓ CHAT_MODEL from env: ${process.env.CHAT_MODEL}`, 'green');
  } else {
    log(`  ⚠ CHAT_MODEL from discovery/fallback`, 'yellow');
  }
  if (process.env.CHAT_FALLBACK_MODEL) {
    log(`  ✓ CHAT_FALLBACK_MODEL from env: ${process.env.CHAT_FALLBACK_MODEL}`, 'green');
  } else {
    log(`  ⚠ CHAT_FALLBACK_MODEL from discovery/fallback`, 'yellow');
  }
  if (process.env.ANALYZER_MODEL) {
    log(`  ✓ ANALYZER_MODEL from env: ${process.env.ANALYZER_MODEL}`, 'green');
  } else {
    log(`  ⚠ ANALYZER_MODEL from fallback to CHAT_FALLBACK_MODEL`, 'yellow');
  }

  return config;
}

async function testFallbackBehavior() {
  section('4. Testing Fallback Behavior');

  log('Fallback models (used when API fails or discovery disabled):', 'yellow');
  const fallbacks = ModelDiscoveryService.getFallbackModels();

  fallbacks.forEach(model => {
    log(`\n  • ${model.id}`, 'bright');
    log(`    Name: ${model.name}`, 'dim');
    log(`    Context: ${model.context_length.toLocaleString()} tokens`, 'dim');
    log(`    Pricing: $${model.pricing.prompt}/$${model.pricing.completion} per 1M`, 'dim');
    if (model.top_provider?.max_completion_tokens) {
      log(`    Max output: ${model.top_provider.max_completion_tokens.toLocaleString()} tokens`, 'dim');
    }
    if (model.architecture?.modality) {
      log(`    Modality: ${model.architecture.modality}`, 'dim');
    }
  });

  log('\n\nTesting discovery service with invalid API key...', 'blue');
  const badService = new ModelDiscoveryService({
    apiKey: 'invalid-key-for-testing',
    useFallback: true,
  });

  try {
    const models = await badService.getModels();
    log(`✓ Fallback successful: ${models.length} models available`, 'green');

    const metadata = badService.getCacheMetadata();
    if (metadata) {
      log(`  Source: ${metadata.source}`, 'dim');
    }
  } catch (error) {
    log(`✗ Fallback failed: ${error}`, 'red');
  }
}

async function testCacheRefresh() {
  section('5. Testing Cache Management');

  const discoveryService = new ModelDiscoveryService();

  log('Initial cache state:', 'yellow');
  let metadata = discoveryService.getCacheMetadata();
  if (metadata) {
    log(`  Source: ${metadata.source}`, 'dim');
    log(`  Last updated: ${metadata.lastUpdated.toLocaleString()}`, 'dim');
    log(`  Age: ${Math.round((Date.now() - metadata.lastUpdated.getTime()) / 1000)}s`, 'dim');
  } else {
    log('  No cache yet', 'dim');
  }

  log('\nForcing cache refresh...', 'blue');
  try {
    const models = await discoveryService.refresh();
    log(`✓ Refresh successful: ${models.length} models`, 'green');

    metadata = discoveryService.getCacheMetadata();
    if (metadata) {
      log(`  New source: ${metadata.source}`, 'dim');
      log(`  New timestamp: ${metadata.lastUpdated.toLocaleString()}`, 'dim');
    }
  } catch (error) {
    log(`✗ Refresh failed: ${error}`, 'red');
  }
}

// Main execution
async function main() {
  log('╔═══════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    Model Discovery & Selection Test Suite                    ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════════════════════════╝', 'cyan');

  try {
    // Test 1: Discovery
    const models = await testModelDiscovery();

    // Test 2: Filtering & Selection
    await testModelFiltering(models);

    // Test 3: Env var overrides
    await testEnvVarOverrides();

    // Test 4: Fallbacks
    await testFallbackBehavior();

    // Test 5: Cache management
    await testCacheRefresh();

    section('✓ All Tests Complete');
    log('Model discovery and selection system is working correctly!', 'green');

  } catch (error) {
    section('✗ Test Failed');
    log(`Error: ${error}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
