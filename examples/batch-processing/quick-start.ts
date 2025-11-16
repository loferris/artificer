/**
 * Quick Start Example
 *
 * Minimal example to get started with batch processing.
 * Processes 3 sample documents through a single summarization phase.
 *
 * Usage:
 *   npm run tsx examples/batch-processing/quick-start.ts
 */

import { PrismaClient } from '@prisma/client';
import { BatchJobService } from '../../src/server/services/batch/BatchJobService';
import { ChainOrchestrator } from '../../src/server/services/orchestration/ChainOrchestrator';

const db = new PrismaClient();

async function main() {
  console.log('🚀 Quick Start: Batch Processing Example\n');

  // Initialize services
  const chainOrchestrator = new ChainOrchestrator(db);
  const batchService = new BatchJobService(db, chainOrchestrator);

  // Sample documents
  const documents = [
    {
      title: 'AI in Healthcare',
      content: 'Artificial intelligence is transforming healthcare through improved diagnostics, personalized treatment plans, and drug discovery. Machine learning models can analyze medical images with accuracy rivaling human experts.'
    },
    {
      title: 'Climate Solutions',
      content: 'Renewable energy adoption is accelerating globally. Solar and wind power now compete economically with fossil fuels in many regions. Energy storage technologies are critical for managing intermittent renewable sources.'
    },
    {
      title: 'Future of Work',
      content: 'Remote work and automation are reshaping employment. While some jobs are displaced by AI, new opportunities emerge in technology, healthcare, and creative fields. Continuous learning becomes essential for career adaptation.'
    }
  ];

  // Create batch job
  console.log('Creating batch job...');
  const job = await batchService.createBatchJob({
    name: 'Quick Start - Summarization',
    items: documents.map(doc => ({
      title: doc.title,
      content: doc.content
    })),
    phases: [
      {
        name: 'summarize',
        taskType: 'summarization',
        validation: {
          enabled: false // Disabled for speed
        }
      }
    ],
    options: {
      concurrency: 2,
      checkpointFrequency: 5,
      autoStart: true
    }
  });

  console.log(`✓ Job created: ${job.id}\n`);

  // Monitor progress
  console.log('Processing documents...');
  const startTime = Date.now();

  const interval = setInterval(async () => {
    const status = await batchService.getJobStatus(job.id);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `  Progress: ${status.progress.completedItems}/${status.progress.totalItems} ` +
      `(${status.progress.percentComplete.toFixed(0)}%) - ` +
      `Cost: $${status.analytics.costIncurred.toFixed(4)} - ` +
      `Elapsed: ${elapsed}s`
    );

    if (status.status === 'COMPLETED') {
      clearInterval(interval);

      console.log('\n✓ Job completed!\n');

      // Get results
      const results = await batchService.getJobResults(job.id);

      console.log('Results:');
      console.log('─'.repeat(80));

      results.results.forEach((result, idx) => {
        const input = result.input as { title: string; content: string };
        console.log(`\n${idx + 1}. ${input.title}`);
        console.log(`   Input:  ${input.content.substring(0, 60)}...`);
        console.log(`   Output: ${String(result.output).substring(0, 100)}...`);
        console.log(`   Cost:   $${result.costIncurred.toFixed(4)}`);
        console.log(`   Status: ${result.status}`);
      });

      console.log('\n' + '─'.repeat(80));

      // Get analytics
      const analytics = await batchService.getJobAnalytics(job.id);

      console.log('\nAnalytics:');
      console.log(`  Total Items:       ${analytics.overall.totalItems}`);
      console.log(`  Success Rate:      ${analytics.overall.successRate.toFixed(1)}%`);
      console.log(`  Total Cost:        $${analytics.cost.total.toFixed(4)}`);
      console.log(`  Avg Cost/Item:     $${analytics.cost.perItem.toFixed(4)}`);
      console.log(`  Avg Processing:    ${analytics.performance.avgProcessingTimeMs.toFixed(0)}ms/item`);

      console.log('\n✨ Quick start complete! See docs/BATCH_PROCESSING.md for more examples.\n');
    }

    if (status.status === 'FAILED') {
      clearInterval(interval);
      console.error('\n❌ Job failed:', status.error);
    }
  }, 2000);
}

main()
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
