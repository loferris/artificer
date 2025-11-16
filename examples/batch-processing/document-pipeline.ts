/**
 * Document Processing Pipeline Example
 *
 * Demonstrates a realistic workflow for processing research papers
 * through a multi-phase pipeline:
 *   1. OCR Cleanup - Remove artifacts from scanned documents
 *   2. Entity Extraction - Extract key terms, people, organizations
 *   3. Summarization - Generate concise summaries
 *   4. Categorization - Classify by topic
 *
 * Usage:
 *   npm run tsx examples/batch-processing/document-pipeline.ts
 */

import { PrismaClient } from '@prisma/client';
import { BatchJobService } from '../../src/server/services/batch/BatchJobService';
import { ChainOrchestrator } from '../../src/server/services/orchestration/ChainOrchestrator';
import { logger } from '../../src/server/utils/logger';

const db = new PrismaClient();

// Sample research paper data (simulating OCR output with some artifacts)
const RESEARCH_PAPERS = [
  {
    source: 'Journal of AI Research, 2024',
    rawText: `Title: Advances in Neural Architecture Search\n\nAbstract:\nThis paper presents a novel approach to automating neural network design.\nWe introduce an evolutionary algorithm that discovers optimal architectures\nfor image classification tasks. Our method achieves 95% accuracy on ImageNet\nwhile reducing computational costs by 40% compared to hand-designed networks.\n\nKeywords: neural networks, AutoML, evolutionary algorithms, deep learning`
  },
  {
    source: 'Nature Climate Science, 2024',
    rawText: `Title: Ocean Acidification and Coral Reef Resilience\n\nAbstract:\nRising CO2 levels are causing unprecedented ocean acidification.\nOur 10-year study of Pacific coral reefs reveals that acidification\nreduces coral calcification rates by 30%. However, some species show\nadaptive responses. Conservation strategies must prioritize genetic\ndiversity to preserve reef ecosystems.\n\nKeywords: climate change, coral reefs, ocean chemistry, biodiversity`
  },
  {
    source: 'Quantum Information Journal, 2024',
    rawText: `Title: Error Mitigation in Near-Term Quantum Devices\n\nAbstract:\nQuantum computers are limited by noise and decoherence in current hardware.\nWe develop error mitigation techniques that improve circuit fidelity\nwithout requiring full quantum error correction. Our methods enable\nreliable execution of 100-qubit algorithms on NISQ devices, demonstrating\npractical applications in chemistry and optimization.\n\nKeywords: quantum computing, error correction, NISQ, quantum algorithms`
  },
  {
    source: 'Agricultural Systems Journal, 2024',
    rawText: `Title: Precision Agriculture with IoT and Machine Learning\n\nAbstract:\nIntegrating IoT sensors with ML models enables data-driven farming decisions.\nOur system monitors soil moisture, nutrient levels, and crop health in real-time.\nField trials show 25% water savings and 15% yield improvements through optimized\nirrigation and fertilization. This technology can enhance food security while\nreducing environmental impact.\n\nKeywords: agriculture, IoT, machine learning, sustainability, precision farming`
  },
  {
    source: 'Medical Informatics Review, 2024',
    rawText: `Title: Federated Learning for Privacy-Preserving Healthcare AI\n\nAbstract:\nMedical data privacy regulations limit centralized AI model training.\nFederated learning enables collaborative model development across hospitals\nwithout sharing patient data. We demonstrate a federated approach for\ndiabetes risk prediction that matches centralized model performance while\nmaintaining HIPAA compliance.\n\nKeywords: federated learning, healthcare AI, privacy, machine learning, medical data`
  }
];

