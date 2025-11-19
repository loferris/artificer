# Artificer Python Client

A unified Python SDK for the Artificer API, providing access to all features:

- **Projects & Documents** - Organize and manage documents with automatic embeddings
- **Semantic Search** - Vector-powered semantic search across your documents
- **Conversations & Chat** - AI chat with intelligent model routing
- **Batch Processing** - Multi-phase batch workflows with checkpointing
- **OCR & Images** - Extract text from PDFs and images (10-20x faster with Python service)
- **Export** - Export to Markdown, Notion, Roam, Obsidian, HTML, JSON
- **Workflows** - Execute Prefect orchestration workflows (DAG pipelines)

## Installation

```bash
pip install artificer-client
```

Or install from source:

```bash
cd python/artificer_client
pip install -e .
```

## Quick Start

```python
from artificer_client import ArtificerClient

# Initialize client
client = ArtificerClient(
    api_url="http://localhost:3000",
    api_key="sk_your_key_here"  # Optional for local dev
)

# Create project
project = client.projects.create(
    name="Knowledge Base",
    description="RAG vector database"
)

# Upload document (automatic processing: extract → chunk → embed)
with open("document.pdf", "rb") as f:
    doc = client.projects.upload_document(
        project['project']['id'],
        "document.pdf",
        f.read(),
        "application/pdf"
    )

# Semantic search
results = client.search.search_documents(
    project['project']['id'],
    query="What is the main topic?",
    limit=5,
    min_score=0.8
)

for result in results['results']:
    print(f"Score: {result['score']:.2f}")
    print(f"Content: {result['content'][:100]}...")

# Chat with context
conv = client.conversations.create(
    title="Q&A Session",
    project_id=project['project']['id']
)

response = client.chat.send_message(
    conv['conversation']['id'],
    "Summarize the key points from the documents"
)

print(response['message']['content'])
```

## Features

### Projects & Documents

```python
# Create project
project = client.projects.create("My Project")

# Upload document
with open("report.pdf", "rb") as f:
    doc = client.projects.upload_document(
        project['project']['id'],
        "report.pdf",
        f.read(),
        "application/pdf"
    )

# List documents
docs = client.projects.list_documents(project['project']['id'])

# Get project stats
stats = client.projects.get_stats(project['project']['id'])
print(f"Documents: {stats['documentCount']}")
```

### Semantic Search

```python
# Search with similarity threshold
results = client.search.search_documents(
    project_id="proj_123",
    query="machine learning applications",
    limit=10,
    min_score=0.7
)

# Re-index a document
client.search.reindex_document("doc_123")

# Get search stats
stats = client.search.get_stats("proj_123")
print(f"Total chunks: {stats['totalChunks']}")
```

### Conversations & Chat

```python
# Create conversation
conv = client.conversations.create(
    title="Product Questions",
    model="gpt-4o",
    temperature=0.7,
    max_tokens=2000
)

# Send message
response = client.chat.send_message(
    conv['conversation']['id'],
    "What are the key features?"
)

# Intelligent routing (automatic model selection)
response = client.chat.send_with_orchestration(
    conv['conversation']['id'],
    "Analyze this complex data..."
)
print(f"Model used: {response['chainMetadata']['strategy']}")
print(f"Cost: ${response['chainMetadata']['cost']:.4f}")

# List conversations
conversations = client.conversations.list()
```

### Batch Processing

```python
# Create multi-phase batch job
job = client.batch.create_job(
    name="Document Analysis Pipeline",
    items=[
        {"input": "Document 1 content..."},
        {"input": "Document 2 content..."},
        {"input": "Document 3 content..."}
    ],
    phases=[
        {
            "name": "Summarize",
            "taskType": "summarization",
            "model": "gpt-4o-mini"
        },
        {
            "name": "Extract Entities",
            "taskType": "extraction",
            "model": "gpt-4o"
        }
    ],
    concurrency=10,
    checkpoint_frequency=5,
    auto_start=True
)

# Monitor progress
import time
while True:
    status = client.batch.get_status(job['job']['id'])
    progress = status['status']['progress']
    print(f"Progress: {progress['percentComplete']:.1f}%")

    if status['status']['status'] == 'COMPLETED':
        break

    time.sleep(5)

# Get results
results = client.batch.get_results(job['job']['id'])
for item in results['items']:
    print(item['output'])

# Get analytics
analytics = client.batch.get_analytics(job['job']['id'])
print(f"Total cost: ${analytics['analytics']['costIncurred']:.4f}")
print(f"Avg time: {analytics['analytics']['avgProcessingTimeMs']}ms")
```

