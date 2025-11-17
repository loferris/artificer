# Start Here: Python Integration Kickoff

**Date:** 2025-11-17
**Goal:** Begin Python integration with lowest risk, highest value approach

## TL;DR - Your First 2 Weeks

**Week 1:** Foundation & Validation
**Week 2:** Quick Win (Choose: SDK MVP or Python OCR Prototype)

**Recommendation:** Start with **Foundation Sprint** to validate assumptions, then pick the highest-value track based on data.

---

## Week 1: Foundation Sprint (Nov 18-22)

### Goal: Validate technical assumptions and set up infrastructure

These tasks enable BOTH the SDK and extraction tracks while minimizing risk.

### Day 1-2: Benchmark & OpenAPI Expansion

**Task 1: Benchmark Current Performance** ⭐ CRITICAL
```bash
# Create benchmark script
mkdir -p scripts/benchmarks

# Test current PDF processing speed
cat > scripts/benchmarks/pdf-benchmark.ts
```

**What to measure:**
```typescript
// scripts/benchmarks/pdf-benchmark.ts
import { PdfService } from '../src/server/services/document/PdfService';
import { OCRService } from '../src/server/services/image/OCRService';
import fs from 'fs';

async function benchmarkPDF() {
  const testFiles = [
    { path: './test-data/digital.pdf', type: 'digital' },
    { path: './test-data/scanned-5pages.pdf', type: 'scanned-5' },
    { path: './test-data/scanned-20pages.pdf', type: 'scanned-20' },
  ];

  const ocr = new OCRService({ provider: 'openai-vision', model: 'gpt-4o-mini' });
  const pdfService = new PdfService(ocr);

  for (const file of testFiles) {
    const buffer = fs.readFileSync(file.path);
    const start = Date.now();

    const result = await pdfService.processPdf(buffer);

    console.log(`\n=== ${file.type} ===`);
    console.log(`Time: ${Date.now() - start}ms`);
    console.log(`Pages: ${result.metadata.pages}`);
    console.log(`Method: ${result.metadata.method}`);
    console.log(`Cost: $${result.metadata.ocrCost?.toFixed(4) || 0}`);
    console.log(`Text length: ${result.text.length}`);
  }
}

benchmarkPDF().catch(console.error);
```

**Run benchmarks:**
```bash
# Prepare test PDFs
mkdir -p test-data
# (download or create sample PDFs)

npm run tsx scripts/benchmarks/pdf-benchmark.ts
```

**Expected baseline (TypeScript):**
- Digital PDF (10 pages): ~100-200ms, $0
- Scanned PDF (5 pages): ~15-25s, $0.02-0.05
- Scanned PDF (20 pages): ~60-120s, $0.10-0.20

**Why this matters:** You need proof that Python will be faster before investing weeks.

---

**Task 2: Expand OpenAPI Spec**

Add batch and images routers to OpenAPI:

