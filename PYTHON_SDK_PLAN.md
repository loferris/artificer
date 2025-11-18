# Python SDK Implementation Plan

**Date:** 2025-11-17
**Branch:** claude/assess-ocr-support-015XMMfyGX8YkcZRhatfrVcU
**Related:** PYTHON_EXTRACTION_ASSESSMENT.md

## Executive Summary

This document outlines the plan to create a Python SDK for the AI Workflow Engine API, enabling Python applications to interact with the platform's conversation management, batch processing, OCR, and orchestration capabilities.

### Key Recommendations

**Recommended Approach:** Hybrid REST + tRPC Client
- Use REST endpoints for primary API (easier for Python ecosystem)
- Auto-generate client from OpenAPI spec
- Provide high-level Pythonic wrapper
- Support both sync and async operations

**Timeline:** 2-3 weeks for MVP, 4-6 weeks for complete SDK

**Integration:** Synergizes with Python extraction plan - SDK clients can call both TypeScript API and future Python microservices

---

## Current API State Analysis

### API Architecture

The AI Workflow Engine currently provides:

**1. tRPC Endpoints** (TypeScript-first)
- URL: `http://localhost:3001/`
- Protocol: JSON-RPC over HTTP
- Transformer: SuperJSON (supports Date, Map, Set, etc.)
- Authentication: Bearer token (API keys)

**2. REST/OpenAPI Endpoints** (Language-agnostic)
- URL: `http://localhost:3001/api/*` (partial)
- Protocol: Standard REST
- Documentation: `/docs` (Swagger UI)
- Spec: `/openapi.json`

**3. Available Routers** (13 total)
```
- chat              - Real-time chat with streaming
- conversations     - Conversation management
- messages          - Message CRUD operations
- batch             - Batch job processing (NEW in OCR branch)
- images            - OCR and image analysis (NEW in OCR branch)
- orchestration     - AI chain orchestration
- projects          - Project management
- export            - Data export functionality
- search            - Search operations
- usage             - Usage analytics
- monitoring        - System monitoring
- modelAdmin        - Model configuration
- auth              - Authentication (API keys)
```

### Authentication System

**API Key Support:**
- Located in: `src/server/services/auth/ApiKeyService.ts`
- Header format: `Authorization: Bearer <api-key>`
- Features:
  - Scoped permissions
  - IP whitelisting
  - Rate limiting
  - Usage tracking
  - Key rotation

**Generation:**
```bash
npm run generate-api-key
npm run list-api-keys
npm run revoke-api-key
```

### Current OpenAPI Coverage

**Documented Endpoints:**
- ✅ Health check
- ✅ Basic tRPC batch endpoint
- ✅ Conversation schemas
- ⚠️  Partial coverage for other routers

**Missing from OpenAPI:**
- ❌ Batch processing endpoints (critical for Python integration)
- ❌ Images/OCR endpoints (critical for Python integration)
- ❌ Orchestration endpoints
- ❌ Most other routers

**Action Required:** Expand OpenAPI spec before SDK generation

---

## Python SDK Design

### Architecture Options

#### Option 1: Pure REST Client (RECOMMENDED)
**Pros:**
- Standard Python ecosystem (requests, httpx)
- Easy to maintain and debug
- Works with any HTTP client
- OpenAPI code generation support
- Familiar to Python developers

**Cons:**
- Need to expand OpenAPI spec first
- May not support all tRPC features (streaming, SuperJSON)

**Libraries:**
- `httpx` - Modern async/sync HTTP client
- `pydantic` - Type-safe models matching API schemas
- `openapi-python-client` - Auto-generate from OpenAPI spec

#### Option 2: tRPC Python Client
**Pros:**
- Direct protocol support
- Feature parity with TypeScript client
- Automatic type safety

**Cons:**
- No official Python tRPC client exists
- Would need to implement SuperJSON deserializer
- More complex maintenance
- Less Pythonic

**Verdict:** Not recommended due to lack of ecosystem support

#### Option 3: Hybrid Approach (BEST)
**Pros:**
- REST for standard operations (95% of use cases)
- WebSocket for streaming chat
- Custom handling for advanced features
- Best developer experience

**Cons:**
- Slightly more complex implementation

**Verdict:** This is the recommended approach ✅