### OCR & Images

```python
# Extract text from image
with open("receipt.jpg", "rb") as f:
    result = client.images.extract_text(
        f.read(),
        "image/jpeg"
    )
print(f"Text: {result['text']}")
print(f"Confidence: {result['confidence']}")

# Analyze image with AI
with open("chart.png", "rb") as f:
    analysis = client.images.analyze(
        f.read(),
        prompt="What insights can you extract from this chart?"
    )

# Process PDF (10-20x faster with Python service)
with open("document.pdf", "rb") as f:
    result = client.images.process_pdf(f.read())
print(f"Pages: {result['result']['metadata']['pages']}")
print(f"Text: {result['result']['text'][:200]}")

# Check if PDF needs OCR (cost estimate)
with open("scanned.pdf", "rb") as f:
    check = client.images.check_pdf_needs_ocr(f.read())
if check['result']['needsOCR']:
    print(f"Estimated cost: ${check['result']['estimatedCost']:.4f}")
```

### Export

```python
# Export conversation to Notion
export = client.export.export_conversation(
    "conv_123",
    format="notion",
    include_metadata=True
)

# Post to Notion API
import json
notion_blocks = json.loads(export['data'])

# Export to Obsidian
export = client.export.export_conversation(
    "conv_123",
    format="obsidian"
)
with open("conversation.md", "w") as f:
    f.write(export['data'])

# Export all conversations
export = client.export.export_all(
    format="markdown",
    group_by_conversation=True
)
```

### Monitoring

```python
# Health check
health = client.monitoring.get_health()
print(f"Status: {health['status']}")

# Python service stats
stats = client.monitoring.get_python_service_stats()
print(f"OCR available: {stats['ocr']['available']}")
print(f"Circuit state: {stats['ocr']['circuitBreaker']['state']}")

# Usage stats
usage = client.monitoring.get_usage_stats()
for model, stats in usage.items():
    print(f"{model}: {stats['requests']} requests")

# Model capabilities
caps = client.monitoring.get_model_capabilities()
for model in caps['models']:
    print(f"{model['name']}: ${model['pricing']['input']} per 1M tokens")
```

### Workflows (Prefect Orchestration)

```python
import base64

# List available workflows
workflows = client.workflows.list()
print(f"Prefect available: {workflows['available']}")
for wf in workflows['workflows']:
    print(f"{wf['id']}: {wf['description']}")

# PDF to HTML pipeline
with open("document.pdf", "rb") as f:
    pdf_data = base64.b64encode(f.read()).decode()

result = client.workflows.execute_pdf_to_html(
    pdf_data,
    include_styles=True,
    title="My Document"
)
html = result['result']['html']

# PDF with OCR and chunking
result = client.workflows.execute_pdf_with_ocr(
    pdf_data,
    chunk_size=1000,
    chunk_overlap=200
)
chunks = result['result']['chunks']
print(f"Extracted {len(chunks)} chunks")

# Batch PDF processing (parallel)
pdf_files = [
    {"filename": "doc1.pdf", "data": base64_pdf1},
    {"filename": "doc2.pdf", "data": base64_pdf2},
    {"filename": "doc3.pdf", "data": base64_pdf3}
]
result = client.workflows.execute_batch_pdf(
    pdf_files,
    max_workers=5
)
for item in result['result']['results']:
    print(f"{item['filename']}: {item['status']}")

# Translation with specialists (consensus)
result = client.workflows.execute_translation(
    text="Hello, world!",
    target_language="es",
    use_specialists=True
)
print(f"Translation: {result['result']['translation']}")
print(f"Confidence: {result['result']['confidence']}")
print(f"Models used: {result['result']['models_used']}")

# Image OCR
with open("receipt.jpg", "rb") as f:
    image_data = base64.b64encode(f.read()).decode()

result = client.workflows.execute_image_ocr(
    image_data,
    language="eng"
)
print(f"Text: {result['result']['text']}")
print(f"Confidence: {result['result']['confidence']}")

# Execute any workflow with custom inputs
result = client.workflows.execute(
    "pdf-to-html",
    {
        "pdf_data": pdf_data,
        "include_styles": True,
        "title": "Custom Title"
    }
)

# Check Prefect service health
health = client.workflows.health_check()
print(f"Available: {health['available']}")
```