async function main() {
  logger.info('Starting document processing pipeline example');

  const chainOrchestrator = new ChainOrchestrator(db);
  const batchService = new BatchJobService(db, chainOrchestrator);

  // Create the multi-phase pipeline
  logger.info('Creating 4-phase document processing pipeline');

  const job = await batchService.createBatchJob({
    name: 'Research Paper Analysis Pipeline',
    items: RESEARCH_PAPERS.map(paper => ({
      source: paper.source,
      rawText: paper.rawText
    })),
    phases: [
      {
        name: 'ocr_cleanup',
        taskType: 'text_cleanup',
        validation: {
          enabled: true,
          minScore: 7
        }
      },
      {
        name: 'extract_entities',
        taskType: 'entity_extraction',
        validation: {
          enabled: true,
          minScore: 7
        }
      },
      {
        name: 'summarize',
        taskType: 'summarization',
        validation: {
          enabled: true,
          minScore: 8
        }
      },
      {
        name: 'categorize',
        taskType: 'analysis',
        useRAG: false, // No RAG needed for categorization
        validation: {
          enabled: true,
          minScore: 7
        }
      }
    ],
    options: {
      concurrency: 3, // Process 3 papers simultaneously
      checkpointFrequency: 2, // Checkpoint every 2 papers
      autoStart: true
    }
  });

  logger.info('Pipeline created and started', {
    jobId: job.id,
    papers: RESEARCH_PAPERS.length,
    phases: 4
  });

  // Monitor progress with detailed phase tracking
  const startTime = Date.now();
  let lastPhase = '';

  const interval = setInterval(async () => {
    const status = await batchService.getJobStatus(job.id);

    // Log phase transitions
    if (status.currentPhase && status.currentPhase !== lastPhase) {
      logger.info(`Entering phase: ${status.currentPhase}`);
      lastPhase = status.currentPhase || '';
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    logger.info('Pipeline progress', {
      phase: status.currentPhase,
      progress: `${status.progress.completedItems}/${status.progress.totalItems}`,
      percentComplete: `${status.progress.percentComplete.toFixed(1)}%`,
      cost: `$${status.analytics.costIncurred.toFixed(4)}`,
      elapsedSec: elapsed
    });

    if (status.status === 'COMPLETED') {
      clearInterval(interval);

      logger.info('Pipeline completed successfully!');

      // Get detailed analytics
      const analytics = await batchService.getJobAnalytics(job.id);

      logger.info('=== Pipeline Analytics ===');
      logger.info('Overall Stats', {
        totalPapers: analytics.overall.totalItems,
        successRate: `${analytics.overall.successRate.toFixed(1)}%`,
        totalCost: `$${analytics.cost.total.toFixed(4)}`,
        avgCostPerPaper: `$${analytics.cost.perItem.toFixed(4)}`,
        totalTime: `${elapsed}s`
      });

      logger.info('Cost by Phase', {
        phases: analytics.cost.byPhase.map(p => ({
          name: p.phase,
          cost: `$${p.cost.toFixed(4)}`
        }))
      });

      logger.info('Performance by Phase', {
        phases: analytics.performance.byPhase.map(p => ({
          name: p.phase,
          avgTime: `${p.avgMs.toFixed(0)}ms`
        }))
      });

      // Get and display sample results
      const results = await batchService.getJobResults(job.id);

      logger.info('\n=== Sample Results (First Paper) ===');
      const firstResult = results.results[0];

      if (firstResult) {
        const input = firstResult.input as { source: string; rawText: string };

        logger.info('Input', {
          source: input.source,
          textLength: input.rawText.length
        });

        if (firstResult.phaseOutputs) {
          const phaseOutputs = firstResult.phaseOutputs as Record<string, string>;

          logger.info('Phase Outputs', {
            ocr_cleanup: phaseOutputs.ocr_cleanup?.substring(0, 100) + '...',
            extract_entities: phaseOutputs.extract_entities?.substring(0, 100) + '...',
            summarize: phaseOutputs.summarize?.substring(0, 100) + '...',
            categorize: phaseOutputs.categorize?.substring(0, 100) + '...'
          });
        }

        logger.info('Processing Stats', {
          status: firstResult.status,
          cost: `$${firstResult.costIncurred.toFixed(4)}`,
          tokens: firstResult.tokensUsed,
          processingTime: `${firstResult.processingTimeMs}ms`
        });
      }

      logger.info('\n=== All Papers Categorized ===');
      results.results.forEach((result, idx) => {
        const input = result.input as { source: string };
        const category = result.output ? String(result.output).substring(0, 50) : 'N/A';

        logger.info(`${idx + 1}. ${input.source}`, {
          category,
          status: result.status
        });
      });

      logger.info('\n✓ Document pipeline example complete!');
      logger.info('Next steps:', {
        actions: [
          'Review results to validate output quality',
          'Adjust validation thresholds if needed',
          'Scale up to larger document sets',
          'Customize phases for your specific use case'
        ]
      });
    }

    if (status.status === 'FAILED') {
      clearInterval(interval);
      logger.error('Pipeline failed', { error: status.error });
    }
  }, 3000); // Check every 3 seconds
}

main()
  .catch((error) => {
    logger.error('Example failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