### Proposed SDK Architecture

```python
# High-level structure
artificer/
├── __init__.py
├── client.py              # Main SDK client
├── auth.py                # Authentication handling
├── exceptions.py          # Custom exceptions
├── models/                # Pydantic models (auto-generated)
│   ├── __init__.py
│   ├── conversation.py
│   ├── batch.py
│   ├── ocr.py
│   └── orchestration.py
├── resources/             # Resource-specific clients
│   ├── __init__.py
│   ├── conversations.py   # ConversationsResource
│   ├── batch.py           # BatchResource
│   ├── images.py          # ImagesResource
│   ├── orchestration.py   # OrchestrationResource
│   └── projects.py        # ProjectsResource
├── streaming.py           # WebSocket/SSE streaming support
└── types.py               # Type definitions
```

### Example SDK Usage

```python
from artificer import Artificer
from artificer.models import BatchJob, PhaseConfig

# Initialize client
client = Artificer(
    api_key="your-api-key",
    base_url="http://localhost:3001",
    timeout=30.0
)

# --- Conversations ---
conversation = client.conversations.create(
    title="Python SDK Test",
    model="deepseek-chat",
    system_prompt="You are a helpful assistant"
)

# Send message
response = client.conversations.send_message(
    conversation_id=conversation.id,
    content="Hello from Python!"
)

# --- OCR & Images ---
with open("document.pdf", "rb") as f:
    pdf_data = f.read()

# Check if OCR needed
ocr_check = client.images.check_pdf_needs_ocr(
    pdf_data=pdf_data,
    min_text_threshold=100
)

if ocr_check.needs_ocr:
    print(f"OCR required. Estimated cost: ${ocr_check.estimated_ocr_cost:.4f}")

# Process PDF with smart OCR
result = client.images.process_pdf(
    pdf_data=pdf_data,
    options={"force_ocr": False}
)

print(f"Extracted text: {result.text}")
print(f"Method used: {result.metadata.method}")  # 'direct' or 'ocr'
print(f"Pages: {result.metadata.pages}")

# Extract text from image
with open("screenshot.png", "rb") as f:
    image_data = f.read()

ocr_result = client.images.extract_text_from_image(
    image_data=image_data,
    content_type="image/png"
)

print(f"Text: {ocr_result.text}")
print(f"Confidence: {ocr_result.confidence}")

# --- Batch Processing ---
batch_job = client.batch.create(
    name="Document Processing Pipeline",
    items=[
        {"input": "Translate this to Spanish: Hello"},
        {"input": "Translate this to Spanish: Goodbye"},
        {"input": "Translate this to Spanish: Thank you"},
    ],
    phases=[
        PhaseConfig(
            name="translation",
            task_type="translate",
            model="gpt-4o-mini"
        ),
        PhaseConfig(
            name="validation",
            task_type="validate",
            validation={"enabled": True, "min_score": 7}
        )
    ],
    options={
        "concurrency": 3,
        "checkpoint_frequency": 10,
        "auto_start": True
    }
)

# Monitor job progress
while True:
    status = client.batch.get_status(batch_job.id)
    print(f"Progress: {status.completed_items}/{status.total_items}")

    if status.status in ["COMPLETED", "FAILED"]:
        break

    time.sleep(5)

# Get results
results = client.batch.get_results(batch_job.id)
for item in results:
    print(f"Input: {item.input}")
    print(f"Output: {item.output}")

# --- Orchestration ---
result = client.orchestration.execute(
    query="What is the capital of France?",
    task_type="qa",
    model="gpt-4o",
    use_rag=True,
    validation_config={"enabled": True, "min_score": 8}
)

print(f"Response: {result.response}")
print(f"Cost: ${result.cost:.4f}")
print(f"Tokens: {result.tokens}")

# --- Async Support ---
import asyncio

async def main():
    async with Artificer(api_key="key") as client:
        conversation = await client.conversations.create_async(
            title="Async Test"
        )

        response = await client.conversations.send_message_async(
            conversation_id=conversation.id,
            content="Hello async world!"
        )

asyncio.run(main())

# --- Streaming ---
for chunk in client.chat.stream(
    conversation_id=conversation.id,
    message="Tell me a story"
):
    print(chunk.content, end="", flush=True)
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Goals:**
- Set up SDK repository structure
- Implement authentication
- Create base HTTP client
- Basic error handling

**Deliverables:**
```python
# artificer/client.py
class Artificer:
    def __init__(self, api_key: str, base_url: str = "http://localhost:3001"):
        self.api_key = api_key
        self.base_url = base_url
        self._http = httpx.Client(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30.0
        )

    def _request(self, method: str, path: str, **kwargs):
        # Handle requests with error handling
        pass