#### Custom Workflows (Declarative DAGs)

Define custom DAG workflows using declarative configuration:

```python
# Define a custom workflow
workflow_def = {
    "name": "pdf-extract-and-chunk",
    "description": "Extract PDF and chunk into segments",
    "version": "1.0.0",
    "tasks": [
        {
            "id": "extract",
            "type": "extract_pdf_text",
            "inputs": {
                "pdf_data": "{{workflow.input.pdf_data}}"
            }
        },
        {
            "id": "chunk",
            "type": "chunk_document",
            "depends_on": ["extract"],
            "inputs": {
                "document_id": "{{workflow.input.document_id}}",
                "project_id": "{{workflow.input.project_id}}",
                "content": "{{extract.text}}",
                "chunk_size": 1000,
                "chunk_overlap": 200
            }
        }
    ],
    "output": {
        "chunks": "{{chunk.chunks}}",
        "metadata": "{{extract.metadata}}"
    },
    "options": {
        "parallel": False,
        "timeout": 300
    }
}

# Validate workflow definition
validation = client.workflows.validate_workflow_definition(workflow_def)
if not validation['valid']:
    print(f"Error: {validation['error']}")

# Register custom workflow
client.workflows.register_custom_workflow(
    "my-pdf-workflow",
    workflow_def
)

# Execute custom workflow
result = client.workflows.execute_custom_workflow(
    "my-pdf-workflow",
    {
        "pdf_data": pdf_data,
        "document_id": "doc_123",
        "project_id": "proj_456"
    }
)
print(f"Processed: {len(result['result']['chunks'])} chunks")

# List custom workflows
workflows = client.workflows.list_custom_workflows()
for wf in workflows['workflows']:
    print(f"{wf['id']}: {wf['name']} ({wf['taskCount']} tasks)")

# Get workflow definition
workflow = client.workflows.get_custom_workflow("my-pdf-workflow")

# Delete workflow
client.workflows.delete_custom_workflow("my-pdf-workflow")
```

**Available Task Types:**
- `extract_pdf_text` - Extract text from PDF
- `process_pdf` - Process PDF with OCR fallback
- `chunk_document` - Chunk document into overlapping segments
- `import_markdown` - Import markdown to Portable Text
- `import_html` - Import HTML to Portable Text
- `export_html` - Export Portable Text to HTML
- `export_markdown` - Export Portable Text to Markdown
- `count_tokens` - Count tokens in content
- `ocr_image` - Extract text from image using OCR
- `health_check` - Check Artificer service health

**Workflow Features:**
- DAG structure with `depends_on` relationships
- Input references: `{{workflow.input.key}}`
- Task output references: `{{task_id.output_key}}`
- Parallel execution: Set `options.parallel = True`
- Retry configuration: `options.retry_failed_tasks`, `options.max_retries`
- Timeout control: `options.timeout` (seconds)

#### Workflow Templates (Pre-built Patterns)

Use pre-built templates for common use cases:

```python
# Browse available templates
templates = client.workflows.list_templates()
for tmpl in templates['templates']:
    print(f"{tmpl['id']}: {tmpl['name']}")
    print(f"  Category: {tmpl['category']}")
    print(f"  Parameters: {list(tmpl['parameters'].keys())}")

# Get template details
template = client.workflows.get_template("rag-ingestion")
print(f"Description: {template['description']}")
print(f"Parameters: {template['parameters']}")

# Instantiate template with custom parameters
result = client.workflows.instantiate_template(
    "rag-ingestion",
    {
        "chunk_size": 500,
        "chunk_overlap": 100,
        "force_ocr": False
    },
    auto_register=True,
    workflow_id="my-rag-pipeline"
)

# Execute instantiated template
result = client.workflows.execute_custom_workflow(
    "my-rag-pipeline",
    {
        "pdf_data": pdf_data,
        "document_id": "doc_123",
        "project_id": "proj_456",
        "chunk_size": 500,
        "chunk_overlap": 100,
        "force_ocr": False
    }
)
chunks = result['result']['chunks']
```

**Available Templates:**