```typescript
// src/server/openapi-spec.ts

export const openApiSpec = {
  // ... existing spec

  paths: {
    // ... existing paths

    // === BATCH PROCESSING ===
    '/api/batch': {
      post: {
        summary: 'Create batch processing job',
        tags: ['batch'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateBatchJobRequest' }
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
      },
      get: {
        summary: 'List batch jobs',
        tags: ['batch'],
        parameters: [
          { name: 'projectId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          '200': {
            description: 'List of batch jobs',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/BatchJob' }
                }
              }
            }
          }
        }
      }
    },

    '/api/batch/{jobId}': {
      get: {
        summary: 'Get batch job by ID',
        tags: ['batch'],
        parameters: [
          { name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Batch job details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BatchJob' }
              }
            }
          }
        }
      }
    },

    '/api/batch/{jobId}/start': {
      post: {
        summary: 'Start batch job',
        tags: ['batch'],
        parameters: [
          { name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Job started',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BatchJob' }
              }
            }
          }
        }
      }
    },

    // === IMAGES/OCR ===
    '/api/images/process-pdf': {
      post: {
        summary: 'Process PDF with smart OCR',
        tags: ['images'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProcessPDFRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'PDF processed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PDFProcessingResult' }
              }
            }
          }
        }
      }
    },

    '/api/images/extract-text': {
      post: {
        summary: 'Extract text from image using OCR',
        tags: ['images'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ExtractTextRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Text extracted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OCRResult' }
              }
            }
          }
        }
      }
    },

    '/api/images/check-pdf-needs-ocr': {
      get: {
        summary: 'Check if PDF needs OCR and estimate cost',
        tags: ['images'],
        parameters: [
          { name: 'pdfData', in: 'query', required: true, schema: { type: 'string', format: 'byte' } },
          { name: 'minTextThreshold', in: 'query', schema: { type: 'integer', default: 100 } }
        ],
        responses: {
          '200': {
            description: 'OCR check result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OCRCheckResult' }
              }
            }
          }
        }
      }
    }
  },

  components: {
    schemas: {
      // ... existing schemas

      // === BATCH SCHEMAS ===
      CreateBatchJobRequest: {
        type: 'object',
        required: ['name', 'items', 'phases'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          projectId: { type: 'string' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/BatchItem' },
            minItems: 1,
            maxItems: 10000
          },
          phases: {
            type: 'array',
            items: { $ref: '#/components/schemas/PhaseConfig' },
            minItems: 1,
            maxItems: 10
          },
          options: { $ref: '#/components/schemas/BatchOptions' }
        }
      },

      BatchItem: {
        type: 'object',
        required: ['input'],
        properties: {
          input: { type: 'string', minLength: 1, maxLength: 100000 },
          metadata: { type: 'object', additionalProperties: true }
        }
      },

      PhaseConfig: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          taskType: { type: 'string' },
          model: { type: 'string' },
          useRAG: { type: 'boolean' },
          validation: { $ref: '#/components/schemas/ValidationConfig' }
        }
      },

      ValidationConfig: {
        type: 'object',
        required: ['enabled'],
        properties: {
          enabled: { type: 'boolean' },
          minScore: { type: 'number', minimum: 0, maximum: 10 }
        }
      },

      BatchOptions: {
        type: 'object',
        properties: {
          concurrency: { type: 'integer', minimum: 1, maximum: 50, default: 5 },
          checkpointFrequency: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          autoStart: { type: 'boolean', default: false }
        }
      },

      BatchJob: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          status: {
            type: 'string',
            enum: ['PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED']
          },
          totalItems: { type: 'integer' },
          completedItems: { type: 'integer' },
          failedItems: { type: 'integer' },
          currentPhase: { type: 'string' },
          costIncurred: { type: 'number' },
          tokensUsed: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          startedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' }
        }
      },

      // === OCR SCHEMAS ===
      ProcessPDFRequest: {
        type: 'object',
        required: ['pdfData'],
        properties: {
          pdfData: { type: 'string', format: 'byte', description: 'Base64-encoded PDF' },
          options: {
            type: 'object',
            properties: {
              forceOCR: { type: 'boolean', default: false },
              minTextThreshold: { type: 'integer', default: 100 }
            }
          }
        }
      },

      PDFProcessingResult: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          metadata: {
            type: 'object',
            properties: {
              pages: { type: 'integer' },
              method: { type: 'string', enum: ['direct', 'ocr', 'hybrid'] },
              hasTextContent: { type: 'boolean' },
              ocrUsed: { type: 'boolean' },
              ocrConfidence: { type: 'number' },
              ocrCost: { type: 'number' },
              processingTime: { type: 'integer' }
            }
          }
        }
      },

      ExtractTextRequest: {
        type: 'object',
        required: ['imageData', 'contentType'],
        properties: {
          imageData: { type: 'string', format: 'byte' },
          contentType: { type: 'string' }
        }
      },

      OCRResult: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          confidence: { type: 'number' },
          metadata: {
            type: 'object',
            properties: {
              processingTime: { type: 'integer' },
              provider: { type: 'string' },
              model: { type: 'string' },
              tokensUsed: { type: 'integer' },
              cost: { type: 'number' }
            }
          }
        }
      },

      OCRCheckResult: {
        type: 'object',
        properties: {
          needsOCR: { type: 'boolean' },
          hasTextContent: { type: 'boolean' },
          pages: { type: 'integer' },
          textLength: { type: 'integer' },
          estimatedOCRCost: { type: 'number' }
        }
      }
    }
  }
};
```

**Validate the spec:**
```bash
# Install validator
npm install -D @apidevtools/swagger-cli

# Validate
npx swagger-cli validate src/server/openapi-spec.ts

# Test in browser
npm run dev:standalone
# Visit http://localhost:3001/docs
```

**Deliverable:** Complete OpenAPI spec at http://localhost:3001/openapi.json

---