# artificer/auth.py
class ApiKeyAuth:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def __call__(self, request: httpx.Request):
        request.headers["Authorization"] = f"Bearer {self.api_key}"
        return request

# artificer/exceptions.py
class ArtificerError(Exception):
    """Base exception"""

class AuthenticationError(ArtificerError):
    """API key invalid or missing"""

class RateLimitError(ArtificerError):
    """Rate limit exceeded"""

class ValidationError(ArtificerError):
    """Input validation failed"""
```

**Tasks:**
1. ✅ Create Python package structure
2. ✅ Implement httpx-based HTTP client
3. ✅ Add authentication layer
4. ✅ Create custom exceptions
5. ✅ Add basic logging
6. ✅ Write initial tests

### Phase 2: Expand OpenAPI Spec (Week 1-2)

**Goals:**
- Complete OpenAPI documentation for all endpoints
- Especially batch, images, orchestration routers

**Deliverables:**
```typescript
// src/server/openapi-spec.ts additions
export const openApiSpec = {
  // ... existing spec
  paths: {
    // ... existing paths

    // Batch processing endpoints
    '/api/batch': {
      post: {
        summary: 'Create batch job',
        tags: ['batch'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateBatchJob' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Batch job created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BatchJob' }
              }
            }
          }
        }
      }
    },

    // Images/OCR endpoints
    '/api/images/process-pdf': {
      post: {
        summary: 'Process PDF with OCR',
        tags: ['images'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['pdfData'],
                properties: {
                  pdfData: {
                    type: 'string',
                    format: 'byte',
                    description: 'Base64-encoded PDF'
                  },
                  options: {
                    type: 'object',
                    properties: {
                      forceOCR: { type: 'boolean' },
                      minTextThreshold: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'PDF processed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PdfProcessingResult' }
              }
            }
          }
        }
      }
    }
  },

  components: {
    schemas: {
      // Batch schemas
      CreateBatchJob: { /* ... */ },
      BatchJob: { /* ... */ },
      BatchItem: { /* ... */ },
      PhaseConfig: { /* ... */ },

      // OCR schemas
      PdfProcessingResult: { /* ... */ },
      OCRResult: { /* ... */ },

      // Orchestration schemas
      ChainExecutionRequest: { /* ... */ },
      ChainExecutionResult: { /* ... */ }
    }
  }
};
```

**Alternative Approach:** Auto-generate OpenAPI from tRPC
```typescript
// Use trpc-openapi plugin
import { generateOpenApiDocument } from 'trpc-openapi';
import { appRouter } from './root';

const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'AI Workflow Engine API',
  version: '1.0.0',
  baseUrl: 'http://localhost:3001',
});
```

**Tasks:**
1. Choose approach (manual vs auto-generation)
2. Add batch router schemas
3. Add images router schemas
4. Add orchestration router schemas
5. Validate OpenAPI spec with validators
6. Update Swagger UI

### Phase 3: Code Generation (Week 2)

**Goals:**
- Auto-generate Pydantic models from OpenAPI spec
- Generate resource clients

**Tools:**
```bash
# Option 1: openapi-python-client
pip install openapi-python-client
openapi-python-client generate --url http://localhost:3001/openapi.json

# Option 2: datamodel-code-generator (Pydantic models only)
pip install datamodel-code-generator
datamodel-codegen --url http://localhost:3001/openapi.json \
  --output artificer/models/generated.py \
  --input-file-type openapi

# Option 3: Custom Jinja2 templates
# More control over output
```

**Generated Models Example:**
```python
# artificer/models/batch.py (auto-generated)
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

class PhaseConfig(BaseModel):
    name: str = Field(min_length=1)
    task_type: Optional[str] = None
    model: Optional[str] = None
    use_rag: Optional[bool] = None
    validation: Optional['ValidationConfig'] = None

