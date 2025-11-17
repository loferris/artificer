# Batch Processing Guide

## Overview

The ai-workflow-engine batch processing system allows you to process large collections of documents through multi-phase AI pipelines with automatic checkpointing, cost tracking, and progress monitoring.

**Perfect for:**
- Processing 100+ research papers through extraction → summarization → categorization
- Multi-chapter book translation workflows
- Large-scale document embedding generation
- Bulk content analysis and transformation

## Key Features

✅ **Multi-Phase Pipelines** - Define sequential processing stages (e.g., OCR → Tagging → Translation)
✅ **Automatic Checkpointing** - Resume from exact point of failure
✅ **Concurrency Control** - Process multiple items simultaneously with configurable limits
✅ **Cost Tracking** - Monitor spending per item and per phase
✅ **Progress Monitoring** - Real-time status updates and ETAs
✅ **Existing Orchestration** - Leverages your ChainOrchestrator for intelligent model routing

## Quick Start

### 1. Create a Batch Job

```typescript
import { trpc } from '~/utils/trpc';

// Process 100 documents through a 2-phase pipeline
const result = await trpc.batch.createJob.mutate({
  name: 'Research Paper Analysis',
  projectId: 'my-project-id',

  items: documents.map(doc => ({
    content: doc.text,
    metadata: { title: doc.title, author: doc.author }
  })),

  phases: [
    {
      name: 'extract_entities',
      taskType: 'entity_extraction',
      useRAG: false,
      validation: {
        enabled: true,
        minScore: 7
      }
    },
    {
      name: 'summarize',
      taskType: 'summarization',
      useRAG: true, // Use project documents for context
      validation: {
        enabled: true,
        minScore: 8
      }
    }
  ],

  options: {
    concurrency: 10, // Process 10 documents simultaneously
    checkpointFrequency: 5, // Save progress every 5 documents
    autoStart: true // Start immediately (default)
  }
});

console.log(`Job created: ${result.job.id}`);
```

### 2. Monitor Progress

```typescript
// Get current status
const status = await trpc.batch.getJobStatus.query({
  jobId: 'job_abc123'
});

console.log(`
  Status: ${status.status.status}
  Progress: ${status.status.progress.percentComplete}%
  Completed: ${status.status.progress.completedItems}/${status.status.progress.totalItems}
  Cost: $${status.status.analytics.costIncurred}
  ETA: ${status.status.analytics.estimatedTimeRemaining}ms
`);
```

### 3. Get Results

```typescript
// Retrieve all results after completion
const results = await trpc.batch.getJobResults.query({
  jobId: 'job_abc123'
});

results.results.forEach((item, idx) => {
  console.log(`Item ${idx}:`);
  console.log(`  Input: ${item.input.content.substring(0, 50)}...`);
  console.log(`  Output: ${item.output}`);
  console.log(`  Phase Outputs:`, item.phaseOutputs);
  console.log(`  Cost: $${item.costIncurred}`);
  console.log(`  Status: ${item.status}`);
});
```

## Architecture

### How It Works

```
User → BatchJobService → BatchExecutor → [Item 1, Item 2, ..., Item N]
                             ↓
                       ChainOrchestrator (existing)
                             ↓
                       AnalyzerAgent → RouterAgent → ExecutorAgent → ValidatorAgent
                             ↓
                       Results + Checkpoints
```

### Components

**1. BatchJobService** - High-level API for job lifecycle management
- Create, start, pause, resume, cancel jobs
- Query status and analytics
- List jobs with filters

**2. BatchExecutor** - Core execution engine
- Orchestrates items through phases
- Manages concurrency with Semaphore
- Triggers automatic checkpointing
- Integrates with existing ChainOrchestrator

**3. CheckpointService** - State persistence
- Saves progress to PostgreSQL
- Enables crash recovery
- Auto-checkpoint at configurable intervals