### Day 3: Set Up Python Development Environment

**Task 3: Create Python workspace**

```bash
# Create Python project structure
mkdir -p python/{services,processors,generated,tests}

# Initialize Python project
cd python
cat > pyproject.toml << 'EOF'
[project]
name = "artificer-python"
version = "0.1.0"
description = "Python microservices for AI Workflow Engine"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.104.1",
    "uvicorn[standard]>=0.24.0",
    "pydantic>=2.0.0",
    "PyMuPDF>=1.23.8",
    "pdf2image>=1.16.3",
    "pillow>=10.1.0",
    "opencv-python>=4.8.1",
    "pytesseract>=0.3.10",
    "openai>=1.3.0",
    "httpx>=0.25.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.21.0",
    "black>=23.0.0",
    "ruff>=0.1.0",
    "mypy>=1.7.0",
]

[build-system]
requires = ["setuptools>=68.0.0"]
build-backend = "setuptools.build_meta"
EOF

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -e ".[dev]"
```

**Task 4: Create Python PDF processor prototype**

```python
# python/processors/pdf.py
"""
PDF processing with PyMuPDF - significantly faster than pdf-parse
"""
import fitz  # PyMuPDF
from typing import Dict, Any
import time

class PdfProcessor:
    """Fast PDF text extraction using PyMuPDF"""

    def extract_text(self, pdf_data: bytes) -> Dict[str, Any]:
        """
        Extract text from PDF using PyMuPDF.

        Benchmark: ~10-100x faster than pdf-parse for large PDFs
        """
        start = time.time()

        doc = fitz.open(stream=pdf_data, filetype="pdf")

        text = ""
        for page in doc:
            text += page.get_text()

        processing_time = int((time.time() - start) * 1000)

        return {
            "text": text,
            "pages": len(doc),
            "has_text_content": len(text.strip()) > 100,
            "processing_time_ms": processing_time,
            "method": "pymupdf"
        }

    def needs_ocr(
        self,
        pdf_data: bytes,
        min_text_threshold: int = 100
    ) -> Dict[str, Any]:
        """Check if PDF needs OCR"""
        result = self.extract_text(pdf_data)

        text_length = len(result["text"].strip())
        avg_text_per_page = text_length / max(result["pages"], 1)

        needs_ocr = not result["has_text_content"] or avg_text_per_page < min_text_threshold

        return {
            "needs_ocr": needs_ocr,
            "has_text_content": result["has_text_content"],
            "pages": result["pages"],
            "text_length": text_length,
            "estimated_ocr_cost": self._estimate_ocr_cost(result["pages"]) if needs_ocr else 0.0
        }

    def _estimate_ocr_cost(self, pages: int) -> float:
        """Estimate OpenAI Vision OCR cost"""
        # ~1000 tokens per page with gpt-4o-mini
        tokens_per_page = 1000
        cost_per_1m_tokens = 0.15  # gpt-4o-mini input

        total_tokens = pages * tokens_per_page
        return (total_tokens * cost_per_1m_tokens) / 1_000_000
```

**Task 5: Benchmark Python vs TypeScript**

```python
# python/benchmarks/compare_pdf.py
"""
Compare Python (PyMuPDF) vs TypeScript (pdf-parse) performance
"""
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from processors.pdf import PdfProcessor

def benchmark():
    processor = PdfProcessor()

    test_files = [
        ("test-data/digital.pdf", "Digital PDF (10 pages)"),
        ("test-data/scanned-5pages.pdf", "Scanned PDF (5 pages)"),
        ("test-data/scanned-20pages.pdf", "Scanned PDF (20 pages)"),
    ]

    print("=" * 60)
    print("Python (PyMuPDF) Benchmark")
    print("=" * 60)

    for filepath, description in test_files:
        if not Path(filepath).exists():
            print(f"\n⚠️  {filepath} not found, skipping")
            continue

        with open(filepath, 'rb') as f:
            pdf_data = f.read()

        # Text extraction benchmark
        start = time.time()
        result = processor.extract_text(pdf_data)
        elapsed = time.time() - start

        print(f"\n{description}")
        print(f"  Time: {elapsed*1000:.2f}ms")
        print(f"  Pages: {result['pages']}")
        print(f"  Text length: {len(result['text'])}")
        print(f"  Has text: {result['has_text_content']}")

        # OCR check
        check = processor.needs_ocr(pdf_data)
        print(f"  Needs OCR: {check['needs_ocr']}")
        if check['needs_ocr']:
            print(f"  Estimated cost: ${check['estimated_ocr_cost']:.4f}")

if __name__ == '__main__':
    benchmark()
```

