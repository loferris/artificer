# Prefect Workflows for Artificer

This guide explains how to use Prefect with Artificer SDK for stateful, orchestrated document processing workflows.

## Overview

**Prefect** provides:
- ✅ **Stateful execution** - Resume from failures, track workflow history
- ✅ **Parallel execution** - True parallelism with ConcurrentTaskRunner
- ✅ **Retry logic** - Per-task retry policies with exponential backoff
- ✅ **Dashboard UI** - Visual flow runs, logs, task states
- ✅ **Partial failure handling** - Continue when some tasks fail
- ✅ **Scheduling** - Cron, intervals, event triggers
- ✅ **Observability** - Task-level metrics and logging

**Artificer SDK** provides:
- Document processing via gRPC (PDF, images, text, conversions)
- High-performance binary protocol
- Type-safe operations

**Together**, they enable complex document processing pipelines with enterprise-grade orchestration.

## Quick Start

### 1. Start Services

```bash
# Start Prefect server, PostgreSQL, and Artificer services
docker-compose -f docker-compose.prefect.yml up -d

# Check services are healthy
docker ps

# Access Prefect UI
open http://localhost:4200
```

### 2. Run Your First Flow

```python
# python/flows/examples/hello_workflow.py
from prefect import flow, task
from artificer_client import ArtificerClient

@task(retries=2)
def convert_markdown():
    with ArtificerClient("localhost:50051") as client:
        result = client.conversion.import_markdown("# Hello Prefect!")
        return result["document"]

@flow(name="hello-workflow")
def hello_workflow():
    doc = convert_markdown()
    print(f"Created document: {doc}")
    return doc

if __name__ == "__main__":
    hello_workflow()
```

Run it:
```bash
cd python
python flows/examples/hello_workflow.py
```

Check the Prefect UI at http://localhost:4200 to see the flow run!

## Architecture

```
┌──────────────┐
│  Your Code   │  ← Define flows in Python
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ Prefect API  │  ← Submit flows, track state
│ (Port 4200)  │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│Prefect Agent │  ← Executes flows
└──────┬───────┘
       │
       ├─→ Artificer gRPC (Port 50051)  ← Document processing
       │
       └─→ FableForge API (Port 8080)   ← Custom webhooks
```

## Translation Pipeline Example

The **translation_pipeline** demonstrates the FableForge multi-specialist pattern:

```python
from flows.translation_pipeline import translation_pipeline

# Execute pipeline
result = await translation_pipeline(
    text="안녕하세요, 이것은 테스트입니다.",
    language="kor",
    min_successful_specialists=3,  # Need 3/5 to succeed
    selection_strategy="ensemble"
)

print(f"Translation: {result['final_translation']}")
print(f"Specialists used: {result['metadata']['successful_specialists']}")
```

### Pipeline Stages

1. **Cleanup** (sequential)
   - Text normalization
   - Single task, must succeed

2. **Tagging** (sequential)
   - Linguistic annotation
   - Single task, must succeed

3. **Refinement** (parallel - fan-out)
   - 5 specialists run concurrently:
     - Cultural specialist
     - Prose specialist
     - Dialogue specialist
     - Narrative specialist
     - Fluency specialist
   - Partial failure allowed (3/5 minimum)

4. **Selection** (fan-in)
   - Combine results from successful specialists
   - Pick best candidate

### Partial Failure Handling

```python
# In translation_pipeline.py

# Submit 5 specialists in parallel
refinement_futures = [
    fableforge_refine.submit(context, specialist=spec)
    for spec in ['cultural', 'prose', 'dialogue', 'narrative', 'fluency']
]

# Collect results, allow failures
successful_results = []
failed_specialists = []

for specialist, future in zip(specialists, refinement_futures):
    try:
        result = await future.result()
        successful_results.append(result)
    except Exception as e:
        failed_specialists.append({'specialist': specialist, 'error': str(e)})

# Check minimum threshold
if len(successful_results) < 3:
    raise ValueError(f"Only {len(successful_results)}/5 succeeded, need 3")
```

## Document Processing Pipelines

### PDF to HTML

```python
from flows.document_processing import pdf_to_html_pipeline

with open("document.pdf", "rb") as f:
    pdf_data = f.read()

result = pdf_to_html_pipeline(
    pdf_data=pdf_data,
    include_styles=True,
    title="My Document"
)

print(result["html"])
print(f"Processed in {result['processing_stats']['total_ms']}ms")
```

### Batch PDF Processing

