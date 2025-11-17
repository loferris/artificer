import * as dotenv from 'dotenv';
dotenv.config();

import { ModelDiscoveryService } from '../src/server/services/model/ModelDiscoveryService';

async function main() {
  const service = new ModelDiscoveryService();
  const models = await service.getModels();

  const selected = [
    'deepseek/deepseek-r1-distill-qwen-14b',
    'deepseek/deepseek-r1-0528-qwen3-8b',
    'google/gemma-3-12b-it',
    'google/gemma-3-27b-it',
    'qwen/qwen-2.5-coder-32b-instruct',
    'mistralai/mistral-small-3.2-24b-instruct',
    'deepseek/deepseek-chat-v3.1', // For comparison
  ];

  console.log('Selected models pricing and details:\n');

  selected.forEach(id => {
    const model = models.find(m => m.id === id);
    if (model) {
      const avgCost = (model.pricing.prompt + model.pricing.completion) / 2;
      console.log(`${id}`);
      console.log(`  Context: ${model.context_length.toLocaleString()}`);
      console.log(`  Pricing: $${model.pricing.prompt}/$${model.pricing.completion} per 1M`);
      console.log(`  Avg: $${avgCost.toFixed(3)}/1M`);
      console.log('');
    }
  });
}

main();
