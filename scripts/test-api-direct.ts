/**
 * Direct test of OpenRouter API
 */

import * as dotenv from 'dotenv';
dotenv.config();

async function testOpenRouterAPI() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  console.log('API Key present:', !!apiKey);
  console.log('API Key prefix:', apiKey?.substring(0, 12) + '...');
  console.log('');

  if (!apiKey) {
    console.error('❌ No API key found in .env');
    return;
  }

  console.log('📡 Calling OpenRouter API directly...');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Workflow Engine',
      },
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const text = await response.text();
      console.error('❌ API Error:', text);
      return;
    }

    const data = await response.json();
    const models = data.data || [];

    console.log(`✅ Success! Fetched ${models.length} models\n`);

    // Show sample models
    console.log('Sample models (first 20):');
    models.slice(0, 20).forEach((model: any) => {
      console.log(`  • ${model.id}`);
      console.log(`    Context: ${model.context_length?.toLocaleString()} | Cost: $${model.pricing?.prompt}/$${model.pricing?.completion}`);
    });

    // Group by provider
    const byProvider = models.reduce((acc: any, m: any) => {
      const provider = m.id.split('/')[0];
      acc[provider] = (acc[provider] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Top 15 providers:');
    Object.entries(byProvider)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 15)
      .forEach(([provider, count]) => {
        console.log(`  ${provider}: ${count}`);
      });

    // Filter to high-quality chat models
    console.log('\n🎯 High-quality chat models (>100k context, <$5/1M input):');
    const qualityModels = models.filter((m: any) =>
      m.context_length >= 100000 &&
      m.pricing?.prompt > 0 &&
      m.pricing?.prompt <= 5 &&
      !m.id.includes('embedding') &&
      !m.id.includes('vision')
    );

    qualityModels.slice(0, 15).forEach((m: any) => {
      console.log(`  • ${m.id}`);
      console.log(`    ${m.context_length?.toLocaleString()} ctx | $${m.pricing.prompt}/$${m.pricing.completion} per 1M`);
    });

    console.log(`\nTotal quality models: ${qualityModels.length}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testOpenRouterAPI();