**4. Semaphore** - Concurrency control
- Limits simultaneous API calls
- Prevents rate limit errors
- Resource management

## Common Use Cases

### Use Case 1: Document Processing Pipeline

**Scenario**: Upload 50 PDFs → Extract text → Generate summaries → Categorize

```typescript
const job = await trpc.batch.createJob.mutate({
  name: 'PDF Processing Pipeline',
  projectId: projectId,

  items: pdfDocuments.map(pdf => ({
    filename: pdf.name,
    content: pdf.base64Data
  })),

  phases: [
    {
      name: 'ocr_extraction',
      taskType: 'ocr_cleanup',
      validation: { enabled: true, minScore: 7 }
    },
    {
      name: 'summarization',
      taskType: 'summarize',
      validation: { enabled: true, minScore: 8 }
    },
    {
      name: 'categorization',
      taskType: 'categorize',
      useRAG: true // Use existing documents for category examples
    }
  ],

  options: {
    concurrency: 5, // OCR can be slow, limit concurrency
    checkpointFrequency: 10
  }
});
```

### Use Case 2: Multi-Chapter Book Translation

**Scenario**: Translate 30 chapters through cleanup → tagging → translation

```typescript
const job = await trpc.batch.createJob.mutate({
  name: 'Book Translation - Chapter 1-30',
  projectId: bookProjectId,

  items: chapters.map(chapter => ({
    chapterNum: chapter.num,
    text: chapter.koreanText
  })),

  phases: [
    {
      name: 'korean_cleanup',
      taskType: 'text_cleanup',
      model: 'anthropic/claude-sonnet-4'
    },
    {
      name: 'xml_tagging',
      taskType: 'xml_tagging',
      useRAG: true // Use character/setting documents
    },
    {
      name: 'translation',
      taskType: 'translation',
      model: 'anthropic/claude-opus-4', // Premium model for translation
      validation: { enabled: true, minScore: 9 }
    }
  ],

  options: {
    concurrency: 3, // Translation is expensive, limit concurrency
    checkpointFrequency: 5
  }
});
```

### Use Case 3: Embedding Regeneration

**Scenario**: Rebuild embeddings for all documents in a project

```typescript
const job = await trpc.batch.createJob.mutate({
  name: 'Rebuild Project Embeddings',
  projectId: projectId,

  items: projectDocuments.map(doc => ({
    documentId: doc.id,
    content: doc.content
  })),

  phases: [
    {
      name: 'generate_embeddings',
      taskType: 'embedding_generation',
      // No validation needed for embeddings
    }
  ],

  options: {
    concurrency: 20, // Embeddings are fast, can do many in parallel
    checkpointFrequency: 50
  }
});
```

## Advanced Features

### Crash Recovery

If your server crashes during batch processing:

```typescript
// On restart, resume from last checkpoint
const status = await trpc.batch.getJobStatus.query({ jobId });

if (status.status.status === 'FAILED' || status.status.status === 'PAUSED') {
  // Resume from checkpoint
  await trpc.batch.resumeJob.mutate({ jobId });

  console.log('Job resumed from checkpoint');
}
```

### Cost Management

```typescript
// Monitor costs in real-time
const analytics = await trpc.batch.getJobAnalytics.query({ jobId });

console.log(`
  Total Cost: $${analytics.analytics.cost.total}

  By Phase:
  ${analytics.analytics.cost.byPhase.map(p =>
    `  ${p.phase}: $${p.cost}`
  ).join('\n')}

  Average per Item: $${analytics.analytics.cost.perItem}
`);

// Set budget alerts (future feature)
// Will pause job if cost exceeds threshold
```

### Performance Analytics