```python
from flows.document_processing import batch_pdf_processing

pdf_files = [
    {"filename": "doc1.pdf", "data": open("doc1.pdf", "rb").read()},
    {"filename": "doc2.pdf", "data": open("doc2.pdf", "rb").read()},
    {"filename": "doc3.pdf", "data": open("doc3.pdf", "rb").read()},
]

# Process all PDFs in parallel
results = batch_pdf_processing(pdf_files)

for result in results:
    if result["status"] == "success":
        print(f"{result['filename']}: {len(result['text'])} chars extracted")
```

### Image OCR Pipeline

```python
from flows.document_processing import image_ocr_pipeline

images = [
    {"data": open("page1.png", "rb").read(), "content_type": "image/png"},
    {"data": open("page2.png", "rb").read(), "content_type": "image/png"},
]

result = image_ocr_pipeline(images, min_confidence=0.7)

print(f"Extracted {result['statistics']['total_chars_extracted']} chars")
print(f"High confidence: {result['statistics']['high_confidence_count']}/{len(images)}")
```

## Task Definitions

### Artificer Tasks

All Artificer SDK operations are wrapped as Prefect tasks with retry logic:

```python
from flows.tasks.artificer_tasks import (
    extract_pdf_text,      # Extract text from PDF
    process_pdf,           # PDF with OCR fallback
    chunk_document,        # Chunk text
    import_markdown,       # Import markdown
    export_html,           # Export to HTML
    export_markdown,       # Export to markdown
    count_tokens,          # Count LLM tokens
    ocr_image,            # Image OCR
    health_check,         # Service health
)
```

Task features:
- **Retries**: 2 retries with 5s delay
- **Caching**: PDF extraction cached for 1 hour
- **Logging**: Automatic logging via Prefect

### Webhook Tasks

Call external services (like FableForge) with retry logic:

```python
from flows.tasks.webhook_tasks import (
    webhook_call,              # Generic webhook
    fableforge_refine,         # Specialist refinement
    fableforge_tag,            # Linguistic tagging
    fableforge_select_best,    # Selection
)
```

Task features:
- **Retries**: 3 retries with exponential backoff [10s, 30s, 60s]
- **Timeout**: 60s per request
- **Error handling**: Proper HTTP error handling

## Creating Custom Flows

### Basic Flow

```python
from prefect import flow, task
from artificer_client import ArtificerClient

@task(retries=2)
def my_processing_task(input_data):
    with ArtificerClient("localhost:50051") as client:
        # Your processing logic
        return client.conversion.import_markdown(input_data)

@flow(name="my-custom-flow")
def my_custom_flow(data):
    result = my_processing_task(data)
    return result

# Execute
my_custom_flow("# My data")
```

### Parallel Tasks

```python
from prefect import flow, task
from prefect.task_runners import ConcurrentTaskRunner

@task
def process_item(item):
    # Process single item
    return f"Processed: {item}"

@flow(task_runner=ConcurrentTaskRunner())
def parallel_flow(items):
    # Submit all tasks in parallel
    futures = [process_item.submit(item) for item in items]

    # Wait for all results
    results = [future.result() for future in futures]

    return results

# Process 10 items in parallel
parallel_flow(range(10))
```

### Conditional Logic

```python
@flow
def conditional_flow(use_ocr: bool):
    if use_ocr:
        result = process_pdf_with_ocr()
    else:
        result = extract_pdf_text()

    return result
```

### Sub-flows

```python
@flow
def sub_flow(data):
    return process_data(data)

@flow
def main_flow():
    # Call sub-flow
    result1 = sub_flow("data1")
    result2 = sub_flow("data2")

    return combine(result1, result2)
```

## Deployment

### Deploy to Prefect Cloud

```bash
# Login to Prefect Cloud
prefect cloud login

# Deploy flow
prefect deployment build flows/translation_pipeline.py:translation_pipeline \
    --name "production-translation" \
    --tag "production" \
    --work-queue "default"

prefect deployment apply translation_pipeline-deployment.yaml

# Start agent
prefect agent start -q default
```

### Deploy with Docker

```bash
# Build custom agent image
docker build -t artificer-agent -f Dockerfile.agent .

# Run agent
docker run -d \
  -e PREFECT_API_URL=https://api.prefect.cloud/... \
  -e ARTIFICER_GRPC_HOST=artificer.example.com:50051 \
  artificer-agent
```

## Scheduling

### Cron Schedule

```python
from prefect.deployments import Deployment
from prefect.server.schemas.schedules import CronSchedule

deployment = Deployment.build_from_flow(
    flow=translation_pipeline,
    name="nightly-translation",
    schedule=CronSchedule(cron="0 2 * * *"),  # 2 AM daily
)

deployment.apply()
```

### Interval Schedule

