# Google Vision API Setup

The OCR service now supports **multiple providers** with automatic fallback!

## Supported Providers

| Provider | Cost | Accuracy | Speed | Free Tier |
|----------|------|----------|-------|-----------|
| **Google Vision** | $1.50/1000 after free | ⭐⭐⭐⭐⭐ Excellent | Fast | 1000/month FREE |
| OpenAI Vision | $0.15-2.50/1M tokens | ⭐⭐⭐⭐ Good | Fast | None |
| Tesseract | FREE | ⭐⭐⭐ Good | Fastest | Unlimited |

**Recommendation:** Use Google Vision for production (best quality + 1000 free requests/month!)

---

## Quick Start: Google Vision

### Step 1: Get Google Cloud Credentials

```bash
# 1. Go to https://console.cloud.google.com/
# 2. Create a project (or use existing)
# 3. Enable Vision API
# 4. Create service account key
# 5. Download JSON credentials file
```

### Step 2: Configure the Service

**Option A: Environment Variable (Recommended)**
```bash
# Set credentials path
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
export OCR_PROVIDER=google-vision

# Start service
docker-compose up python-ocr
```

**Option B: Docker Compose**
```yaml
# docker-compose.yml
python-ocr:
  environment:
    - GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json
    - OCR_PROVIDER=google-vision  # Primary provider
  volumes:
    - ./google-credentials.json:/app/credentials.json:ro
```

**Option C: Inline JSON** (for testing only!)
```bash
# Pass credentials as environment variable
export GOOGLE_CREDENTIALS_JSON='{"type": "service_account", ...}'
```

### Step 3: Test It

```bash
# Health check - see which providers are available
curl http://localhost:8000/health

# Expected output:
{
  "status": "ok",
  "processors": {
    "pdf": true,
    "ocr_google": true,      # ← Google Vision available!
    "ocr_openai": true,
    "ocr_tesseract": true
  }
}

# Extract text using Google Vision
curl -X POST http://localhost:8000/api/images/extract-text \
  -H "Content-Type: application/json" \
  -d '{
    "image_data": "base64-encoded-image",
    "provider": "google-vision"
  }'

# Response:
{
  "text": "Extracted text here",
  "confidence": 0.98,
  "metadata": {
    "provider": "google-vision",  # ← Used Google!
    "cost": 0.0015,               # ← Only $0.0015 per image
    "processing_time": 234
  }
}
```

---

## Provider Selection

### Automatic Fallback (Default)

The service automatically tries providers in order:
```
1. Google Vision (cheapest, most accurate) →
2. OpenAI Vision (good backup) →
3. Tesseract (free fallback)
```

If Google fails, it automatically tries OpenAI, then Tesseract!

### Manual Provider Selection

Specify which provider to use:

```python
# Python client
result = client.images.extract_text(
    image_data=image_bytes,
    provider="google-vision"  # Force Google Vision
)
```

```bash
# curl
curl -X POST .../extract-text \
  -d '{"image_data": "...", "provider": "tesseract"}'  # Force Tesseract (free!)
```

---

## Cost Comparison

### 1000 images/month:
- **Google Vision:** $0 (free tier!)
- **OpenAI Vision:** ~$1.50 (with gpt-4o-mini)
- **Tesseract:** $0 (always free)

### 10,000 images/month:
- **Google Vision:** ~$13.50 (9000 paid @ $1.50/1000)
- **OpenAI Vision:** ~$15
- **Tesseract:** $0 (always free)

**Winner:** Google Vision (best accuracy + cheapest!)

---

## Configuration Options

### Environment Variables

```bash
# Primary provider (default: google-vision)
OCR_PROVIDER=google-vision

# Google Vision credentials
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# OpenAI (fallback)
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-4o-mini

# Auto-fallback (default: true)
OCR_AUTO_FALLBACK=true
```

### Programmatic Configuration

```python
from processors.ocr import OCRProcessor

# Initialize with specific provider
ocr = OCRProcessor(
    primary_provider="google-vision",
    google_credentials_path="/path/to/credentials.json",
    openai_api_key="your-key",
    auto_fallback=True  # Automatically try other providers if primary fails
)

# Extract text
result = ocr.extract_text(image_bytes)
print(f"Provider used: {result.provider}")
print(f"Cost: ${result.cost:.6f}")
```

---

## Advanced: Multiple Languages

Google Vision supports 100+ languages automatically!

```python
# Extract text with language hints
result = await google_provider.extract_text(
    image_data,
    language_hints=["en", "es", "fr"]  # English, Spanish, French
)
```

No configuration needed - it auto-detects!

---

## Advanced: Document Text Detection

For dense text or tables, use document mode:

```python
from processors.ocr_providers.google_vision import GoogleVisionProvider

provider = GoogleVisionProvider(credentials_path="...")

# Better for structured documents
result = await provider.detect_document_text(image_data)
```

This uses Google's advanced document OCR API for better results on:
- Tables
- Multi-column text
- Forms
- Complex layouts

---

## Troubleshooting

### "google-cloud-vision not installed"

```bash
pip install google-cloud-vision
```

### "Google Vision provider not available"

Check credentials:
```bash
# Verify env var is set
echo $GOOGLE_APPLICATION_CREDENTIALS

# Verify file exists
ls -la $GOOGLE_APPLICATION_CREDENTIALS

# Test credentials
gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
```

### "Permission denied" or "API not enabled"

1. Go to https://console.cloud.google.com/
2. Select your project
3. Enable "Cloud Vision API"
4. Wait 2-3 minutes for propagation

### Provider not being used

Check logs:
```bash
docker-compose logs python-ocr | grep "provider"

# Should see:
# Google Vision provider initialized
# Using google-vision for OCR
```

---

## Migration from OpenAI

If you're currently using OpenAI Vision:

```bash
# Before (OpenAI only)
OCR_PROVIDER=openai-vision
OPENAI_API_KEY=your-key

# After (Google Vision with OpenAI fallback)
OCR_PROVIDER=google-vision
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google.json
OPENAI_API_KEY=your-key  # Keep for fallback!
```

No code changes needed! The service automatically uses Google and falls back to OpenAI if needed.

---

## Best Practices

1. **Use Google Vision as primary** - Best accuracy + cheapest
2. **Keep OpenAI as fallback** - Good backup if Google has issues
3. **Enable Tesseract fallback** - Free offline option
4. **Monitor costs** - Check which provider is being used in logs
5. **Use language hints** - Better accuracy for non-English text

---

## Next Steps

- [x] Set up Google Cloud credentials
- [x] Configure environment variables
- [x] Test provider selection
- [ ] Monitor costs and usage
- [ ] Tune provider priority based on your needs
- [ ] Consider document_text_detection for complex documents

---

## Support

Questions? Check:
- Google Vision docs: https://cloud.google.com/vision/docs
- API pricing: https://cloud.google.com/vision/pricing
- Quota limits: https://console.cloud.google.com/apis/api/vision.googleapis.com/quotas
