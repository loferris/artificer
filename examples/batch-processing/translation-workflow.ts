/**
 * Translation Workflow Example
 *
 * Demonstrates a book translation pipeline for processing chapters
 * through multiple phases:
 *   1. Korean Cleanup - Normalize text formatting and encoding
 *   2. XML Tagging - Add character/scene tags for context
 *   3. Translation - Translate to English with premium model
 *
 * This example shows:
 * - Different models for different phases
 * - High validation standards for translation quality
 * - Lower concurrency for expensive operations
 *
 * Usage:
 *   npm run tsx examples/batch-processing/translation-workflow.ts
 */

import { PrismaClient } from '@prisma/client';
import { BatchJobService } from '../../src/server/services/batch/BatchJobService';
import { ChainOrchestrator } from '../../src/server/services/orchestration/ChainOrchestrator';
import { logger } from '../../src/server/utils/logger';

const db = new PrismaClient();

// Sample Korean novel chapters (romanized for demo purposes)
const BOOK_CHAPTERS = [
  {
    chapterNum: 1,
    title: 'The Beginning',
    koreanText: `Chapter 1: The Beginning

Yuna opened her eyes to find herself in an unfamiliar room. The last thing she remembered
was the bright headlights of the truck rushing toward her. Now she was lying in an
ornate bed with silk curtains, wearing clothes from another era.

"Where am I?" she whispered, her voice trembling.

A maid rushed into the room. "My lady! You're finally awake! The Duke has been so worried
about you since the accident."

Yuna's heart raced. Duke? Accident? This couldn't be real. But the surroundings felt
too vivid to be a dream. She had somehow been transported into the world of the
novel she had been reading - "The Villainess's Redemption."`
  },
  {
    chapterNum: 2,
    title: 'Understanding the Situation',
    koreanText: `Chapter 2: Understanding the Situation

Over the next few days, Yuna pieced together her new reality. She had become Beatrice
Ashford, the notorious villainess of the story who was destined to be executed for
plotting against the heroine.

"I need to change the story," she thought. "I know what's coming, so I can prevent
the tragedy."

The original Beatrice had been cruel and manipulative, driven by jealousy of the
heroine Elena. But Yuna had no intention of following that path. She would use her
knowledge of the plot to survive.

Her first challenge arrived sooner than expected. The Crown Prince, Daniel, requested
an audience. In the original story, this meeting led to Beatrice's first major mistake.`
  },
  {
    chapterNum: 3,
    title: 'A Different Choice',
    koreanText: `Chapter 3: A Different Choice

Yuna entered the palace garden where Prince Daniel waited. The original Beatrice would
have fawned over him, playing into the role of a manipulative noble. But Yuna had
different plans.

"Your Highness," she curtsied politely but without excessive flattery.

The Prince looked surprised. He had expected the usual simpering behavior. Instead,
Beatrice seemed... different. More genuine.

"Lady Ashford, I hope you've recovered from your accident," he said carefully.

"Thank you for your concern, Your Highness. I have indeed recovered, and the experience
has given me much to think about." Yuna smiled softly. "I hope we can have an honest
conversation about the upcoming social season."

This was not the Beatrice he remembered. Prince Daniel found himself intrigued.`
  }
];