**Run comparison:**
```bash
# Terminal 1: TypeScript benchmark
npm run tsx scripts/benchmarks/pdf-benchmark.ts

# Terminal 2: Python benchmark
cd python
python benchmarks/compare_pdf.py
```

**Expected results:**
```
TypeScript (pdf-parse):  100-200ms
Python (PyMuPDF):        5-20ms   ← 10-20x faster!
```

**Deliverable:** Hard data proving Python is faster

---

### Day 4-5: Choose Your Path (Based on Benchmarks)

After benchmarks, pick the highest-value track:

#### **Option A: Python SDK MVP** (if you need customers first)

**Why:** Get Python developers using the API immediately

**What to build:**
```bash
# Create SDK package
mkdir -p sdk-python/artificer/{models,resources}

# Basic client
cat > sdk-python/artificer/client.py
```

```python
# sdk-python/artificer/client.py
import httpx
from typing import Optional
from .resources import BatchResource, ImagesResource

class Artificer:
    """Official Python SDK for AI Workflow Engine"""

    def __init__(
        self,
        api_key: str,
        base_url: str = "http://localhost:3001",
        timeout: float = 30.0
    ):
        self.api_key = api_key
        self.base_url = base_url

        self._http = httpx.Client(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout
        )

        # Initialize resource clients
        self.batch = BatchResource(self._http)
        self.images = ImagesResource(self._http)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self._http.close()
```

**Time investment:** 2-3 days for MVP
**Value:** Python developers can start integrating immediately

---

#### **Option B: Python OCR Microservice Prototype** (if you need performance first)

**Why:** Prove the architecture with biggest pain point (slow OCR)

**What to build:**
```python
# python/services/ocr_api.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from processors.pdf import PdfProcessor
import base64

app = FastAPI(title="Python OCR Service")

pdf_processor = PdfProcessor()

class ProcessPDFRequest(BaseModel):
    pdf_data: str  # base64
    force_ocr: bool = False
    min_text_threshold: int = 100

class ProcessPDFResponse(BaseModel):
    text: str
    metadata: dict

@app.post("/api/pdf/extract")
async def extract_pdf_text(request: ProcessPDFRequest):
    """Fast PDF text extraction with PyMuPDF"""
    try:
        pdf_bytes = base64.b64decode(request.pdf_data)
        result = pdf_processor.extract_text(pdf_bytes)

        return {
            "text": result["text"],
            "metadata": {
                "pages": result["pages"],
                "method": "direct",
                "hasTextContent": result["has_text_content"],
                "processingTime": result["processing_time_ms"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok", "service": "python-ocr"}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Run it:**
```bash
cd python
uvicorn services.ocr_api:app --reload --port 8000
```

**Update TypeScript to call it:**
```typescript
// src/server/services/document/PdfService.ts