class ValidationConfig(BaseModel):
    enabled: bool
    min_score: Optional[float] = Field(None, ge=0, le=10)

class BatchItem(BaseModel):
    input: str = Field(min_length=1, max_length=100_000)
    metadata: Optional[dict] = None

class CreateBatchJobRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    project_id: Optional[str] = None
    items: List[BatchItem] = Field(min_length=1, max_length=10_000)
    phases: List[PhaseConfig] = Field(min_length=1, max_length=10)
    options: Optional['BatchOptions'] = None

class BatchOptions(BaseModel):
    concurrency: Optional[int] = Field(None, ge=1, le=50)
    checkpoint_frequency: Optional[int] = Field(None, ge=1, le=100)
    auto_start: Optional[bool] = None

class BatchJob(BaseModel):
    id: str
    name: str
    status: Literal["PENDING", "RUNNING", "PAUSED", "COMPLETED", "FAILED", "CANCELLED"]
    total_items: int
    completed_items: int
    failed_items: int
    current_phase: Optional[str]
    cost_incurred: float
    tokens_used: int
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

class BatchJobResult(BaseModel):
    item_index: int
    input: str
    output: Optional[str]
    status: str
    phase_outputs: dict
    errors: Optional[List[dict]]
```

**Tasks:**
1. Choose code generation tool
2. Generate initial models
3. Review and customize generated code
4. Add custom validations
5. Create type stubs for IDE support

### Phase 4: Resource Clients (Week 2-3)

**Goals:**
- Implement resource-specific client classes
- Add method documentation
- Type hints for all methods

**Implementation:**
```python
# artificer/resources/batch.py
from typing import List, Optional
from ..models.batch import (
    CreateBatchJobRequest,
    BatchJob,
    BatchJobResult,
    PhaseConfig
)
from ..client import BaseResource

