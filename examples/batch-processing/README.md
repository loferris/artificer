# Batch Processing Examples

This directory contains example scripts demonstrating the batch processing capabilities of artificer.

## Prerequisites

1. **Database Migration**:
   ```bash
   npm run db:migrate
   ```

2. **Environment Variables**:
   ```bash
   # .env
   OPENAI_API_KEY="your_key_here"
   DATABASE_URL="postgresql://..."
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

## Examples

### 1. Validation Spike (`validation-spike.ts`)

Comprehensive test suite that validates all batch processing features.

**What it tests**:
- ✅ Single-phase pipeline (summarization)
- ✅ Multi-phase pipeline (extract → summarize → categorize)
- ✅ Pause and resume functionality
- ✅ Progress monitoring
- ✅ Cost tracking and analytics
- ✅ Job listing

**Run it**:
```bash
npm run tsx examples/batch-processing/validation-spike.ts
```

**Expected output**:
```
[INFO] Starting batch processing validation spike
[INFO] Test environment ready { userId: '...', documentCount: 10 }
[INFO] === Test 1: Single-Phase Summarization ===
[INFO] Job progress { progress: '5/10 (50.0%)', cost: '$0.0234' }
[INFO] === Job 1 Complete === { successRate: '100%', totalCost: '$0.0456' }
...
[INFO] Validation spike complete. System is ready for production use!
```

**Duration**: ~3-5 minutes (processes 25 documents through multiple pipelines)

### 2. Quick Start (`quick-start.ts`)

Minimal example to get started quickly.

**What it does**:
- Processes 3 sample documents through a single summarization phase
- Shows basic job creation, monitoring, and results retrieval

**Run it**:
```bash
npm run tsx examples/batch-processing/quick-start.ts
```

**Duration**: ~30 seconds

### 3. Document Pipeline (`document-pipeline.ts`)

Realistic example for processing research papers through a multi-phase pipeline.

**Pipeline**:
1. **OCR Cleanup** - Clean up any OCR artifacts
2. **Entity Extraction** - Extract key terms, people, organizations
3. **Summarization** - Generate concise summaries
4. **Categorization** - Classify by topic

**Run it**:
```bash
npm run tsx examples/batch-processing/document-pipeline.ts
```

### 4. Translation Workflow (`translation-workflow.ts`)

Example of processing book chapters through cleanup → tagging → translation.

**Pipeline**:
1. **Korean Cleanup** - Normalize text formatting
2. **XML Tagging** - Add character/scene tags
3. **Translation** - Translate to English with premium model

**Run it**:
```bash
npm run tsx examples/batch-processing/translation-workflow.ts
```

## Understanding the Output

### Progress Monitoring

During execution, you'll see progress updates:

```json
{
  "jobId": "cm3x...",
  "status": "RUNNING",
  "progress": "7/10 (70.0%)",
  "cost": "$0.0341",
  "phase": "summarize"
}
```

### Final Analytics

After completion:

```json
{
  "totalItems": 10,
  "completed": 10,
  "failed": 0,
  "successRate": "100%",
  "totalCost": "$0.0487",
  "avgCostPerItem": "$0.0049",
  "avgProcessingTime": "2341ms"
}
```

### Phase Breakdown

For multi-phase jobs:

```json
{
  "phases": [
    { "phase": "extract_entities", "avgTime": "1523ms", "totalCost": "$0.0123" },
    { "phase": "summarize", "avgTime": "2134ms", "totalCost": "$0.0234" },
    { "phase": "categorize", "avgTime": "987ms", "totalCost": "$0.0089" }
  ]
}
```

## Cost Estimates

Based on typical usage with GPT-4o-mini:

| Job Type | Items | Phases | Est. Cost | Duration |
|----------|-------|--------|-----------|----------|
| Simple Summarization | 100 | 1 | $0.50 | 5 min |
| Entity Extraction | 100 | 1 | $0.30 | 3 min |
| Multi-phase Pipeline | 100 | 3 | $1.50 | 15 min |
| Translation (Claude Opus) | 30 | 3 | $12.00 | 20 min |

*Costs vary based on document length and model selection*

## Troubleshooting

### "Database tables not found"

**Problem**: Migration hasn't been run
**Solution**:
```bash
npm run db:migrate
```

### "OCR service not configured"

**Problem**: Missing OPENAI_API_KEY
**Solution**: Add to `.env` file:
```bash
OPENAI_API_KEY="sk-..."
```

### High failure rate

**Problem**: Validation too strict or model selection issues
**Solution**: Check validation thresholds in phase config:
```typescript
validation: {
  enabled: true,
  minScore: 7 // Lower this if getting too many failures
}
```

### Job stuck in RUNNING

**Problem**: Executor may have crashed
**Solution**: Resume from checkpoint:
```typescript
await batchJobService.resumeJob(jobId);
```

## Creating Custom Examples

Basic template:

```typescript
import { PrismaClient } from '@prisma/client';
import { BatchJobService } from '../../src/server/services/batch/BatchJobService';
import { ChainOrchestrator } from '../../src/server/services/orchestration/ChainOrchestrator';

const db = new PrismaClient();
const chainOrchestrator = new ChainOrchestrator(db);
const batchService = new BatchJobService(db, chainOrchestrator);

async function main() {
  const job = await batchService.createBatchJob({
    name: 'My Custom Job',
    items: [
      { content: 'Document 1 text...' },
      { content: 'Document 2 text...' }
    ],
    phases: [
      {
        name: 'process',
        taskType: 'summarization',
        validation: { enabled: true, minScore: 8 }
      }
    ],
    options: {
      concurrency: 5,
      checkpointFrequency: 10,
      autoStart: true
    }
  });

  // Monitor progress
  const interval = setInterval(async () => {
    const status = await batchService.getJobStatus(job.id);
    console.log(status.progress);

    if (status.status === 'COMPLETED') {
      clearInterval(interval);
      const results = await batchService.getJobResults(job.id);
      console.log(results);
    }
  }, 2000);
}

main().finally(() => db.$disconnect());
```

## Next Steps

After running the validation spike:

1. **Review the documentation**: `/docs/BATCH_PROCESSING.md`
2. **Check the implementation status**: `/docs/IMPLEMENTATION_SUMMARY.md`
3. **Build your own pipelines**: Use these examples as templates
4. **Monitor costs**: Check analytics to optimize your pipelines
5. **Create pipeline templates**: Reuse successful configurations

## Support

- Main documentation: `/docs/BATCH_PROCESSING.md`
- Implementation guide: `/docs/IMAGE_OCR_IMPLEMENTATION_STATUS.md`
- GitHub Issues: Report bugs or request features
