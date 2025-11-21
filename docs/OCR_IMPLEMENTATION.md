# OCR Implementation Guide

## Overview

The Artificer supports Optical Character Recognition (OCR) for extracting text from images and PDFs. This enables processing of diagrams, scanned documents, screenshots, and other visual content containing text.

## Architecture

### Document Converter Library (`lib/document-converter/`)

**PDF Extraction**
- `PdfExtractor` - Direct text extraction from PDFs using pdf-parse
- `PdfMetadata` types and date parsing
- Smart OCR detection (`needsOCR()` method)
- Page count and metadata extraction

**Image Processing**
- `ImageExtractor` - Metadata extraction using sharp
- Support for JPEG, PNG, WebP, GIF, SVG, TIFF, AVIF
- Thumbnail generation
- Image optimization and format conversion

**OCR Interface**
- `OCRProvider` interface for pluggable implementations
- `OCRResult` type with confidence and metadata
- `PdfImportOptions` for hybrid extraction

**PDF Importer**
- `PdfImporter` - Converts PDFs to Portable Text
- Integrates with OCR provider for scanned PDFs
- Metadata preservation in Portable Text blocks

### Main Application Services

**OCR Service** (`src/server/services/image/OCRService.ts`)
- OpenAI Vision API integration (gpt-4o, gpt-4o-mini)
- Text extraction from images and PDFs
- Image analysis with custom prompts
- Batch processing support
- Cost calculation and metadata tracking
- Confidence scoring

**PDF Service** (`src/server/services/document/PdfService.ts`)
- Hybrid PDF processing (direct extraction → OCR fallback)
- Smart OCR detection to minimize costs
- Cost estimation for OCR operations
- Processing time tracking
- Metadata extraction

### Database Schema

**Document Model Updates**
- `imageData` field (Bytes) for storing image previews
- `metadata` supports OCR confidence and image info
- `content` field stores OCR-extracted text

### API Layer

**Images tRPC Router** (`src/server/routers/images.ts`)

Available endpoints:
- `analyzeImage` - AI vision analysis with custom prompts
- `extractTextFromImage` - OCR text extraction
- `processPdf` - Smart PDF processing with automatic OCR detection
- `checkPdfNeedsOCR` - Pre-check OCR need and cost estimate

All endpoints available at `trpc.images.*`

## Setup

### 1. Install Dependencies

```bash
# Main dependencies
npm install

# Document converter library
cd lib/document-converter
npm install
cd ../..
```

### 2. Environment Configuration

Add to `.env`:
```bash
OPENAI_API_KEY="sk-..."
```

### 3. Database Migration

If not already applied:
```bash
npm run db:migrate
```

## Usage

### Extracting Text from Images

```typescript
const result = await trpc.images.extractTextFromImage.mutate({
  imageData: base64ImageString,
  contentType: 'image/png'
});

console.log(result.text);
console.log(result.confidence);
```

### Analyzing Images with Custom Prompts

```typescript
const result = await trpc.images.analyzeImage.mutate({
  imageData: base64ImageString,
  contentType: 'image/jpeg',
  prompt: 'Describe the diagram and extract any labels or annotations'
});

console.log(result.text);
```

### Processing PDFs

The system automatically detects whether a PDF needs OCR:

```typescript
// Automatic detection
const result = await trpc.images.processPdf.mutate({
  pdfData: base64PdfString
});

console.log(result.text);
console.log(result.metadata.method); // 'direct' or 'ocr'

// Force OCR
const ocrResult = await trpc.images.processPdf.mutate({
  pdfData: base64PdfString,
  options: { forceOCR: true }
});
```

### Checking OCR Costs Before Processing

```typescript
const check = await trpc.images.checkPdfNeedsOCR.query({
  pdfData: base64PdfString
});

if (check.needsOCR) {
  console.log(`OCR estimated cost: $${check.estimatedCost.toFixed(4)}`);
  console.log(`Pages: ${check.metadata.pages}`);
}
```

## Cost Estimates

### OpenAI Vision (OCR)

**Model: gpt-4o-mini** (recommended)
- Single image: ~$0.001
- 10-page PDF: ~$0.01
- 100-page PDF: ~$0.10

**Model: gpt-4o** (higher accuracy)
- Single image: ~$0.005
- 10-page PDF: ~$0.05
- 100-page PDF: ~$0.50

### Hybrid PDF Strategy

The system uses a hybrid approach to minimize costs:

1. **Try direct extraction first** (free, ~100ms)
2. **Only use OCR if needed** (paid, ~2-5s per page)

This means:
- **Digital PDFs**: $0.00 (direct text extraction)
- **Scanned PDFs**: Variable cost based on page count
- **Mixed PDFs**: Only pays for scanned pages

Average savings: 90% compared to OCR-only approach

## Use Cases

### 1. Diagram Processing

Extract text from technical diagrams, flowcharts, and architecture diagrams:

```typescript
const result = await trpc.images.analyzeImage.mutate({
  imageData: diagramBase64,
  contentType: 'image/png',
  prompt: 'Extract all text labels and describe the flow or structure shown'
});
```

### 2. Screenshot Documentation

Extract code or text from screenshots:

```typescript
const result = await trpc.images.extractTextFromImage.mutate({
  imageData: screenshotBase64,
  contentType: 'image/png'
});
```

### 3. Scanned Document Processing

Process scanned books, papers, or handwritten notes:

```typescript
const result = await trpc.images.processPdf.mutate({
  pdfData: scannedBookBase64,
  options: { minTextThreshold: 50 }
});
```

### 4. Mixed Media Projects

