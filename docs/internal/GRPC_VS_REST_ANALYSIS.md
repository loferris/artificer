# gRPC vs REST for Python Microservices

**Date:** 2025-11-17
**Context:** Evaluating gRPC vs REST (FastAPI) for TypeScript ↔ Python service communication

## Quick Answer

**YES, gRPC would go smoother** for backend service-to-service communication, and **YES, you can keep tRPC on the frontend**. Here's the recommended architecture:

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│  Next.js + React (keeps tRPC client - NO CHANGE)       │
└──────────────────┬──────────────────────────────────────┘
                   │ tRPC (JSON-RPC over HTTP)
                   ▼
┌─────────────────────────────────────────────────────────┐
│              TypeScript API Layer                        │
│  • tRPC router (frontend ↔ backend)                     │
│  • gRPC client (calling Python services)                │
│  • Orchestration, auth, Prisma                          │
└──────────────────┬──────────────────────────────────────┘
                   │ gRPC (binary, HTTP/2)
                   ▼
┌─────────────────────────────────────────────────────────┐
│              Python Microservices                        │
│  • gRPC server (receives from TypeScript)               │
│  • PDF/OCR processing, batch workers                    │
│  • PyMuPDF, Tesseract, Celery                           │
└─────────────────────────────────────────────────────────┘
```

**TL;DR:**
- ✅ **Keep tRPC** for frontend ↔ TypeScript API (it's excellent for this)
- ✅ **Use gRPC** for TypeScript API ↔ Python services (better performance, type safety)
- ❌ **Don't use gRPC-web** (not needed, tRPC already handles frontend)

---

## Why This Architecture Works

### Layer 1: Frontend → TypeScript (tRPC) ✅

**Keep tRPC because:**
- Already implemented and working
- Excellent TypeScript integration
- Type-safe end-to-end
- Great DX with auto-completion
- No migration needed
- Supports streaming via SSE/WebSockets

**Don't switch to gRPC-web because:**
- Requires code generation for frontend
- Worse DX than tRPC for TypeScript
- Extra complexity (protobuf in browser)
- tRPC is purpose-built for TypeScript → TypeScript

### Layer 2: TypeScript → Python (gRPC) ✅

**Use gRPC because:**
- **Better performance:** Binary protocol, HTTP/2 multiplexing
- **Strong typing:** Protobuf definitions shared between TS and Python
- **Code generation:** Auto-generate TypeScript and Python clients
- **Streaming:** Bidirectional streaming built-in
- **Service discovery:** Better for microservices architecture
- **Versioning:** Protobuf handles schema evolution

**Better than REST because:**
- 5-10x faster serialization (protobuf vs JSON)
- Smaller payloads (binary vs text)
- Built-in retries, load balancing, timeouts
- Strong contracts prevent runtime errors

---

## Detailed Comparison

### REST/FastAPI (Current Plan)

**Pros:**
- ✅ Simple to implement and debug
- ✅ Human-readable (JSON)
- ✅ curl/Postman testing easy
- ✅ OpenAPI documentation
- ✅ Familiar to most developers
- ✅ Python SDK can also use REST

**Cons:**
- ❌ JSON parsing overhead
- ❌ Larger payloads
- ❌ No built-in streaming (need SSE/WebSocket)
- ❌ Weaker typing (rely on Pydantic validation)
- ❌ HTTP/1.1 overhead (multiple connections)

**Performance:**
- ~10-20ms per request (JSON serialization)
- 1-2 KB overhead per request (JSON vs protobuf)

### gRPC (Recommended for Backend)

**Pros:**
- ✅ 5-10x faster than JSON
- ✅ Strong typing (protobuf schema)
- ✅ Code generation (TypeScript + Python)
- ✅ Bidirectional streaming
- ✅ HTTP/2 multiplexing
- ✅ Built-in retries, deadlines, cancellation
- ✅ Service mesh ready (Istio, Linkerd)

**Cons:**
- ❌ Harder to debug (binary protocol)
- ❌ No curl testing (need grpcurl)
- ❌ Steeper learning curve
- ❌ Browser support needs gRPC-web (but we don't need this)

**Performance:**
- ~1-3ms per request (protobuf serialization)
- 0.3-0.5 KB overhead per request

### Performance Comparison

| Metric | REST/JSON | gRPC/Protobuf | Improvement |
|--------|-----------|---------------|-------------|
| Serialization | 10-20ms | 1-3ms | **5-10x faster** |
| Payload size | 1-2 KB | 0.3-0.5 KB | **3-4x smaller** |
| Connections | Multiple (HTTP/1.1) | Single (HTTP/2) | **Lower overhead** |
| Type safety | Runtime (Pydantic) | Compile-time | **Fewer bugs** |
| Streaming | Manual (SSE/WS) | Built-in | **Better DX** |

---

## Implementation Plan

### Protobuf Schema Definition

```protobuf
// protos/ocr.proto
syntax = "proto3";