```python
from prefect.server.schemas.schedules import IntervalSchedule
from datetime import timedelta

deployment = Deployment.build_from_flow(
    flow=health_check_flow,
    name="health-check-every-5min",
    schedule=IntervalSchedule(interval=timedelta(minutes=5)),
)
```

## Monitoring & Observability

### Prefect UI

Access at http://localhost:4200

- **Flow Runs**: See all executions, filter by status
- **Task Runs**: Drill down to individual tasks
- **Logs**: Real-time streaming logs
- **Timeline**: Visual task execution timeline
- **Artifacts**: Store outputs, screenshots, data

### Custom Logging

```python
from prefect import get_run_logger

@task
def my_task():
    logger = get_run_logger()
    logger.info("Starting processing")
    logger.warning("Low confidence detected")
    logger.error("Processing failed")
```

### Metrics

```python
from prefect import task
from prefect.artifacts import create_markdown_artifact

@task
def create_report(stats):
    # Create markdown artifact
    create_markdown_artifact(
        key="processing-report",
        markdown=f"# Processing Report\n\n- Total: {stats['total']}\n- Success: {stats['success']}"
    )
```

## Testing

### Mock FableForge Service

For testing, use the mock FableForge server:

```bash
# Start mock service
python python/flows/examples/fableforge_mock.py

# Or via Docker Compose
docker-compose -f docker-compose.prefect.yml up fableforge-mock
```

The mock service simulates:
- Tagging endpoint with random delays
- Refinement specialists with 10% random failures
- Selection logic with different strategies

### Unit Tests

```python
from prefect.testing.utilities import prefect_test_harness
from flows.translation_pipeline import translation_pipeline

def test_translation_pipeline():
    with prefect_test_harness():
        # Run flow in test mode
        result = translation_pipeline(
            text="Test text",
            language="kor",
            min_successful_specialists=3
        )

        assert result["metadata"]["specialists_succeeded"] >= 3
```

## Configuration

### Environment Variables

```bash
# .env file
PREFECT_API_URL=http://localhost:4200/api
ARTIFICER_GRPC_HOST=localhost:50051
FABLEFORGE_URL=http://localhost:8080
OPENAI_API_KEY=sk-...
OCR_MODEL=gpt-4o-mini
```

### Task Configuration

```python
@task(
    retries=3,                    # Retry count
    retry_delay_seconds=[5, 10, 30],  # Exponential backoff
    timeout_seconds=120,          # Task timeout
    cache_key_fn=my_cache_fn,     # Cache strategy
    cache_expiration=3600,        # Cache TTL
    tags=["production", "pdf"],   # Tags for filtering
    task_run_name="process-{pdf_id}",  # Dynamic name
)
def my_task(pdf_id):
    pass
```

## Best Practices

1. **Use context managers** for Artificer client:
   ```python
   with ArtificerClient(host) as client:
       result = client.pdf.extract_text(data)
   ```

2. **Handle partial failures** in parallel tasks:
   ```python
   results = []
   for future in futures:
       try:
           results.append(future.result())
       except Exception as e:
           logger.warning(f"Task failed: {e}")
   ```

3. **Cache expensive operations**:
   ```python
   @task(cache_key_fn=lambda ctx, params: f"pdf_{hash(params['data'])}")
   def extract_pdf(data):
       # Won't re-run for same PDF
       pass
   ```

4. **Use appropriate retry strategies**:
   ```python
   # Quick operations: few retries, short delay
   @task(retries=2, retry_delay_seconds=5)
   def quick_task(): pass

   # LLM calls: more retries, longer delays
   @task(retries=3, retry_delay_seconds=[10, 30, 60])
   def llm_task(): pass
   ```

5. **Log generously**:
   ```python
   logger = get_run_logger()
   logger.info("Processing started")
   logger.debug(f"Intermediate result: {result}")
   ```

## Troubleshooting

### Flow not appearing in UI

```bash
# Check Prefect API URL
prefect config view

# Check agent is running
docker logs artificer-prefect-agent
```

### Tasks failing with connection errors

```bash
# Check Artificer gRPC is running
grpcurl -plaintext localhost:50051 list

# Check health
docker logs artificer-grpc
```

### Database errors

```bash
# Reset Prefect database
prefect server database reset -y
```

## Resources

- **Prefect Docs**: https://docs.prefect.io/
- **Artificer SDK**: `python/artificer_client/README.md`
- **gRPC Guide**: `python/GRPC_README.md`
- **Flow Examples**: `python/flows/`

## Next Steps

1. ✅ Run example flows
2. ✅ Create custom flows for your use case
3. ✅ Deploy to production
4. ✅ Set up monitoring and alerts
5. ✅ Scale with Prefect Cloud or Kubernetes