Combine text documents and images in a unified knowledge base:

```typescript
// Upload and process image
const ocrResult = await trpc.images.extractTextFromImage.mutate({
  imageData: imageBase64,
  contentType: 'image/jpeg'
});

// Store in knowledge base
await trpc.documents.create.mutate({
  projectId: 'project-123',
  filename: 'diagram.jpg',
  content: ocrResult.text,
  metadata: {
    confidence: ocrResult.confidence,
    ocrProvider: 'openai-vision'
  }
});
```

## Integration with Batch Processing

OCR can be integrated into batch processing pipelines:

```typescript
const job = await batchService.createBatchJob({
  name: 'Process scanned documents',
  items: imageFiles.map(file => ({
    imageData: file.base64,
    contentType: file.mimeType
  })),
  phases: [
    {
      name: 'ocr_extraction',
      taskType: 'ocr',
      validation: {
        enabled: true,
        minScore: 7 // Confidence threshold
      }
    },
    {
      name: 'summarize',
      taskType: 'summarization'
    }
  ],
  options: {
    concurrency: 5, // Process 5 images simultaneously
    checkpointFrequency: 10
  }
});
```

## Best Practices

### 1. Pre-check OCR Needs

For PDFs, always check if OCR is needed before processing:

```typescript
const check = await trpc.images.checkPdfNeedsOCR.query({ pdfData });
if (!check.needsOCR) {
  // Use free direct extraction
  const result = await processPdfDirectly(pdfData);
} else {
  // Inform user of cost and proceed
  const result = await trpc.images.processPdf.mutate({ pdfData });
}
```

### 2. Choose the Right Model

- **gpt-4o-mini**: Fast, cheap, good for printed text
- **gpt-4o**: Better for handwriting, complex layouts, or critical accuracy

### 3. Use Custom Prompts for Specific Needs

Instead of generic OCR, use `analyzeImage` with specific prompts:

```typescript
// Generic OCR
const generic = await extractTextFromImage({ ... });

// Targeted extraction
const targeted = await analyzeImage({
  imageData,
  contentType,
  prompt: 'Extract only the error message and stack trace from this screenshot'
});
```

### 4. Batch Similar Documents

Process multiple images together to maximize throughput:

```typescript
// Instead of sequential processing
for (const image of images) {
  await extractText(image); // Slow
}

// Use batch processing
const results = await Promise.all(
  images.map(image => extractText(image)) // Parallel
);
```

## Troubleshooting

### "OCR service not configured"

**Problem**: Missing OpenAI API key

**Solution**:
```bash
export OPENAI_API_KEY="sk-..."
# or add to .env file
```

### Low Confidence Scores

**Problem**: OCR returns low confidence (<0.5)

**Possible causes**:
- Poor image quality or resolution
- Handwritten text
- Complex layout or formatting
- Non-English text

**Solutions**:
- Increase image resolution
- Use higher quality scans
- Switch to gpt-4o model for better accuracy
- Provide custom prompt to focus on specific content

### High Costs

**Problem**: OCR costs higher than expected

**Solutions**:
- Use `checkPdfNeedsOCR` before processing
- Ensure direct extraction is tried first for digital PDFs
- Batch process to reduce overhead
- Use gpt-4o-mini instead of gpt-4o

### Missing Text

**Problem**: OCR doesn't extract all text

**Solutions**:
- Check image quality and contrast
- Try custom prompt to focus on missed content
- Verify text is actually visible in image
- Consider manual review for critical content

## Future Enhancements

Planned improvements:

- **Tesseract.js integration**: Free OCR fallback for simple cases
- **Multi-page PDF optimization**: Process pages in parallel
- **S3 storage**: Store processed images and OCR results
- **OCR quality metrics**: Automatic quality assessment
- **Layout preservation**: Maintain document structure in output
- **Table extraction**: Specialized handling for tabular data

## API Reference

### extractTextFromImage

Extract plain text from an image.

**Input**:
```typescript
{
  imageData: string;    // base64 encoded image
  contentType: string;  // MIME type (image/png, image/jpeg, etc.)
}
```

**Output**:
```typescript
{
  text: string;
  confidence: number;   // 0-1
  metadata: {
    provider: string;
    model: string;
    cost: number;
    processingTime: number;
  }
}
```

### analyzeImage

Analyze image with custom prompt.

**Input**:
```typescript
{
  imageData: string;
  contentType: string;
  prompt?: string;      // Optional analysis prompt
}
```

**Output**:
```typescript
{
  text: string;         // Analysis result
  confidence: number;
  metadata: { ... }
}
```

### processPdf

Smart PDF processing with automatic OCR detection.

**Input**:
```typescript
{
  pdfData: string;      // base64 encoded PDF
  options?: {
    forceOCR?: boolean;           // Skip direct extraction
    minTextThreshold?: number;     // Characters needed to skip OCR
  }
}
```

**Output**:
```typescript
{
  text: string;
  metadata: {
    method: 'direct' | 'ocr';
    pages: number;
    hasTextContent: boolean;
    cost: number;
    processingTime: number;
  }
}
```

### checkPdfNeedsOCR

Check if PDF requires OCR and estimate cost.

**Input**:
```typescript
{
  pdfData: string;
  minTextThreshold?: number;
}
```

**Output**:
```typescript
{
  needsOCR: boolean;
  metadata: {
    pages: number;
    hasTextContent: boolean;
    textLength: number;
  };
  estimatedCost: number;  // USD
}
```

## Related Documentation

- [Batch Processing Guide](./BATCH_PROCESSING.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Document Converter Library](../lib/document-converter/README.md)