package artificer.ocr;

// OCR Service
service OCRService {
  rpc ExtractTextFromImage(ImageRequest) returns (OCRResult);
  rpc ProcessPDF(PDFRequest) returns (PDFResult);
  rpc ProcessPDFStream(PDFRequest) returns (stream PDFPageResult);
  rpc CheckPDFNeedsOCR(PDFRequest) returns (OCRCheckResult);
}

message ImageRequest {
  bytes image_data = 1;
  string content_type = 2;
}

message PDFRequest {
  bytes pdf_data = 1;
  bool force_ocr = 2;
  int32 min_text_threshold = 3;
}

message OCRResult {
  string text = 1;
  float confidence = 2;
  OCRMetadata metadata = 3;
}

message OCRMetadata {
  int64 processing_time_ms = 1;
  string provider = 2;
  string model = 3;
  int32 tokens_used = 4;
  float cost = 5;
}

message PDFResult {
  string text = 1;
  PDFMetadata metadata = 2;
}

message PDFMetadata {
  int32 pages = 1;
  string method = 2;  // "direct" or "ocr"
  bool has_text_content = 3;
  bool ocr_used = 4;
  float ocr_confidence = 5;
  float ocr_cost = 6;
  int64 processing_time_ms = 7;
}

message PDFPageResult {
  int32 page_number = 1;
  string text = 2;
  float confidence = 3;
}

message OCRCheckResult {
  bool needs_ocr = 1;
  bool has_text_content = 2;
  int32 pages = 3;
  int32 text_length = 4;
  float estimated_ocr_cost = 5;
}
```

```protobuf
// protos/batch.proto
syntax = "proto3";

package artificer.batch;

import "google/protobuf/timestamp.proto";

service BatchService {
  rpc CreateJob(CreateJobRequest) returns (Job);
  rpc GetJob(JobRequest) returns (Job);
  rpc StartJob(JobRequest) returns (Job);
  rpc PauseJob(JobRequest) returns (Job);
  rpc ResumeJob(JobRequest) returns (Job);
  rpc CancelJob(JobRequest) returns (Job);
  rpc GetResults(JobRequest) returns (JobResults);
  rpc StreamProgress(JobRequest) returns (stream JobProgress);
}

message CreateJobRequest {
  string name = 1;
  string project_id = 2;
  repeated BatchItem items = 3;
  repeated PhaseConfig phases = 4;
  BatchOptions options = 5;
}

message BatchItem {
  string input = 1;
  map<string, string> metadata = 2;
}

message PhaseConfig {
  string name = 1;
  string task_type = 2;
  string model = 3;
  bool use_rag = 4;
  ValidationConfig validation = 5;
}

message ValidationConfig {
  bool enabled = 1;
  float min_score = 2;
}

message BatchOptions {
  int32 concurrency = 1;
  int32 checkpoint_frequency = 2;
  bool auto_start = 3;
}

enum JobStatus {
  PENDING = 0;
  RUNNING = 1;
  PAUSED = 2;
  COMPLETED = 3;
  FAILED = 4;
  CANCELLED = 5;
}

message Job {
  string id = 1;
  string name = 2;
  JobStatus status = 3;
  int32 total_items = 4;
  int32 completed_items = 5;
  int32 failed_items = 6;
  string current_phase = 7;
  float cost_incurred = 8;
  int64 tokens_used = 9;
  google.protobuf.Timestamp created_at = 10;
  google.protobuf.Timestamp started_at = 11;
  google.protobuf.Timestamp completed_at = 12;
}

message JobRequest {
  string job_id = 1;
}

message JobResults {
  repeated JobResultItem items = 1;
}

message JobResultItem {
  int32 item_index = 1;
  string input = 2;
  string output = 3;
  string status = 4;
  map<string, string> phase_outputs = 5;
}

message JobProgress {
  int32 completed_items = 1;
  int32 total_items = 2;
  string current_phase = 3;
  float progress_percentage = 4;
}
```

### Code Generation

```bash
# Install gRPC tools
npm install -D @grpc/grpc-js @grpc/proto-loader
npm install -D grpc-tools grpc_tools_node_protoc_ts

pip install grpcio grpcio-tools