async processPdf(buffer: Buffer, options = {}) {
  // Try Python service first (if available)
  if (process.env.PYTHON_API_URL) {
    try {
      const response = await fetch(`${process.env.PYTHON_API_URL}/api/pdf/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdf_data: buffer.toString('base64'),
          ...options
        })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      logger.warn('Python service unavailable, falling back to TypeScript');
    }
  }

  // Fallback to existing TypeScript implementation
  return this.pdfExtractor.extractText(buffer);
}
```

**Time investment:** 2-3 days for prototype
**Value:** Immediate 10-20x speedup on PDF processing

---

## Week 2: Build Your Quick Win

Based on Week 1 choice, complete the MVP:

### **If you chose SDK (Option A):**

**Days 6-7:** Implement resource clients
- BatchResource
- ImagesResource
- Error handling

**Days 8-9:** Testing and documentation
- Unit tests
- Integration tests
- Usage examples

**Day 10:** Release beta
- Publish to test.pypi.org
- Share with early users
- Gather feedback

**Deliverable:** `pip install artificer` (beta)

---

### **If you chose Python Service (Option B):**

**Days 6-7:** OCR integration
- Add Tesseract fallback
- OpenAI Vision API calls
- Error handling

**Days 8-9:** Docker and deployment
- Create Dockerfile
- Docker Compose setup
- Deploy to staging

**Day 10:** Performance validation
- Load testing
- Cost comparison
- Production readiness check

**Deliverable:** Python microservice in staging, 10x faster PDF processing

---

## Critical Success Factors

### ✅ Must Have (Week 1)
- [ ] Benchmark data (TypeScript vs Python)
- [ ] Complete OpenAPI spec
- [ ] Python environment set up
- [ ] Clear decision on SDK vs Service

### ✅ Should Have (Week 2)
- [ ] Working MVP (SDK or service)
- [ ] Initial tests passing
- [ ] Documentation started
- [ ] Deployment plan

### ⚠️ Watch Out For
- **Don't:** Try to do both SDK and service simultaneously
- **Don't:** Skip benchmarks (you need data to justify investment)
- **Don't:** Over-engineer Week 1 (keep it simple)
- **Do:** Pick one path and execute well
- **Do:** Get early feedback
- **Do:** Document assumptions and decisions

---

## Decision Tree

```
START
  │
  ├─ Do you have Python developers waiting to integrate?
  │  └─ YES → Start with SDK (Option A)
  │
  ├─ Are PDF/OCR costs/performance the biggest pain?
  │  └─ YES → Start with Python Service (Option B)
  │
  ├─ Not sure?
  │  └─ Run Week 1 benchmarks, then decide
  │
  └─ Want both?
     └─ Start with Service (harder), SDK can follow quickly
```

---

## My Recommendation

**Start with Option B: Python OCR Microservice Prototype**

**Why:**
1. **Validates hardest part first** - If Python isn't faster, whole plan changes
2. **Immediate cost savings** - OCR is expensive
3. **Demonstrates architecture** - Proves TypeScript ↔ Python works
4. **SDK can follow** - Once service works, SDK is easier
5. **Bigger impact** - 10x performance > convenience

**Timeline:**
- **Week 1 (Foundation):** Benchmarks + OpenAPI + Python setup
- **Week 2 (Prototype):** Python OCR service + TypeScript integration
- **Week 3-4 (SDK):** Now build SDK on proven architecture

---

## Next Steps (Right Now)

**Today:**
1. ✅ Review these strategy documents
2. ✅ Get team buy-in on approach
3. ✅ Allocate developer time (1-2 devs for 2 weeks)

**Tomorrow:**
1. Create benchmark scripts
2. Run performance tests
3. Expand OpenAPI spec

**This Week:**
1. Complete Foundation Sprint
2. Make SDK vs Service decision
3. Start Week 2 quick win

---

## Questions to Answer (Week 1)

- [ ] How much faster is Python for PDF processing? (expect 10-20x)
- [ ] What's our current OCR cost per month? (baseline for savings)
- [ ] Do we have Python developers who want to integrate? (SDK demand)
- [ ] What's our risk tolerance? (prototype vs production)
- [ ] Who owns the Python services? (team/person responsible)

---

## Resources

**Code Examples:** All in this repo
- `scripts/benchmarks/` - Benchmark scripts
- `python/processors/` - Python PDF processor
- `python/services/` - FastAPI service
- `sdk-python/` - Python SDK (if chosen)

**Documentation:**
- PYTHON_EXTRACTION_ASSESSMENT.md - Full extraction plan
- PYTHON_SDK_PLAN.md - Complete SDK spec
- GRPC_VS_REST_ANALYSIS.md - Communication protocol analysis

**Tools:**
- PyMuPDF docs: https://pymupdf.readthedocs.io/
- FastAPI docs: https://fastapi.tiangolo.com/
- OpenAPI validator: https://validator.swagger.io/

---

## Success Looks Like (End of Week 2)

**You'll have:**
- ✅ Hard data on Python performance (benchmark results)
- ✅ Complete OpenAPI documentation
- ✅ Working MVP (SDK or Python service)
- ✅ Clear path forward for next 4 weeks
- ✅ Confidence in the architecture

**You'll know:**
- Is Python really 10x faster? (yes, but prove it)
- Will customers use a Python SDK? (start finding out)
- Can TypeScript and Python work together? (validate integration)
- What's the ROI on this investment? (calculate from benchmarks)

---

## Let's Go! 🚀

**Recommended first command:**
```bash
# Create benchmark directory
mkdir -p scripts/benchmarks test-data

# You're ready to start Week 1, Day 1
# Next step: Create pdf-benchmark.ts
```

Ready to kick this off? Start with the benchmarks - that's where the truth lives! 📊
