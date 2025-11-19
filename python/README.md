# Artificer Python Microservices

High-performance PDF and image processing microservices written in Python.

## Features

- **10-20x faster PDF processing** compared to Node.js (PyMuPDF vs pdf-parse)
- **OCR with multiple backends**: OpenAI Vision API + Tesseract fallback
- **REST API** compatible with TypeScript client
- **Docker support** for easy deployment
- **Health checks** and monitoring

## Quick Start

### Local Development (without Docker)

```bash
# Create virtual environment
cd python
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export OPENAI_API_KEY=your-key-here

# Run the service
python -m uvicorn services.ocr_service:app --reload --port 8000
```

Visit http://localhost:8000/docs for interactive API documentation.

### With Docker

```bash
# From project root
docker-compose up python-ocr

# Or build and run standalone
cd python
docker build -t artificer-python .
docker run -p 8000:8000 -e OPENAI_API_KEY=your-key artificer-python
```

## API Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### Extract PDF Text (Fast!)
```bash
curl -X POST http://localhost:8000/api/pdf/extract \
  -H "Content-Type: application/json" \
  -d '{
    "pdf_data": "base64-encoded-pdf-data"
  }'
```

### Check if PDF Needs OCR
```bash
curl -X POST http://localhost:8000/api/pdf/check-needs-ocr \
  -H "Content-Type: application/json" \
  -d '{
    "pdf_data": "base64-encoded-pdf-data",
    "min_text_threshold": 100
  }'
```

### Extract Text from Image (OCR)
```bash
curl -X POST http://localhost:8000/api/images/extract-text \
  -H "Content-Type: application/json" \
  -d '{
    "image_data": "base64-encoded-image-data",
    "content_type": "image/png"
  }'
```

## Architecture

```
┌─────────────────────────────────────────┐
│   TypeScript API (tRPC/REST)            │
│   ┌─────────────────────────────────┐   │
│   │  PythonOCRClient                │   │
│   │  • Auto-detect availability     │   │
│   │  • Fallback to TypeScript       │   │
│   └─────────────────────────────────┘   │
└────────────────┬────────────────────────┘
                 │ HTTP/JSON
                 ▼
┌─────────────────────────────────────────┐
│   Python FastAPI Service                │
│   ┌─────────────────────────────────┐   │
│   │  PDF Processor (PyMuPDF)        │   │
│   │  • 10-20x faster than pdf-parse │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │  OCR Processor                  │   │
│   │  • OpenAI Vision API            │   │
│   │  • Tesseract (free fallback)    │   │
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Performance Comparison

| Operation | TypeScript | Python | Speedup |
|-----------|-----------|--------|---------|
| PDF text extraction (10 pages) | ~100-200ms | ~5-20ms | **10-20x** |
| PDF text extraction (100 pages) | ~1-2s | ~50-100ms | **20x** |
| Image resize/crop | ~50ms | ~10-20ms | **2-3x** |

## Environment Variables

- `OPENAI_API_KEY` - OpenAI API key for Vision OCR
- `OCR_MODEL` - Model to use (default: gpt-4o-mini)
- `PORT` - Service port (default: 8000)
- `HOST` - Bind address (default: 0.0.0.0)

## Development

### Run Tests
```bash
pytest tests/
```

### Format Code
```bash
black processors/ services/
```

### Type Checking
```bash
mypy processors/ services/
```

### Linting
```bash
ruff check processors/ services/
```

## Integration with TypeScript

The TypeScript application automatically detects and uses the Python service:

```typescript
// src/server/services/python/PythonOCRClient.ts
import { pythonOCRClient } from '../python/PythonOCRClient';

// Automatically uses Python if available
if (pythonOCRClient.isAvailable()) {
  const result = await pythonOCRClient.extractPdfText(buffer);
  // 10-20x faster!
}
```

## Troubleshooting

### Python service not starting

Check Docker logs:
```bash
docker-compose logs python-ocr
```

### OCR not working

Ensure `OPENAI_API_KEY` is set:
```bash
docker-compose exec python-ocr env | grep OPENAI
```

### Port 8000 already in use

Change the port in docker-compose.yml:
```yaml
python-ocr:
  ports:
    - '8080:8000'  # External:Internal
```

Then update `.env`:
```
PYTHON_OCR_URL=http://localhost:8080
```

## Future Enhancements

- [ ] Full PDF OCR with page-by-page processing
- [ ] gRPC support for even better performance
- [ ] Celery workers for batch processing
- [ ] Image preprocessing for better OCR accuracy
- [ ] Support for more OCR providers (Azure, AWS)
- [ ] Batch endpoints for multiple files