```typescript
const analytics = await trpc.batch.getJobAnalytics.query({ jobId });

console.log(`
  Performance:
  - Avg processing time: ${analytics.analytics.performance.avgProcessingTimeMs}ms/item
  - Success rate: ${analytics.analytics.overall.successRate}%
  - Failed items: ${analytics.analytics.overall.failedItems}

  By Phase:
  ${analytics.analytics.performance.byPhase.map(p =>
    `  ${p.phase}: ${p.avgMs}ms avg`
  ).join('\n')}
`);
```

### Pause and Resume

```typescript
// Pause a running job (e.g., to save costs)
await trpc.batch.pauseJob.mutate({ jobId });

// Resume later
await trpc.batch.resumeJob.mutate({ jobId });
```

## API Reference

### Create Job

```typescript
trpc.batch.createJob.mutate({
  name: string;
  projectId?: string;
  items: any[]; // Max 10,000 items
  phases: PhaseConfig[]; // Max 10 phases
  options?: {
    concurrency?: number; // 1-50, default: 5
    checkpointFrequency?: number; // 1-100, default: 10
    autoStart?: boolean; // default: true
  };
})
```

### Get Status

```typescript
trpc.batch.getJobStatus.query({ jobId: string })

// Returns:
{
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  currentPhase?: string;
  progress: {
    totalItems: number;
    completedItems: number;
    failedItems: number;
    percentComplete: number;
  };
  analytics: {
    costIncurred: number;
    tokensUsed: number;
    estimatedTimeRemaining?: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
```

### List Jobs

```typescript
trpc.batch.listJobs.query({
  projectId?: string;
  status?: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  limit?: number; // 1-100, default: 20
  offset?: number; // default: 0
})
```

### Get Results

```typescript
trpc.batch.getJobResults.query({ jobId: string })

// Returns all items with their inputs/outputs
```

### Get Analytics

```typescript
trpc.batch.getJobAnalytics.query({ jobId: string })

// Returns detailed cost/performance metrics
```

### Job Control

```typescript
// Resume a paused/failed job
trpc.batch.resumeJob.mutate({ jobId: string })

// Pause a running job
trpc.batch.pauseJob.mutate({ jobId: string })

// Cancel a job
trpc.batch.cancelJob.mutate({ jobId: string })

// Delete a job (must be stopped first)
trpc.batch.deleteJob.mutate({ jobId: string })

// Manually start a pending job
trpc.batch.startJob.mutate({ jobId: string })
```

## Phase Configuration

### Phase Options

```typescript
{
  name: string; // Unique identifier for this phase
  taskType?: string; // Task type for ChainOrchestrator routing
  model?: string; // Override model selection (e.g., "anthropic/claude-opus-4")
  useRAG?: boolean; // Enable RAG context retrieval
  validation?: {
    enabled: boolean;
    minScore?: number; // 1-10
  };
}
```

### Supported Task Types

Uses existing ChainOrchestrator task types:
- `code` - Code generation/analysis
- `research` - Research and information gathering
- `creative` - Creative writing
- `analysis` - Data analysis
- `chat` - Conversational
- `summarization` - Text summarization
- `translation` - Language translation
- `entity_extraction` - Extract entities
- `ocr_cleanup` - OCR text cleanup
- `xml_tagging` - XML/HTML tagging

## Best Practices

### 1. Choose Appropriate Concurrency

```typescript
// OCR/Vision tasks (slow, expensive)
concurrency: 3-5

// Text generation (medium speed/cost)
concurrency: 5-10

// Embeddings (fast, cheap)
concurrency: 10-20

// Consider your rate limits!
```

### 2. Checkpoint Frequency

```typescript
// Long-running items (translation, analysis)
checkpointFrequency: 5 // Save often

// Fast items (embeddings, simple transforms)
checkpointFrequency: 20 // Save less frequently

// Trade-off: More checkpoints = more DB writes vs better recovery
```

### 3. Validation Strategy

```typescript
// Enable validation for critical phases
{
  name: 'translation',
  validation: {
    enabled: true,
    minScore: 9 // Strict for final output
  }
}

// Skip validation for intermediate phases
{
  name: 'extract_entities',
  validation: {
    enabled: false // Speed over quality for intermediate data
  }
}
```