class BatchResource(BaseResource):
    """
    Batch job processing for running multi-phase pipelines at scale.

    Example:
        >>> batch = client.batch.create(
        ...     name="Translation Pipeline",
        ...     items=[{"input": "Hello"}, {"input": "World"}],
        ...     phases=[PhaseConfig(name="translate", model="gpt-4o-mini")]
        ... )
        >>> status = client.batch.get_status(batch.id)
    """

    def create(
        self,
        name: str,
        items: List[dict],
        phases: List[PhaseConfig],
        project_id: Optional[str] = None,
        options: Optional[dict] = None
    ) -> BatchJob:
        """
        Create a new batch job.

        Args:
            name: Human-readable job name
            items: List of items to process (max 10,000)
            phases: Processing phases (max 10)
            project_id: Optional project association
            options: Batch execution options

        Returns:
            Created batch job

        Raises:
            ValidationError: Invalid input
            RateLimitError: Rate limit exceeded
        """
        request = CreateBatchJobRequest(
            name=name,
            items=items,
            phases=phases,
            project_id=project_id,
            options=options
        )

        response = self._post("/api/batch", json=request.dict())
        return BatchJob(**response.json())

    def get(self, job_id: str) -> BatchJob:
        """Get batch job by ID"""
        response = self._get(f"/api/batch/{job_id}")
        return BatchJob(**response.json())

    def get_status(self, job_id: str) -> BatchJob:
        """Get current status of batch job"""
        return self.get(job_id)

    def start(self, job_id: str) -> BatchJob:
        """Start a pending batch job"""
        response = self._post(f"/api/batch/{job_id}/start")
        return BatchJob(**response.json())

    def pause(self, job_id: str) -> BatchJob:
        """Pause a running batch job"""
        response = self._post(f"/api/batch/{job_id}/pause")
        return BatchJob(**response.json())

    def resume(self, job_id: str) -> BatchJob:
        """Resume a paused batch job"""
        response = self._post(f"/api/batch/{job_id}/resume")
        return BatchJob(**response.json())

    def cancel(self, job_id: str) -> BatchJob:
        """Cancel a batch job"""
        response = self._post(f"/api/batch/{job_id}/cancel")
        return BatchJob(**response.json())

    def get_results(self, job_id: str) -> List[BatchJobResult]:
        """Get all results for a completed batch job"""
        response = self._get(f"/api/batch/{job_id}/results")
        return [BatchJobResult(**item) for item in response.json()]

    def list(
        self,
        project_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[BatchJob]:
        """List batch jobs with optional filters"""
        params = {
            "project_id": project_id,
            "status": status,
            "limit": limit,
            "offset": offset
        }
        params = {k: v for k, v in params.items() if v is not None}

        response = self._get("/api/batch", params=params)
        return [BatchJob(**job) for job in response.json()]

    # Async versions
    async def create_async(self, *args, **kwargs) -> BatchJob:
        """Async version of create()"""
        # Implementation using httpx.AsyncClient
        pass

# artificer/resources/images.py
from typing import Optional
import base64
from ..models.ocr import OCRResult, PdfProcessingResult
from ..client import BaseResource

class ImagesResource(BaseResource):
    """
    OCR and image analysis using AI vision models.

    Example:
        >>> with open("document.pdf", "rb") as f:
        ...     pdf_data = f.read()
        >>> result = client.images.process_pdf(pdf_data)
        >>> print(result.text)
    """

    def extract_text_from_image(
        self,
        image_data: bytes,
        content_type: str = "image/png"
    ) -> OCRResult:
        """
        Extract text from image using OCR.

        Args:
            image_data: Image bytes (max 20MB)
            content_type: MIME type (e.g., image/png, image/jpeg)

        Returns:
            OCR result with extracted text and confidence
        """
        encoded = base64.b64encode(image_data).decode('utf-8')

        response = self._post("/api/images/extract-text", json={
            "imageData": encoded,
            "contentType": content_type
        })

        return OCRResult(**response.json())

    def process_pdf(
        self,
        pdf_data: bytes,
        options: Optional[dict] = None
    ) -> PdfProcessingResult:
        """
        Process PDF with smart text extraction.

        Tries direct extraction first, falls back to OCR if needed.

        Args:
            pdf_data: PDF bytes (max 50MB)
            options: Processing options
                - force_ocr: Force OCR even if text extractable
                - min_text_threshold: Minimum chars to skip OCR

        Returns:
            Processing result with text and metadata
        """
        encoded = base64.b64encode(pdf_data).decode('utf-8')

        response = self._post("/api/images/process-pdf", json={
            "pdfData": encoded,
            "options": options or {}
        })

        return PdfProcessingResult(**response.json())

    def check_pdf_needs_ocr(
        self,
        pdf_data: bytes,
        min_text_threshold: int = 100
    ) -> dict:
        """
        Check if PDF needs OCR and estimate cost.

        Args:
            pdf_data: PDF bytes
            min_text_threshold: Minimum chars to skip OCR

        Returns:
            Dictionary with:
                - needs_ocr: bool
                - has_text_content: bool
                - pages: int
                - text_length: int
                - estimated_ocr_cost: float (if needs OCR)
        """
        encoded = base64.b64encode(pdf_data).decode('utf-8')

        response = self._get("/api/images/check-pdf-needs-ocr", params={
            "pdfData": encoded,
            "minTextThreshold": min_text_threshold
        })

        return response.json()

    def analyze_image(
        self,
        image_data: bytes,
        content_type: str = "image/png",
        prompt: str = "Describe this image in detail."
    ) -> dict:
        """
        Analyze image content with custom AI prompt.

        Args:
            image_data: Image bytes
            content_type: MIME type
            prompt: Custom analysis prompt

        Returns:
            Analysis result with description and details
        """
        encoded = base64.b64encode(image_data).decode('utf-8')

        response = self._post("/api/images/analyze", json={
            "imageData": encoded,
            "contentType": content_type,
            "prompt": prompt
        })

        return response.json()
```

**Tasks:**
1. Implement BatchResource
2. Implement ImagesResource
3. Implement OrchestrationResource
4. Implement ConversationsResource
5. Implement ProjectsResource
6. Add comprehensive docstrings
7. Add usage examples

### Phase 5: Streaming Support (Week 3)

**Goals:**
- WebSocket/SSE support for streaming chat
- Async iterators for streaming responses

**Implementation:**
```python
# artificer/streaming.py
from typing import AsyncIterator, Iterator
import httpx_sse
from .models.chat import ChatChunk

class StreamingMixin:
    """Mixin for streaming support"""

    def stream(
        self,
        conversation_id: str,
        message: str,
        **kwargs
    ) -> Iterator[ChatChunk]:
        """
        Stream chat responses (sync).

        Example:
            >>> for chunk in client.chat.stream(conv_id, "Tell me a story"):
            ...     print(chunk.content, end="", flush=True)
        """
        with httpx_sse.connect_sse(
            self._http,
            "POST",
            f"/api/chat/stream",
            json={
                "conversationId": conversation_id,
                "message": message,
                **kwargs
            }
        ) as event_source:
            for sse in event_source.iter_sse():
                if sse.data:
                    yield ChatChunk.parse_raw(sse.data)

    async def stream_async(
        self,
        conversation_id: str,
        message: str,
        **kwargs
    ) -> AsyncIterator[ChatChunk]:
        """
        Stream chat responses (async).

        Example:
            >>> async for chunk in client.chat.stream_async(conv_id, "Hello"):
            ...     print(chunk.content, end="", flush=True)
        """
        async with httpx_sse.aconnect_sse(
            self._async_http,
            "POST",
            f"/api/chat/stream",
            json={
                "conversationId": conversation_id,
                "message": message,
                **kwargs
            }
        ) as event_source:
            async for sse in event_source.aiter_sse():
                if sse.data:
                    yield ChatChunk.parse_raw(sse.data)
```

**Tasks:**
1. Add httpx-sse dependency
2. Implement streaming for chat
3. Add async streaming support
4. Handle disconnections gracefully
5. Add retry logic

### Phase 6: Testing & Documentation (Week 3-4)

**Goals:**
- Comprehensive unit tests
- Integration tests against live API
- Documentation with examples

**Test Structure:**
```python
# tests/test_batch.py
import pytest
from artificer import Artificer
from artificer.models.batch import PhaseConfig

@pytest.fixture
def client():
    return Artificer(
        api_key=os.environ["ARTIFICER_API_KEY"],
        base_url="http://localhost:3001"
    )

def test_create_batch_job(client):
    job = client.batch.create(
        name="Test Job",
        items=[
            {"input": "Translate to Spanish: Hello"},
            {"input": "Translate to Spanish: Goodbye"}
        ],
        phases=[
            PhaseConfig(
                name="translation",
                task_type="translate",
                model="gpt-4o-mini"
            )
        ]
    )

    assert job.id is not None
    assert job.status == "PENDING"
    assert job.total_items == 2

def test_batch_job_lifecycle(client):
    # Create
    job = client.batch.create(...)

    # Start
    job = client.batch.start(job.id)
    assert job.status == "RUNNING"

    # Wait for completion
    while job.status == "RUNNING":
        job = client.batch.get_status(job.id)
        time.sleep(1)

    assert job.status == "COMPLETED"

    # Get results
    results = client.batch.get_results(job.id)
    assert len(results) == 2

@pytest.mark.asyncio
async def test_async_operations(client):
    async with Artificer(api_key="key") as async_client:
        job = await async_client.batch.create_async(...)
        assert job.id is not None
```

**Documentation:**
```markdown
# Artificer Python SDK

Official Python SDK for AI Workflow Engine.

## Installation

```bash
pip install artificer
```

## Quick Start

```python
from artificer import Artificer

client = Artificer(api_key="your-api-key")

# Process PDF with OCR
with open("document.pdf", "rb") as f:
    result = client.images.process_pdf(f.read())

print(result.text)
```

## Features

- ✅ Batch processing pipelines
- ✅ OCR and image analysis
- ✅ AI orchestration chains
- ✅ Conversation management
- ✅ Streaming chat
- ✅ Async/await support
- ✅ Type hints and IDE autocomplete
- ✅ Comprehensive error handling

## API Reference

See [full documentation](https://docs.example.com)
```

**Tasks:**
1. Write unit tests for all resources
2. Write integration tests
3. Set up CI/CD (GitHub Actions)
4. Create comprehensive README
5. API reference documentation (Sphinx)
6. Usage examples and tutorials
7. Publish to PyPI (test.pypi.org first)

---

## Integration with Python Extraction Plan

### Synergy Points

**1. Shared Client for Hybrid Architecture**

When Python microservices are extracted (per PYTHON_EXTRACTION_ASSESSMENT.md), the SDK can route requests intelligently:

```python
from artificer import Artificer

# SDK automatically routes to appropriate service
client = Artificer(
    api_key="key",
    typescript_api_url="http://localhost:3001",  # TypeScript API
    python_worker_url="http://localhost:8000"     # Python FastAPI service
)

# This hits Python microservice (faster)
result = client.images.process_pdf(pdf_data)

# This hits TypeScript API (orchestration)
conversation = client.conversations.create(...)
```

**2. SDK Architecture Evolution**

```
Phase 1: SDK → TypeScript API (tRPC/REST)
Phase 2: SDK → TypeScript API (for orchestration)
              → Python FastAPI (for OCR/batch processing)
Phase 3: SDK → Fully Pythonic (TypeScript becomes optional)
```

**3. Code Sharing**

```python
# artificer/processing/pdf.py (shared between SDK and Python workers)
from typing import Optional
import PyMuPDF
from PIL import Image

class PdfProcessor:
    """Shared PDF processing logic"""

    @staticmethod
    def extract_text(pdf_data: bytes) -> dict:
        """Direct text extraction (no API call)"""
        doc = fitz.open(stream=pdf_data, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        return {
            "text": text,
            "pages": len(doc),
            "has_text_content": len(text.strip()) > 100
        }

    @staticmethod
    def extract_images(pdf_data: bytes) -> list[bytes]:
        """Extract images from PDF"""
        # Implementation
        pass

# Used in SDK for local processing
result = PdfProcessor.extract_text(pdf_data)

# Also used in Python microservice
@app.post("/api/pdf/extract")
async def extract(file: UploadFile):
    result = PdfProcessor.extract_text(await file.read())
    return result
```

---

## Technical Specifications

### Dependencies

```toml
# pyproject.toml
[project]
name = "artificer"
version = "0.1.0"
description = "Official Python SDK for AI Workflow Engine"
requires-python = ">=3.9"
dependencies = [
    "httpx>=0.25.0",
    "pydantic>=2.0.0",
    "httpx-sse>=0.4.0",  # For streaming
    "python-dateutil>=2.8.0",
    "typing-extensions>=4.5.0"
]

[project.optional-dependencies]
async = [
    "asyncio>=3.4.3"
]
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.0.0",
    "black>=23.0.0",
    "mypy>=1.0.0",
    "ruff>=0.1.0"
]
docs = [
    "sphinx>=6.0.0",
    "sphinx-rtd-theme>=1.3.0",
    "sphinx-autodoc-typehints>=1.24.0"
]

[build-system]
requires = ["setuptools>=68.0.0", "wheel"]
build-backend = "setuptools.build_meta"
```

### Error Handling

```python
# artificer/exceptions.py
class ArtificerError(Exception):
    """Base exception for all Artificer SDK errors"""
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

class AuthenticationError(ArtificerError):
    """Raised when API key is invalid or missing (401)"""
    pass

class PermissionError(ArtificerError):
    """Raised when user lacks permission (403)"""
    pass

class NotFoundError(ArtificerError):
    """Raised when resource not found (404)"""
    pass

class RateLimitError(ArtificerError):
    """Raised when rate limit exceeded (429)"""
    def __init__(self, message: str, retry_after: int):
        super().__init__(message, status_code=429)
        self.retry_after = retry_after

class ValidationError(ArtificerError):
    """Raised when input validation fails (400)"""
    def __init__(self, message: str, errors: dict):
        super().__init__(message, status_code=400)
        self.errors = errors

class ServerError(ArtificerError):
    """Raised on server errors (5xx)"""
    pass

class TimeoutError(ArtificerError):
    """Raised when request times out"""
    pass

class ConnectionError(ArtificerError):
    """Raised when connection fails"""
    pass

# Usage
try:
    job = client.batch.create(...)
except ValidationError as e:
    print(f"Invalid input: {e.errors}")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after}s")
    time.sleep(e.retry_after)
    job = client.batch.create(...)  # Retry
except ArtificerError as e:
    print(f"API error: {e.message}")
```

### Retry Logic

```python
# artificer/retry.py
from typing import Callable, TypeVar
import time
import random

T = TypeVar('T')

def retry_with_backoff(
    func: Callable[..., T],
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True
) -> T:
    """
    Retry function with exponential backoff.

    Args:
        func: Function to retry
        max_retries: Maximum retry attempts
        base_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        exponential_base: Backoff multiplier
        jitter: Add random jitter to prevent thundering herd

    Returns:
        Function result

    Raises:
        Last exception if all retries exhausted
    """
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            return func()
        except (TimeoutError, ConnectionError, ServerError) as e:
            last_exception = e

            if attempt == max_retries:
                break

            # Calculate delay
            delay = min(base_delay * (exponential_base ** attempt), max_delay)

            # Add jitter
            if jitter:
                delay = delay * (0.5 + random.random())

            time.sleep(delay)

    raise last_exception

# Usage in client
def _request(self, method: str, url: str, **kwargs):
    def make_request():
        response = self._http.request(method, url, **kwargs)
        response.raise_for_status()
        return response

    return retry_with_backoff(make_request)
```

---

## Deliverables Checklist

### Week 1
- [ ] SDK package structure created
- [ ] Base HTTP client implemented
- [ ] Authentication layer added
- [ ] Custom exceptions defined
- [ ] Expand OpenAPI spec for batch, images routers
- [ ] Initial unit tests

### Week 2
- [ ] Pydantic models generated from OpenAPI
- [ ] BatchResource implemented
- [ ] ImagesResource implemented
- [ ] OrchestrationResource implemented
- [ ] Async support added
- [ ] Integration tests

### Week 3
- [ ] Streaming support implemented
- [ ] ConversationsResource implemented
- [ ] ProjectsResource implemented
- [ ] Comprehensive error handling
- [ ] Retry logic with backoff
- [ ] README documentation

### Week 4
- [ ] Full test coverage (>90%)
- [ ] API reference documentation (Sphinx)
- [ ] Usage examples and tutorials
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Publish to test.pypi.org
- [ ] Production release to PyPI

---

## Cost-Benefit Analysis

### Development Costs

| Phase | Effort (days) | Cost |
|-------|---------------|------|
| Foundation (Week 1) | 5 days | $5,000 |
| OpenAPI expansion | 3 days | $3,000 |
| Code generation | 2 days | $2,000 |
| Resource clients | 5 days | $5,000 |
| Streaming support | 3 days | $3,000 |
| Testing & docs | 5 days | $5,000 |
| **Total** | **23 days** | **$23,000** |

### Benefits

**Immediate:**
- Python developers can integrate without TypeScript knowledge
- Type-safe API interactions
- Better error handling and debugging
- Comprehensive documentation

**Strategic:**
- Foundation for Python microservices migration
- Easier adoption in Python-heavy organizations
- Better ML/AI ecosystem integration
- Competitive advantage (most tRPC APIs lack Python SDKs)

**ROI:**
- Break-even: ~5-10 enterprise clients (at $2k/year support)
- Reduced support costs: 50% (better docs, type safety)
- Faster customer onboarding: 3x (SDK vs raw API)

---

## Conclusion

### Recommended Next Steps

**IMMEDIATE (This Week):**
1. ✅ Expand OpenAPI spec for batch and images routers
2. ✅ Set up Python SDK repository structure
3. ✅ Implement base HTTP client and auth
4. ✅ Generate initial Pydantic models

**SHORT-TERM (Next 2-3 weeks):**
1. Implement all resource clients
2. Add comprehensive testing
3. Create documentation
4. Beta release to test users

**LONG-TERM (1-2 months):**
1. Production release on PyPI
2. Integration with Python microservices (per extraction plan)
3. Advanced features (webhooks, batch uploads, etc.)
4. Enterprise support tier

### Success Metrics

- [ ] SDK published on PyPI
- [ ] 100+ pip installs in first month
- [ ] >90% test coverage
- [ ] <5 reported bugs in beta
- [ ] Documentation coverage: 100% of public API
- [ ] Integration examples for all major features

### Final Recommendation

**Proceed with Python SDK development using hybrid REST + code generation approach.**

The combination of:
- Existing OpenAPI infrastructure
- Python extraction plan synergies
- Growing demand for Python ML integrations

...makes this a high-value, moderate-effort project with clear ROI.

**Expected Outcome:** A production-ready Python SDK that enables seamless integration with the AI Workflow Engine, positioning the platform for Python-heavy ML/AI use cases and paving the way for Python microservices migration.