*Document Processing:*
- `rag-ingestion` - Extract PDF → Chunk for vector search/RAG
- `multi-format-conversion` - PDF → HTML + Markdown + Portable Text
- `document-analysis` - Extract → Count tokens → Analyze structure

*Content Processing:*
- `content-enhancement` - Extract → Clean → Export multiple formats
- `metadata-extraction` - Extract comprehensive document metadata

*Batch Processing:*
- `batch-rag-ingestion` - Process multiple PDFs in parallel for RAG

Templates provide:
- Ready-to-use patterns for common use cases
- Parameterization for customization
- Best practices built-in
- Quick setup vs custom workflows

#### Async Workflow Execution (Background Jobs)

Execute workflows asynchronously for long-running operations:

```python
# Execute workflow asynchronously
job = client.workflows.execute_async(
    workflow_id="pdf-to-html",
    inputs={
        "pdf_data": pdf_data,
        "include_styles": True,
        "title": "My Document"
    }
)

print(f"Job ID: {job['jobId']}")  # Returns immediately
print(f"Status: {job['status']}")  # PENDING

# Poll for job status
import time
while True:
    status = client.workflows.get_job_status(job['jobId'])
    print(f"Status: {status['status']} - {status['progress']['percentComplete']}%")

    if status['status'] == 'COMPLETED':
        result = status['result']
        print(f"Result: {result}")
        break
    elif status['status'] in ['FAILED', 'CANCELLED', 'TIMEOUT']:
        print(f"Job {status['status']}: {status.get('error', '')}")
        break

    time.sleep(2)

# Or use blocking wait helper
completed_job = client.workflows.wait_for_job(
    job_id=job['jobId'],
    poll_interval=2,  # Check every 2 seconds
    timeout=300  # Timeout after 5 minutes
)
print(f"Result: {completed_job['result']}")
```

**Webhook Callbacks (Fire-and-Forget):**

```python
# Execute with webhook notification
job = client.workflows.execute_async(
    workflow_id="batch-pdf-processing",
    inputs={"files": pdf_files},
    webhook={
        "url": "https://your-api.com/webhook/workflow-complete",
        "method": "POST",
        "headers": {
            "Authorization": "Bearer your-secret-token",
            "X-Custom-Header": "workflow-callback"
        }
    }
)

# Job runs in background and POSTs to webhook when complete:
# {
#   "jobId": "...",
#   "workflowId": "batch-pdf-processing",
#   "status": "COMPLETED",
#   "result": {...},
#   "metadata": {
#     "createdAt": "...",
#     "completedAt": "...",
#     "executionTime": 45000
#   }
# }
```

**Priority Queuing:**

```python
# High-priority job (queue front)
urgent_job = client.workflows.execute_async(
    workflow_id="document-analysis",
    inputs={"pdf_data": pdf_data},
    priority="high"  # "low" | "normal" | "high"
)

# Normal priority (default)
normal_job = client.workflows.execute_async(
    workflow_id="pdf-to-html",
    inputs={"pdf_data": pdf_data}
)
```

**Job Management:**

```python
# List all jobs
jobs = client.workflows.list_jobs()
print(f"Total jobs: {jobs['total']}")

# Filter by status
pending = client.workflows.list_jobs(status="PENDING")
running = client.workflows.list_jobs(status="RUNNING")
completed = client.workflows.list_jobs(status="COMPLETED")

# Filter by workflow
pdf_jobs = client.workflows.list_jobs(workflow_id="pdf-to-html")

# Filter by workflow type
custom_jobs = client.workflows.list_jobs(workflow_type="custom")

# Cancel a running job
client.workflows.cancel_job(job_id="job_123")

# Delete a completed job
client.workflows.delete_job(job_id="job_456")

# Get queue statistics
stats = client.workflows.get_job_stats()
print(f"Pending: {stats['byStatus']['PENDING']}")
print(f"Running: {stats['byStatus']['RUNNING']}")
print(f"Queue length: {stats['queue']['length']}")
print(f"Max concurrent: {stats['queue']['maxConcurrent']}")
```

**Execute Custom Workflows Asynchronously:**

```python
# Same async support for custom workflows
job = client.workflows.execute_custom_async(
    workflow_id="my-custom-workflow",
    inputs={
        "pdf_data": pdf_data,
        "document_id": "doc_123"
    },
    webhook={
        "url": "https://your-api.com/webhook"
    },
    priority="high"
)
```