### 4. Use RAG Wisely

```typescript
// Enable RAG when you need context
{
  name: 'categorization',
  useRAG: true // Use existing category examples
}

// Disable RAG when processing is self-contained
{
  name: 'ocr_cleanup',
  useRAG: false // OCR doesn't need document context
}
```

## Database Migration

Before using batch processing, run the database migration:

```bash
npm run db:migrate
```

This creates:
- `batch_jobs` table
- `batch_items` table

## Monitoring in Production

### Check Job Status Periodically

```typescript
const pollJobStatus = async (jobId: string) => {
  const interval = setInterval(async () => {
    const status = await trpc.batch.getJobStatus.query({ jobId });

    console.log(`Progress: ${status.status.progress.percentComplete}%`);

    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(status.status.status)) {
      clearInterval(interval);
      console.log(`Job ${status.status.status}`);
    }
  }, 5000); // Poll every 5 seconds
};
```

### Handle Failures Gracefully

```typescript
try {
  const result = await trpc.batch.createJob.mutate({ ... });
  await pollJobStatus(result.job.id);
} catch (error) {
  console.error('Batch job failed:', error);

  // Retry logic
  await trpc.batch.resumeJob.mutate({ jobId });
}
```

## Limitations

- **Max items per batch**: 10,000
- **Max phases per pipeline**: 10
- **Max concurrency**: 50
- **No DAG execution yet**: Phases run sequentially (not parallel branches)
- **PostgreSQL storage only**: S3 workspace support coming later

## Roadmap

**Phase 1** (Current):
- ✅ Multi-phase sequential pipelines
- ✅ Automatic checkpointing
- ✅ Concurrency control
- ✅ Cost/performance tracking

**Phase 2** (Next):
- ⏳ Pipeline templates (reusable workflows)
- ⏳ Budget limits and alerts
- ⏳ Workspace management (S3 storage)
- ⏳ Advanced analytics dashboard

**Phase 3** (Future):
- ⏳ DAG execution (parallel phases)
- ⏳ A/B testing framework
- ⏳ Custom validators
- ⏳ Streaming results

## Troubleshooting

### Job Stuck in RUNNING

```typescript
// Check if executor crashed
const status = await trpc.batch.getJobStatus.query({ jobId });

if (status.status.status === 'RUNNING' &&
    Date.now() - status.status.startedAt > 3600000) {
  // Stalled for >1 hour, likely crashed
  await trpc.batch.pauseJob.mutate({ jobId });
  await trpc.batch.resumeJob.mutate({ jobId });
}
```

### High Failure Rate

```typescript
const analytics = await trpc.batch.getJobAnalytics.query({ jobId });

if (analytics.analytics.overall.successRate < 70) {
  console.log('High failure rate, check:');
  console.log('- Validation thresholds too strict?');
  console.log('- Input data quality issues?');
  console.log('- Model selection appropriate?');
}
```

### Unexpected Costs

```typescript
const analytics = await trpc.batch.getJobAnalytics.query({ jobId });

console.log('Cost breakdown:');
analytics.analytics.cost.byPhase.forEach(phase => {
  console.log(`${phase.phase}: $${phase.cost}`);
});

// Identify expensive phases and consider:
// - Using cheaper models
// - Reducing validation retries
// - Adjusting prompt complexity
```

## Examples

See `examples/batch-processing/` for complete examples:
- `document-pipeline.ts` - Process PDFs through multi-phase pipeline
- `translation-workflow.ts` - Book translation example
- `embedding-regeneration.ts` - Bulk embedding updates

## Support

- GitHub Issues: https://github.com/yourusername/ai-workflow-engine/issues
- Documentation: `/docs/BATCH_PROCESSING.md`
- API Reference: Generated TypeScript types in tRPC client