# Generate TypeScript code
protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out=src/generated \
  --js_out=import_style=commonjs:src/generated \
  --grpc_out=grpc_js:src/generated \
  protos/*.proto

# Generate Python code
python -m grpc_tools.protoc \
  -I./protos \
  --python_out=./python/generated \
  --grpc_python_out=./python/generated \
  protos/*.proto
```

### TypeScript Client (in existing API)

```typescript
// src/server/services/grpc/PythonOCRClient.ts
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { OCRServiceClient } from '../../generated/ocr_grpc_pb';
import type {
  ImageRequest,
  PDFRequest,
  OCRResult,
  PDFResult
} from '../../generated/ocr_pb';

export class PythonOCRClient {
  private client: OCRServiceClient;

  constructor(serviceUrl: string = 'localhost:50051') {
    this.client = new OCRServiceClient(
      serviceUrl,
      grpc.credentials.createInsecure() // Use TLS in production
    );
  }

  async extractTextFromImage(
    imageData: Buffer,
    contentType: string
  ): Promise<OCRResult> {
    const request = new ImageRequest();
    request.setImageData(imageData);
    request.setContentType(contentType);

    return new Promise((resolve, reject) => {
      this.client.extractTextFromImage(request, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  async processPDF(
    pdfData: Buffer,
    forceOCR: boolean = false,
    minTextThreshold: number = 100
  ): Promise<PDFResult> {
    const request = new PDFRequest();
    request.setPdfData(pdfData);
    request.setForceOcr(forceOCR);
    request.setMinTextThreshold(minTextThreshold);

    return new Promise((resolve, reject) => {
      this.client.processPDF(request, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  // Streaming example
  processPDFStream(pdfData: Buffer): grpc.ClientReadableStream<PDFPageResult> {
    const request = new PDFRequest();
    request.setPdfData(pdfData);

    return this.client.processPDFStream(request);
  }

  close() {
    this.client.close();
  }
}

// Usage in existing tRPC router
// src/server/routers/images.ts
import { PythonOCRClient } from '../services/grpc/PythonOCRClient';

const pythonOCR = new PythonOCRClient(
  process.env.PYTHON_GRPC_URL || 'localhost:50051'
);

export const imagesRouter = router({
  processPdf: protectedProcedure
    .input(z.object({ pdfData: z.string() }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.pdfData, 'base64');

      // Call Python gRPC service
      const result = await pythonOCR.processPDF(buffer);

      // Convert to tRPC response format
      return {
        text: result.getText(),
        metadata: {
          pages: result.getMetadata()?.getPages(),
          method: result.getMetadata()?.getMethod(),
          processingTime: result.getMetadata()?.getProcessingTimeMs(),
        }
      };
    }),
});
```

### Python gRPC Server

```python
# python/services/ocr_service.py
import grpc
from concurrent import futures
import time

from generated import ocr_pb2
from generated import ocr_pb2_grpc

from processors.pdf import PdfProcessor
from processors.ocr import OCRProcessor

class OCRServiceServicer(ocr_pb2_grpc.OCRServiceServicer):
    def __init__(self):
        self.pdf_processor = PdfProcessor()
        self.ocr_processor = OCRProcessor()

    def ExtractTextFromImage(self, request, context):
        """Extract text from single image"""
        try:
            result = self.ocr_processor.extract_text(
                image_data=request.image_data,
                content_type=request.content_type
            )

            return ocr_pb2.OCRResult(
                text=result['text'],
                confidence=result['confidence'],
                metadata=ocr_pb2.OCRMetadata(
                    processing_time_ms=result['processing_time'],
                    provider=result['provider'],
                    tokens_used=result.get('tokens_used', 0),
                    cost=result.get('cost', 0.0)
                )
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return ocr_pb2.OCRResult()

    def ProcessPDF(self, request, context):
        """Process PDF with smart OCR"""
        try:
            result = self.pdf_processor.process_pdf(
                pdf_data=request.pdf_data,
                force_ocr=request.force_ocr,
                min_text_threshold=request.min_text_threshold
            )

            return ocr_pb2.PDFResult(
                text=result['text'],
                metadata=ocr_pb2.PDFMetadata(
                    pages=result['pages'],
                    method=result['method'],
                    has_text_content=result['has_text_content'],
                    ocr_used=result['ocr_used'],
                    ocr_confidence=result.get('ocr_confidence', 0.0),
                    ocr_cost=result.get('ocr_cost', 0.0),
                    processing_time_ms=result['processing_time']
                )
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return ocr_pb2.PDFResult()

    def ProcessPDFStream(self, request, context):
        """Stream PDF page results as they're processed"""
        try:
            for page_result in self.pdf_processor.process_pdf_streaming(
                request.pdf_data
            ):
                yield ocr_pb2.PDFPageResult(
                    page_number=page_result['page_number'],
                    text=page_result['text'],
                    confidence=page_result['confidence']
                )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))

    def CheckPDFNeedsOCR(self, request, context):
        """Check if PDF needs OCR and estimate cost"""
        try:
            result = self.pdf_processor.check_needs_ocr(
                pdf_data=request.pdf_data,
                min_text_threshold=request.min_text_threshold
            )

            return ocr_pb2.OCRCheckResult(
                needs_ocr=result['needs_ocr'],
                has_text_content=result['has_text_content'],
                pages=result['pages'],
                text_length=result['text_length'],
                estimated_ocr_cost=result.get('estimated_ocr_cost', 0.0)
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return ocr_pb2.OCRCheckResult()


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    ocr_pb2_grpc.add_OCRServiceServicer_to_server(
        OCRServiceServicer(), server
    )

    server.add_insecure_port('[::]:50051')
    server.start()

    print("Python gRPC server started on port 50051")

    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        server.stop(0)


if __name__ == '__main__':
    serve()
```

### Docker Setup

```dockerfile
# Dockerfile.python-grpc
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy generated protobuf code
COPY python/generated ./generated

# Copy service code
COPY python/services ./services
COPY python/processors ./processors

# Expose gRPC port
EXPOSE 50051

CMD ["python", "-m", "services.ocr_service"]
```

```yaml
# docker-compose.yml (additions)
services:
  # ... existing services ...

  python-grpc:
    build:
      context: .
      dockerfile: Dockerfile.python-grpc
    ports:
      - "50051:50051"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./python:/app
    networks:
      - app-network

  # TypeScript API can access via service name
  api:
    depends_on:
      - python-grpc
    environment:
      - PYTHON_GRPC_URL=python-grpc:50051

networks:
  app-network:
    driver: bridge
```

---

## Python SDK Implications

### Option 1: SDK Uses REST (Current Plan)

Python SDK would still use REST/FastAPI for public API:

```python
# Python SDK uses REST
from artificer import Artificer

client = Artificer(api_key="key")
result = client.images.process_pdf(pdf_data)
```

**Why REST for SDK:**
- Easier for external Python developers
- Standard HTTP/JSON (familiar)
- OpenAPI documentation
- Works with curl, Postman, etc.

**Architecture:**
```
Python SDK → REST → TypeScript API → gRPC → Python Service
```

This is fine! The gRPC is internal communication only.

### Option 2: SDK Uses gRPC Directly (Advanced)

For advanced users, could offer direct gRPC client:

```python
# Advanced: Direct gRPC (optional)
from artificer.grpc import ArtificerGRPCClient

client = ArtificerGRPCClient(
    url="grpc.example.com:443",
    api_key="key"
)

# Faster (no TypeScript hop)
result = client.ocr.process_pdf(pdf_data)
```

**Pros:**
- Faster (direct to Python service)
- Lower latency (no TypeScript hop)

**Cons:**
- More complex for users
- Need to expose gRPC publicly (security considerations)
- Harder debugging

**Recommendation:** Offer both, default to REST

---

## Updated Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     Client Applications                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Next.js App  │  │ Python SDK   │  │ Direct gRPC  │       │
│  │ (tRPC)       │  │ (REST/HTTP)  │  │ (optional)   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          │ tRPC             │ REST             │ gRPC (direct)
          │                  │                  │
┌─────────▼──────────────────▼──────────────────┘
│         TypeScript API Layer (Node.js)                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ tRPC Routers (frontend-facing)                         │  │
│  │ • conversations, projects, auth, monitoring            │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ gRPC Clients (calling Python services)                 │  │
│  │ • PythonOCRClient, PythonBatchClient                   │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Orchestration, Prisma ORM, Circuit Breakers            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────┘
                               │ gRPC (HTTP/2, protobuf)
                               │
┌──────────────────────────────▼───────────────────────────────┐
│              Python Microservices (gRPC Servers)              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ OCR Service (gRPC)                                     │  │
│  │ • PDF processing, image OCR, text extraction           │  │
│  │ • PyMuPDF, Tesseract, Pillow                           │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Batch Service (gRPC)                                   │  │
│  │ • Celery workers, distributed processing               │  │
│  │ • Redis queue, checkpoint recovery                     │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## Migration Path: REST → gRPC

### Phase 1: REST (Months 1-3)
Start with REST for faster initial implementation:

```
TypeScript API → REST/FastAPI → Python Service
```

**Pros:**
- Faster to implement
- Easier debugging
- Get to production faster

### Phase 2: gRPC Migration (Months 4-6)
Once stable, migrate to gRPC:

```
TypeScript API → gRPC → Python Service
```

**Migration steps:**
1. Define protobuf schemas
2. Generate code (TS + Python)
3. Implement gRPC server alongside REST
4. Update TypeScript clients to use gRPC
5. Deprecate REST endpoints (internal only)

**Risk mitigation:**
- Run both REST and gRPC in parallel
- Gradual rollout per service
- Feature flags for switching

---

## Recommendation

### Immediate (Next Sprint)

**Start with REST/FastAPI:**
- Faster implementation
- Easier debugging
- Lower learning curve
- Can migrate to gRPC later

### Short-term (Month 3-4)

**Add gRPC for performance-critical paths:**
- Keep REST for debugging and fallback
- Use gRPC for high-throughput operations
- Benchmark performance difference

### Long-term (Month 6+)

**Full gRPC for internal services:**
- Proven stability
- Performance gains realized
- Monitoring and debugging established
- REST deprecated for internal use

---

## Complexity Comparison

### REST Implementation Complexity: ⭐⭐ (Low)

**What you need:**
- FastAPI (Python) ✅
- httpx client (TypeScript) ✅
- JSON serialization ✅
- OpenAPI spec ✅

**Lines of code:** ~500 LOC

### gRPC Implementation Complexity: ⭐⭐⭐⭐ (Medium-High)

**What you need:**
- Protobuf definitions (new)
- Code generation pipeline (new)
- gRPC server setup (new)
- gRPC client setup (new)
- Monitoring/debugging tools (new)
- TLS certificates (production)

**Lines of code:** ~1000 LOC + infrastructure

**Additional skills required:**
- Protobuf syntax
- gRPC concepts (streaming, deadlines, etc.)
- HTTP/2 debugging
- Service mesh (optional but recommended)

---

## Final Recommendation

### Architecture Decision

**✅ YES to Hybrid Approach:**
```
Frontend (tRPC) → TypeScript API (tRPC) → Python Services (gRPC)
```

**Rationale:**
1. **Keep tRPC for frontend** - It's perfect for TypeScript ↔ TypeScript
2. **Use gRPC for backend services** - Better performance and type safety
3. **No gRPC-web needed** - tRPC already handles frontend

### Implementation Strategy

**Phase 1 (Months 1-3): REST Foundation**
- Implement with FastAPI (REST)
- Get to production faster
- Validate architecture

**Phase 2 (Months 4-6): gRPC Migration**
- Define protobuf schemas
- Implement gRPC servers
- Migrate TypeScript clients
- Run both REST + gRPC in parallel

**Phase 3 (Months 6+): gRPC Optimization**
- Deprecate REST for internal use
- Add service mesh (optional)
- Advanced features (streaming, etc.)

### Updated Cost-Benefit

| Approach | Complexity | Performance | Time to Production | Long-term Maintainability |
|----------|------------|-------------|-------------------|---------------------------|
| REST only | Low ⭐⭐ | Good | 3 months | Good |
| gRPC only | High ⭐⭐⭐⭐ | Excellent | 4-5 months | Excellent |
| **REST → gRPC** | Medium ⭐⭐⭐ | Good → Excellent | 3 months → 6 months | **Excellent** |

**Winner:** REST → gRPC migration (best balance)

---

## Updated Timeline

### Original Plan (REST)
- Month 1-2: Python SDK + FastAPI services
- Month 3-4: Production deployment
- **Total: 4 months**

### Updated Plan (REST → gRPC)
- Month 1-2: Python SDK + FastAPI services
- Month 3: Production deployment (REST)
- Month 4-5: gRPC implementation
- Month 6: gRPC migration complete
- **Total: 6 months**

**Additional investment:** +2 months, ~$20k
**Additional benefit:** 5-10x better performance for service-to-service calls

---

## Conclusion

**Your instinct is correct** - gRPC would be better for TypeScript ↔ Python communication.

**Best strategy:**
1. ✅ Keep tRPC for frontend (don't change)
2. ✅ Start with REST for Python services (faster to production)
3. ✅ Migrate to gRPC after validation (better long-term)
4. ❌ Don't use gRPC-web (not needed)

**Expected outcome:** A hybrid architecture that leverages the best of each protocol:
- **tRPC**: Type-safe frontend communication
- **gRPC**: High-performance backend services
- **REST**: Public API for Python SDK

This gives you immediate progress with a clear path to optimal performance. 🚀