**Batch Async Execution:**

```python
# Submit multiple jobs
job_ids = []
for pdf_file in pdf_files:
    job = client.workflows.execute_async(
        workflow_id="pdf-to-html",
        inputs={"pdf_data": pdf_file}
    )
    job_ids.append(job['jobId'])

# Wait for all to complete
results = []
for job_id in job_ids:
    completed = client.workflows.wait_for_job(job_id, timeout=120)
    results.append(completed['result'])

print(f"Processed {len(results)} files")
```

**Job States:**
- `PENDING` - Queued for execution
- `RUNNING` - Currently executing
- `COMPLETED` - Finished successfully
- `FAILED` - Execution error
- `CANCELLED` - Cancelled by user
- `TIMEOUT` - Exceeded timeout limit

**Features:**
- Non-blocking execution
- Webhook callbacks for completion
- Priority-based queuing
- Progress tracking (percent complete)
- Job lifecycle management
- Queue statistics and monitoring
- Works with all workflow types (pre-built, custom, templates)

## Context Manager Support

```python
# Automatic cleanup
with ArtificerClient(api_url="http://localhost:3000") as client:
    project = client.projects.create("Temp Project")
    # ... work with client
# Session automatically closed
```

## Error Handling

```python
from artificer_client import (
    ArtificerClient,
    APIError,
    AuthenticationError,
    NotFoundError,
    ValidationError
)

client = ArtificerClient(api_key="sk_key")

try:
    result = client.projects.create(name="My Project")
except AuthenticationError:
    print("Invalid API key")
except ValidationError as e:
    print(f"Validation failed: {e}")
except NotFoundError as e:
    print(f"Resource not found: {e}")
except APIError as e:
    print(f"API error ({e.status_code}): {e}")
```

## Configuration

### Environment Variables

```bash
# Set default API URL
export ARTIFICER_API_URL=http://localhost:3000

# Set API key
export ARTIFICER_API_KEY=sk_your_key_here
```

### Custom Timeout

```python
client = ArtificerClient(
    api_url="http://localhost:3000",
    api_key="sk_key",
    timeout=120,  # 2 minutes
    max_retries=5
)
```

## Complete Example

```python
from artificer_client import ArtificerClient

def main():
    # Initialize
    client = ArtificerClient(
        api_url="http://localhost:3000",
        api_key="sk_your_key"
    )

    # Create project
    project = client.projects.create(
        name="Product Documentation",
        description="RAG-powered documentation search"
    )
    project_id = project['project']['id']

    # Upload documents
    docs = ["guide.pdf", "manual.pdf", "faq.pdf"]
    for filename in docs:
        with open(filename, "rb") as f:
            client.projects.upload_document(
                project_id,
                filename,
                f.read(),
                "application/pdf"
            )
        print(f"Uploaded: {filename}")

    # Wait for embeddings (in production, use webhooks)
    import time
    time.sleep(10)

    # Create Q&A conversation
    conv = client.conversations.create(
        title="Product Q&A",
        project_id=project_id,
        model="gpt-4o"
    )
    conv_id = conv['conversation']['id']

    # Interactive Q&A
    while True:
        question = input("\nYour question (or 'quit'): ")
        if question.lower() == 'quit':
            break

        # Search for context
        results = client.search.search_documents(
            project_id,
            query=question,
            limit=3,
            min_score=0.7
        )

        # Build context
        context = "\n\n".join([
            f"[{r['metadata']['filename']}]: {r['content']}"
            for r in results['results']
        ])

        # Ask AI with context
        full_prompt = f"Context:\n{context}\n\nQuestion: {question}"
        response = client.chat.send_message(conv_id, full_prompt)

        print(f"\nAnswer: {response['message']['content']}")
        print(f"Cost: ${response['message']['cost']:.4f}")

if __name__ == "__main__":
    main()
```

## Requirements

- Python 3.8+
- requests >= 2.28.0

## Development

### Install development dependencies

```bash
pip install -e ".[dev]"
```

### Run tests

```bash
pytest
```

### Format code

```bash
black artificer_client/
```

### Type checking

```bash
mypy artificer_client/
```

## License

MIT License - see LICENSE file for details.

## Support

- GitHub Issues: https://github.com/loferris/artificer/issues
- Documentation: https://docs.artificer.dev