async function main() {
  logger.info('Starting book translation workflow example');

  const chainOrchestrator = new ChainOrchestrator(db);
  const batchService = new BatchJobService(db, chainOrchestrator);

  // Create translation pipeline
  logger.info('Creating 3-phase translation pipeline', {
    chapters: BOOK_CHAPTERS.length,
    sourceLanguage: 'Korean (Romanized Demo)',
    targetLanguage: 'English (Already in English for demo)'
  });

  const job = await batchService.createBatchJob({
    name: 'Novel Translation - Chapters 1-3',
    items: BOOK_CHAPTERS.map(chapter => ({
      chapterNum: chapter.chapterNum,
      title: chapter.title,
      koreanText: chapter.koreanText,
      metadata: {
        genre: 'Isekai Romance',
        targetAudience: 'Young Adult'
      }
    })),
    phases: [
      {
        name: 'korean_cleanup',
        taskType: 'text_cleanup',
        model: 'anthropic/claude-sonnet-4', // Good model for text processing
        validation: {
          enabled: true,
          minScore: 7
        }
      },
      {
        name: 'xml_tagging',
        taskType: 'xml_tagging',
        model: 'anthropic/claude-sonnet-4',
        useRAG: true, // Use character/setting documents for context
        validation: {
          enabled: true,
          minScore: 8
        }
      },
      {
        name: 'translation',
        taskType: 'translation',
        model: 'anthropic/claude-opus-4', // Premium model for high-quality translation
        useRAG: true, // Use previous chapters for consistency
        validation: {
          enabled: true,
          minScore: 9 // High quality threshold for final translation
        }
      }
    ],
    options: {
      concurrency: 1, // Process one chapter at a time for consistency
      checkpointFrequency: 1, // Checkpoint after each chapter
      autoStart: true
    }
  });

  logger.info('Translation job created', {
    jobId: job.id,
    estimatedCost: '$0.50-2.00 (depends on model availability and chapter length)'
  });

  // Monitor with detailed progress
  const startTime = Date.now();
  let currentPhase = '';
  let currentChapter = 0;

  const interval = setInterval(async () => {
    const status = await batchService.getJobStatus(job.id);

    // Track phase transitions
    if (status.currentPhase !== currentPhase) {
      currentPhase = status.currentPhase || '';
      logger.info(`📝 Phase: ${currentPhase}`);
    }

    // Calculate which chapter we're on
    const chaptersComplete = Math.floor(status.progress.completedItems / 3);
    if (chaptersComplete > currentChapter) {
      currentChapter = chaptersComplete;
      logger.info(`📖 Completed Chapter ${currentChapter}`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const eta = status.analytics.estimatedTimeRemaining
      ? `${(status.analytics.estimatedTimeRemaining / 1000).toFixed(0)}s`
      : 'calculating...';

    logger.info('Progress', {
      phase: status.currentPhase,
      items: `${status.progress.completedItems}/${status.progress.totalItems}`,
      percent: `${status.progress.percentComplete.toFixed(1)}%`,
      cost: `$${status.analytics.costIncurred.toFixed(4)}`,
      elapsed: `${elapsed}s`,
      eta
    });

    if (status.status === 'COMPLETED') {
      clearInterval(interval);

      logger.info('\n🎉 Translation workflow completed!');

      // Get analytics
      const analytics = await batchService.getJobAnalytics(job.id);

      logger.info('=== Translation Analytics ===');
      logger.info('Overall', {
        chapters: analytics.overall.totalItems / 3, // 3 phases per chapter
        successRate: `${analytics.overall.successRate.toFixed(1)}%`,
        totalCost: `$${analytics.cost.total.toFixed(4)}`,
        avgCostPerChapter: `$${(analytics.cost.perItem * 3).toFixed(4)}`,
        totalTime: `${elapsed}s`
      });

      logger.info('Cost by Phase', {
        cleanup: `$${analytics.cost.byPhase.find(p => p.phase === 'korean_cleanup')?.cost.toFixed(4) || '0'}`,
        tagging: `$${analytics.cost.byPhase.find(p => p.phase === 'xml_tagging')?.cost.toFixed(4) || '0'}`,
        translation: `$${analytics.cost.byPhase.find(p => p.phase === 'translation')?.cost.toFixed(4) || '0'}`
      });

      logger.info('Time by Phase', {
        cleanup: `${analytics.performance.byPhase.find(p => p.phase === 'korean_cleanup')?.avgMs.toFixed(0) || '0'}ms`,
        tagging: `${analytics.performance.byPhase.find(p => p.phase === 'xml_tagging')?.avgMs.toFixed(0) || '0'}ms`,
        translation: `${analytics.performance.byPhase.find(p => p.phase === 'translation')?.avgMs.toFixed(0) || '0'}ms`
      });

      // Get results
      const results = await batchService.getJobResults(job.id);

      logger.info('\n=== Translated Chapters ===');

      // Group results by chapter (every 3 items is one chapter through 3 phases)
      for (let i = 0; i < BOOK_CHAPTERS.length; i++) {
        const chapterResults = results.results.filter((r: any) => {
          const input = r.input as { chapterNum: number };
          return input.chapterNum === BOOK_CHAPTERS[i].chapterNum;
        });

        if (chapterResults.length > 0) {
          const result = chapterResults[chapterResults.length - 1]; // Get final phase result
          const input = result.input as { chapterNum: number; title: string };
          const phaseOutputs = result.phaseOutputs as Record<string, string>;

          logger.info(`\nChapter ${input.chapterNum}: ${input.title}`, {
            status: result.status,
            cost: `$${result.costIncurred.toFixed(4)}`,
            processingTime: `${result.processingTimeMs}ms`,
            cleanedText: phaseOutputs?.korean_cleanup?.substring(0, 80) + '...',
            taggedText: phaseOutputs?.xml_tagging?.substring(0, 80) + '...',
            translation: result.output ? String(result.output).substring(0, 150) + '...' : 'N/A'
          });
        }
      }

      logger.info('\n=== Quality Metrics ===');
      const qualityStats = {
        allPhasesSuccessful: results.results.every((r: any) => r.status === 'COMPLETED'),
        validationFailures: results.results.filter((r: any) => r.status === 'FAILED').length,
        avgTokensPerChapter: (analytics.overall.tokensUsed / BOOK_CHAPTERS.length).toFixed(0)
      };

      logger.info('Quality Check', qualityStats);

      logger.info('\n✓ Translation workflow example complete!');
      logger.info('Next steps:', {
        recommendations: [
          'Review translated output for accuracy and tone',
          'Adjust validation thresholds if quality issues detected',
          'Scale to full book (30-50 chapters)',
          'Consider using RAG with glossary/style guide documents',
          'Implement custom validators for translation consistency'
        ]
      });
    }

    if (status.status === 'FAILED') {
      clearInterval(interval);
      logger.error('Translation job failed', {
        error: status.error,
        completedItems: status.progress.completedItems,
        failedItems: status.progress.failedItems
      });
    }
  }, 3000);
}

main()
  .catch((error) => {
    logger.error('Translation workflow failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
