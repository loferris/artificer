# Image Generation & OCR Integration Proposal

## Executive Summary

This document outlines how **image generation** and **OCR (Optical Character Recognition)** capabilities could be integrated into the AI Workflow Engine. The existing architecture is well-suited for these enhancements due to its service-oriented design, robust document processing system, and RAG (Retrieval-Augmented Generation) infrastructure.

## Current Architecture Overview

### Existing Document Processing Flow
```
User Upload → DocumentService → Text Extraction → ChunkingService → EmbeddingService → VectorService (Chroma)
                                                                                               ↓
                                                                                         RAG Retrieval
```

### Key Existing Components
- **DocumentService** (`src/server/services/project/DocumentService.ts`): Handles document CRUD, text extraction
- **VectorService** (`src/server/services/vector/VectorService.ts`): Manages Chroma collections for semantic search
- **EmbeddingService** (`src/server/services/vector/EmbeddingService.ts`): Generates embeddings via OpenAI
- **RAGService** (`src/server/services/rag/RAGService.ts`): Retrieves context for conversations
- **ChainOrchestrator** (`src/server/services/orchestration/ChainOrchestrator.ts`): Intelligent model routing

### Current Limitations
- **Text documents only**: Supports text, markdown, JSON, CSV
- **No image processing**: Cannot extract text from images
- **No image generation**: Cannot create visual content from descriptions

---

## Part 1: OCR Integration

### Use Cases
1. **Document Scanning**: Extract text from scanned PDFs, receipts, forms, screenshots
2. **Image-based RAG**: Make text in images searchable and retrievable for conversations
3. **Mixed Media Projects**: Combine text documents and images in unified knowledge base
4. **Screenshot Analysis**: Extract code, diagrams, or text from screenshots for documentation

### Architecture Design

#### 1. New Service: `OCRService`

**Location**: `/home/user/ai-workflow-engine/src/server/services/image/OCRService.ts`

```typescript
interface OCRResult {
  text: string;
  confidence: number;
  language?: string;
  metadata: {
    processingTime: number;
    provider: 'openai-vision' | 'tesseract' | 'google-vision' | 'aws-textract';
    pageCount?: number;
  };
}

class OCRService {
  /**
   * Extract text from image using configured provider
   */
  async extractText(
    buffer: Buffer,
    contentType: string,
    options?: OCROptions
  ): Promise<OCRResult>;

  /**
   * Batch process multiple images
   */
  async extractTextBatch(
    images: Array<{ buffer: Buffer; contentType: string }>
  ): Promise<OCRResult[]>;

  /**
   * Analyze image content with AI vision models
   */
  async analyzeImage(
    buffer: Buffer,
    contentType: string,
    prompt: string
  ): Promise<{ description: string; details: object }>;
}
```

#### 2. OCR Provider Options

**Option A: OpenAI Vision API (Recommended for MVP)**
- **Pros**: Already using OpenAI for embeddings, multimodal capabilities, high accuracy
- **Cons**: Cost per image, requires API quota
- **Implementation**: Use `gpt-4o-mini` or `gpt-4o` with vision
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Extract all text from this image verbatim." },
      { type: "image_url", image_url: { url: `data:${contentType};base64,${base64Image}` } }
    ]
  }]
});
```

**Option B: Tesseract.js (Open Source)**
- **Pros**: Free, runs locally, no external API dependency
- **Cons**: Lower accuracy than AI models, limited language support
- **Implementation**: Node.js bindings to Tesseract OCR engine

**Option C: Google Cloud Vision / AWS Textract**
- **Pros**: Enterprise-grade accuracy, form recognition, handwriting support
- **Cons**: Additional cloud provider dependency, cost considerations

**Recommended Strategy**: Start with OpenAI Vision (Option A) for quality, add Tesseract (Option B) as fallback for cost-sensitive scenarios.

#### 3. Extended DocumentService

**Update**: `/home/user/ai-workflow-engine/src/server/services/project/DocumentService.ts`

```typescript
class DocumentService {
  constructor(
    // ... existing dependencies
    private ocrService?: OCRService
  ) {}

  private async extractTextContent(
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    // Existing text extraction
    if (contentType === 'text/plain') return buffer.toString('utf-8');
    if (contentType === 'text/markdown') return buffer.toString('utf-8');
    if (contentType === 'application/json') return this.extractJsonText(buffer);

    // NEW: Image OCR extraction
    if (contentType.startsWith('image/')) {
      if (!this.ocrService) {
        throw new Error('OCR service not configured for image processing');
      }
      const result = await this.ocrService.extractText(buffer, contentType);
      return result.text;
    }

    // Future: PDF support with embedded images
    if (contentType === 'application/pdf') {
      // Extract text + OCR embedded images
      return await this.extractPdfContent(buffer);
    }

    throw new Error(`Unsupported content type: ${contentType}`);
  }
}
```

#### 4. Database Schema Updates

**Add to**: `/home/user/ai-workflow-engine/prisma/schema.prisma`

```prisma
model Document {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  filename    String
  content     String   @db.Text
  contentType String
  size        Int
  metadata    Json?    // Now includes OCR metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // NEW: Optional image storage
  imageData   Bytes?   // Store original image binary (optional, for thumbnail/preview)

  @@index([projectId])
  @@index([contentType])
}
```

**Metadata Schema Extension** (stored in `metadata` JSON field):
```typescript
interface DocumentMetadata {
  // Existing fields...

  // NEW: OCR-specific metadata
  ocr?: {
    provider: 'openai-vision' | 'tesseract' | 'google-vision' | 'aws-textract';
    confidence: number;        // 0.0 - 1.0
    language?: string;
    processingTime: number;    // milliseconds
    extractedAt: string;       // ISO timestamp
    pageCount?: number;        // for multi-page PDFs
  };

  // NEW: Image metadata
  image?: {
    width: number;
    height: number;
    format: string;            // png, jpeg, webp
    hasTransparency: boolean;
  };
}
```

#### 5. API Endpoints

**New tRPC Procedures** in `/home/user/ai-workflow-engine/src/server/routers/images.ts`:

```typescript
export const imagesRouter = router({
  /**
   * Process image with OCR and store as document
   */
  processImageDocument: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      filename: z.string(),
      imageData: z.string(), // base64
      contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
      options: z.object({
        ocrProvider: z.enum(['openai-vision', 'tesseract']).optional(),
        storeImage: z.boolean().default(false), // Store original for preview
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Convert base64 to buffer
      // 2. OCR extraction via OCRService
      // 3. Store document via DocumentService (triggers embeddings)
      // 4. Return document with OCR metadata
    }),

  /**
   * Analyze image content with AI vision
   */
  analyzeImage: protectedProcedure
    .input(z.object({
      imageData: z.string(),
      contentType: z.string(),
      prompt: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Use OpenAI Vision to describe image
    }),

  /**
   * Re-process existing document with different OCR provider
   */
  reprocessDocument: protectedProcedure
    .input(z.object({
      documentId: z.string(),
      ocrProvider: z.enum(['openai-vision', 'tesseract']),
    }))
    .mutation(async ({ input, ctx }) => {
      // Re-run OCR and update document
    }),
});
```

#### 6. Frontend Components

**Enhanced ProjectPanel** (`src/components/modern/ProjectPanel.tsx`):

```typescript
// Add image upload support
const acceptedFileTypes = {
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/json': ['.json'],
  'text/csv': ['.csv'],
  // NEW: Image support
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

// Display image documents with thumbnails
{document.contentType.startsWith('image/') && (
  <div className="flex items-center gap-3">
    <img
      src={`data:${document.contentType};base64,${document.imageData}`}
      className="w-16 h-16 object-cover rounded"
    />
    <div>
      <p className="font-medium">{document.filename}</p>
      {document.metadata?.ocr && (
        <p className="text-xs text-gray-500">
          OCR Confidence: {(document.metadata.ocr.confidence * 100).toFixed(0)}%
        </p>
      )}
    </div>
  </div>
)}
```

**New Component**: `/home/user/ai-workflow-engine/src/components/modern/ImageDocumentViewer.tsx`

```typescript
interface ImageDocumentViewerProps {
  document: Document;
  onReprocess?: (provider: OCRProvider) => void;
}

/**
 * Display image document with:
 * - Original image preview
 * - Extracted text
 * - OCR metadata (confidence, provider)
 * - Re-process button to try different OCR provider
 */
export function ImageDocumentViewer({ document, onReprocess }: ImageDocumentViewerProps) {
  // Implementation
}
```

#### 7. Integration with RAG System

**The beauty**: OCR text automatically flows into RAG with **zero changes** to RAGService!

```
Image Upload → OCRService.extractText() → DocumentService.create(extractedText)
                                               ↓
                                         ChunkingService
                                               ↓
                                         EmbeddingService
                                               ↓
                                         VectorService (Chroma)
                                               ↓
                                    ✅ Searchable in RAG queries!
```

When a user asks: "What was the total on the invoice I uploaded?"
- RAGService retrieves OCR-extracted text chunks
- Shows source attribution: "invoice_scan.jpg (confidence: 95%)"

---

## Part 2: Image Generation

### Use Cases
1. **Diagram Creation**: Generate flowcharts, architecture diagrams, mockups from descriptions
2. **Visual Documentation**: Create illustrations for project documentation
3. **Creative Workflows**: Generate art, logos, UI concepts based on conversation context
4. **Conversation Enhancement**: Visualize abstract concepts discussed in chat

### Architecture Design

#### 1. New Service: `ImageGenerationService`

**Location**: `/home/user/ai-workflow-engine/src/server/services/image/ImageGenerationService.ts`

```typescript
interface ImageGenerationOptions {
  model: 'dalle-3' | 'dalle-2' | 'stable-diffusion-xl' | 'midjourney';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number; // Number of images (DALL-E 2 supports multiple)
}

interface GeneratedImage {
  id: string;
  url?: string;           // Hosted URL (if using external storage)
  base64?: string;        // Base64 data (if stored inline)
  prompt: string;
  revisedPrompt?: string; // DALL-E may revise prompts
  model: string;
  parameters: ImageGenerationOptions;
  cost?: number;
  createdAt: Date;
}

class ImageGenerationService {
  /**
   * Generate image from text prompt
   */
  async generateImage(
    prompt: string,
    options: ImageGenerationOptions
  ): Promise<GeneratedImage>;

  /**
   * Generate image with streaming progress updates
   */
  async generateImageStream(
    prompt: string,
    options: ImageGenerationOptions,
    onProgress: (progress: GenerationProgress) => void
  ): Promise<GeneratedImage>;

  /**
   * Generate variations of existing image
   */
  async createVariation(
    imageBuffer: Buffer,
    n: number
  ): Promise<GeneratedImage[]>;

  /**
   * Edit image with text prompt (inpainting)
   */
  async editImage(
    imageBuffer: Buffer,
    maskBuffer: Buffer,
    prompt: string
  ): Promise<GeneratedImage>;
}
```

#### 2. Image Generation Provider Options

**Option A: OpenAI DALL-E 3 (Recommended)**
- **Pros**: Best quality, prompt understanding, automatic safety filtering
- **Cons**: $0.040 per 1024×1024 standard, $0.080 HD
- **Implementation**:
```typescript
const response = await openai.images.generate({
  model: "dall-e-3",
  prompt: prompt,
  size: "1024x1024",
  quality: "standard",
  n: 1,
});
```

**Option B: Stable Diffusion via Replicate/Hugging Face**
- **Pros**: Lower cost, more customization, open source
- **Cons**: Requires separate API, less safety filtering
- **Implementation**: Use Replicate API or self-host

**Option C: OpenRouter Multi-Model Support**
- **Pros**: Already integrated, multiple providers
- **Cons**: May not have latest image models

**Recommended**: Start with DALL-E 3, add Stable Diffusion for cost-sensitive use cases.

#### 3. Database Schema

**New Model** in `/home/user/ai-workflow-engine/prisma/schema.prisma`:

```prisma
model GeneratedImage {
  id              String   @id @default(cuid())
  userId          String?
  user            User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  projectId       String?
  project         Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  conversationId  String?
  conversation    Conversation? @relation(fields: [conversationId], references: [id], onDelete: SetNull)
  messageId       String?
  message         Message? @relation(fields: [messageId], references: [id], onDelete: SetNull)

  prompt          String   @db.Text
  revisedPrompt   String?  @db.Text
  model           String   // dalle-3, stable-diffusion-xl, etc.

  // Storage options
  imageUrl        String?  // External URL (S3, CDN)
  imageData       Bytes?   // Binary storage (PostgreSQL bytea)
  base64Data      String?  @db.Text // Base64 (for small images)

  parameters      Json     // Size, quality, style, etc.
  metadata        Json?    // Cost, generation time, etc.

  createdAt       DateTime @default(now())

  @@index([userId])
  @@index([projectId])
  @@index([conversationId])
  @@index([createdAt])
}
```

**Metadata Schema**:
```typescript
interface GeneratedImageMetadata {
  size: string;              // "1024x1024"
  quality: 'standard' | 'hd';
  style: 'vivid' | 'natural';
  generationTime: number;    // milliseconds
  cost: number;              // USD
  provider: string;          // openai, replicate, etc.
  contentFiltered?: boolean; // Safety filter triggered
  safetyFlags?: string[];
}
```

#### 4. API Endpoints

**New Router**: `/home/user/ai-workflow-engine/src/server/routers/images.ts` (extended)

```typescript
export const imagesRouter = router({
  // ... OCR endpoints above ...

  /**
   * Generate image from text prompt
   */
  generateImage: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(4000),
      projectId: z.string().optional(),
      conversationId: z.string().optional(),
      messageId: z.string().optional(),
      options: z.object({
        model: z.enum(['dalle-3', 'dalle-2', 'stable-diffusion-xl']).default('dalle-3'),
        size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional(),
        quality: z.enum(['standard', 'hd']).optional(),
        style: z.enum(['vivid', 'natural']).optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Call ImageGenerationService
      // 2. Store in GeneratedImage table
      // 3. Optionally attach to conversation/message
      // 4. Return image URL or base64
    }),

  /**
   * Stream image generation with progress
   */
  generateImageStream: protectedProcedure
    .input(z.object({
      prompt: z.string(),
      options: z.object({
        model: z.string(),
        size: z.string().optional(),
      }).optional(),
    }))
    .subscription(async function* ({ input, ctx }) {
      yield { status: 'queued', progress: 0 };
      yield { status: 'generating', progress: 0.3 };

      const image = await imageGenService.generateImage(input.prompt, input.options);

      yield { status: 'complete', progress: 1.0, image };
    }),

  /**
   * List generated images for project/conversation
   */
  listGeneratedImages: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      conversationId: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      // Query GeneratedImage with filters
    }),

  /**
   * Delete generated image
   */
  deleteGeneratedImage: protectedProcedure
    .input(z.object({
      imageId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Delete from storage + database
    }),
});
```

#### 5. Integration with Chat System

**Option A: Slash Command**

Add to message input: `/imagine [prompt]` or `/generate-image [prompt]`

```typescript
// In ChatService.createMessageStream()
if (content.startsWith('/imagine ')) {
  const imagePrompt = content.replace('/imagine ', '');

  // Generate image
  const image = await imageGenService.generateImage(imagePrompt, {
    model: 'dalle-3',
  });

  // Store image linked to conversation
  await prisma.generatedImage.create({
    data: {
      conversationId,
      prompt: imagePrompt,
      imageUrl: image.url,
      model: 'dalle-3',
      parameters: image.parameters,
    },
  });

  // Return assistant message with image reference
  return {
    role: 'assistant',
    content: `Generated image: [${imagePrompt}](${image.url})`,
    metadata: { imageId: image.id },
  };
}
```

**Option B: Natural Language Detection**

Use orchestration system to detect image generation requests:

```typescript
// In AnalyzerAgent
if (query includes "create an image", "draw a diagram", "generate a picture") {
  category = "image_generation";
  complexity = 5;
}

// In RouterAgent
if (analysis.category === "image_generation") {
  return {
    useImageGeneration: true,
    model: "dalle-3",
    extractedPrompt: "...",
  };
}
```

**Option C: Explicit UI Button**

Add "Generate Image" button to message input:
- Opens modal with prompt + options
- Shows generation progress
- Inserts image into conversation

#### 6. Frontend Components

**New Component**: `/home/user/ai-workflow-engine/src/components/modern/ImageGenerationPanel.tsx`

```typescript
interface ImageGenerationPanelProps {
  conversationId?: string;
  projectId?: string;
  onImageGenerated?: (image: GeneratedImage) => void;
}

export function ImageGenerationPanel({ conversationId, projectId, onImageGenerated }) {
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<ImageGenerationOptions>({
    model: 'dalle-3',
    size: '1024x1024',
    quality: 'standard',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMutation = trpc.images.generateImage.useMutation();

  return (
    <div className="space-y-4">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the image you want to generate..."
        className="w-full h-32 p-3 border rounded"
      />

      <div className="grid grid-cols-3 gap-4">
        <select value={options.model} onChange={...}>
          <option value="dalle-3">DALL-E 3</option>
          <option value="stable-diffusion-xl">Stable Diffusion XL</option>
        </select>

        <select value={options.size} onChange={...}>
          <option value="1024x1024">Square (1024×1024)</option>
          <option value="1792x1024">Landscape (1792×1024)</option>
          <option value="1024x1792">Portrait (1024×1792)</option>
        </select>

        <select value={options.quality} onChange={...}>
          <option value="standard">Standard</option>
          <option value="hd">HD (2x cost)</option>
        </select>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt}
        className="btn-primary"
      >
        {isGenerating ? 'Generating...' : 'Generate Image'}
      </button>

      {generatedImage && (
        <img
          src={generatedImage.url}
          alt={prompt}
          className="w-full rounded shadow-lg"
        />
      )}
    </div>
  );
}
```

**Enhanced MessageList** to display generated images inline:

```typescript
{message.metadata?.imageId && (
  <div className="mt-2">
    <img
      src={message.metadata.imageUrl}
      alt="Generated image"
      className="max-w-md rounded shadow"
    />
    <p className="text-xs text-gray-500 mt-1">
      Generated with {message.metadata.model}
    </p>
  </div>
)}
```

#### 7. Storage Strategy

**Option A: PostgreSQL Bytea (Simple)**
- Store images directly in `GeneratedImage.imageData` (Bytes type)
- **Pros**: No external dependencies, transactional consistency
- **Cons**: Database size grows, slower queries, max ~1GB per field

**Option B: File System Storage**
- Store in `/public/generated-images/` or similar
- **Pros**: Fast, simple, works for small deployments
- **Cons**: Doesn't scale horizontally, backup complexity

**Option C: Cloud Storage (S3, Cloudflare R2)**
- Store images in object storage, save URL in database
- **Pros**: Scalable, CDN support, separate concerns
- **Cons**: External dependency, cost considerations

**Option D: Base64 in JSON (Not Recommended)**
- Store base64 string in metadata field
- **Pros**: Self-contained
- **Cons**: Inefficient, query performance issues

**Recommended for MVP**: PostgreSQL Bytea for images <1MB, with option to migrate to S3 later.

---

## Part 3: Combined Use Cases

### Use Case 1: "Visual Research Assistant"

**Workflow**:
1. User uploads screenshot of architecture diagram (OCR extracts text labels)
2. User asks: "Recreate this diagram with updated service names"
3. RAG retrieves OCR text from diagram
4. AI generates description for new diagram
5. ImageGenerationService creates updated diagram
6. User downloads or adds to project documentation

### Use Case 2: "Document Processing Pipeline"

**Workflow**:
1. User uploads scanned contract (PDF with images)
2. OCR extracts text from each page
3. Text gets embedded and indexed in Chroma
4. User queries: "What's the termination clause?"
5. RAG retrieves relevant OCR chunks
6. User asks: "Create an infographic summarizing key terms"
7. AI generates visual summary

### Use Case 3: "Multimodal Conversation"

**Workflow**:
1. User uploads product screenshot (OCR + vision analysis)
2. AI describes UI elements + extracts visible text
3. User asks: "Design an improved version with dark mode"
4. AI generates new mockup image
5. User iterates: "Make the buttons larger"
6. AI generates variation

---

## Implementation Roadmap

### Phase 1: OCR Foundation (Week 1-2)
- [ ] Create `OCRService` with OpenAI Vision provider
- [ ] Update `DocumentService` to support image content types
- [ ] Add database migration for image metadata
- [ ] Update `ProjectPanel` to accept image uploads
- [ ] Test OCR extraction → RAG pipeline
- [ ] Add simple image document viewer

### Phase 2: Image Generation Core (Week 3-4)
- [ ] Create `ImageGenerationService` with DALL-E 3
- [ ] Add `GeneratedImage` database model
- [ ] Create `images` tRPC router
- [ ] Build `ImageGenerationPanel` component
- [ ] Implement streaming progress updates
- [ ] Test end-to-end generation flow

### Phase 3: Chat Integration (Week 5-6)
- [ ] Add slash command support (`/imagine`)
- [ ] Integrate with orchestration for natural detection
- [ ] Display generated images in `MessageList`
- [ ] Link images to conversations/messages
- [ ] Add image gallery view in project panel
- [ ] Implement image regeneration/editing

### Phase 4: Advanced Features (Week 7-8)
- [ ] Add Tesseract.js as fallback OCR provider
- [ ] Support multi-page PDF OCR
- [ ] Image variation generation
- [ ] Image editing (inpainting) support
- [ ] Cost tracking for image generation
- [ ] Export conversations with embedded images

### Phase 5: Polish & Optimization (Week 9-10)
- [ ] Migrate to S3/R2 storage for scalability
- [ ] Add image compression/optimization
- [ ] Implement thumbnail generation
- [ ] Add batch image processing
- [ ] Create comprehensive tests
- [ ] Performance optimization
- [ ] Documentation + examples

---

## Cost Considerations

### OCR Costs (OpenAI Vision)
- **GPT-4o Mini**: $0.15 per 1M input tokens (~150 images for $0.15)
- **GPT-4o**: $5.00 per 1M input tokens (~200 images for $1.00)
- **Tesseract** (fallback): Free

**Estimated Monthly Cost** (100 images/month): **~$1-5**

### Image Generation Costs (DALL-E 3)
- **Standard 1024×1024**: $0.040 per image
- **HD 1024×1024**: $0.080 per image
- **Standard 1792×1024**: $0.080 per image

**Estimated Monthly Cost** (50 images/month): **$2-4**

### Storage Costs
- **PostgreSQL**: Included (assuming <10GB images)
- **S3 Standard**: $0.023 per GB/month + transfer
- **Cloudflare R2**: $0.015 per GB/month, free egress

**Estimated Monthly Cost** (5GB images): **$0.12 (S3) or $0.08 (R2)**

**Total Estimated Monthly Cost**: **$3-10** for moderate usage

---

## Security Considerations

### OCR Security
1. **Input Validation**: Check image file size (<10MB), MIME types
2. **Content Filtering**: Reject images with explicit content (OpenAI auto-filters)
3. **Rate Limiting**: Limit OCR requests per user/project
4. **PII Detection**: Warn users if OCR detects sensitive data (SSN, credit cards)

### Image Generation Security
1. **Prompt Filtering**: Block prompts requesting explicit/harmful content
2. **Content Moderation**: Use OpenAI's safety features
3. **Rate Limiting**: Prevent abuse (e.g., 10 generations/hour)
4. **Cost Caps**: Set per-user spending limits
5. **Storage Quotas**: Limit total images per user/project

### Data Privacy
1. **Image Storage**: Encrypt at rest (database/S3)
2. **Access Control**: Only owners can view generated/uploaded images
3. **Retention Policy**: Auto-delete images after X days (configurable)
4. **Audit Logging**: Track image uploads, generations, deletions

---

## Testing Strategy

### Unit Tests
- `OCRService.test.ts`: Test each provider, error handling
- `ImageGenerationService.test.ts`: Mock API calls, validate parameters
- `DocumentService.test.ts`: Extend for image content types

### Integration Tests
- End-to-end OCR → Embedding → RAG flow
- Image generation → Storage → Retrieval flow
- Chat integration with images

### E2E Tests
- Upload image → OCR → Search in conversation
- Generate image from chat → Display → Download
- Multi-image project workflows

---

## Alternative Approaches

### Approach 1: External Microservice
**Pros**: Independent scaling, language flexibility (Python for ML)
**Cons**: Added complexity, network latency, deployment overhead

### Approach 2: Queue-Based Processing
**Pros**: Async processing, better for batch operations
**Cons**: More infrastructure (Redis/BullMQ), delayed results

### Approach 3: Client-Side Processing
**Pros**: Offload server, instant feedback
**Cons**: Limited by browser capabilities, security concerns

**Recommendation**: Start with integrated approach (current proposal), migrate to microservice if needed at scale.

---

## Conclusion

The AI Workflow Engine's architecture is **well-positioned** for image generation and OCR integration:

✅ **Service-oriented design** makes adding new capabilities straightforward
✅ **Existing document pipeline** can be extended for images with minimal changes
✅ **RAG system** automatically makes OCR text searchable
✅ **Orchestration system** can intelligently route image requests
✅ **Streaming infrastructure** supports real-time image generation progress
✅ **Type-safe APIs** ensure robust integration

**Recommended Approach**: Implement OCR first (higher immediate value for RAG), then add image generation. Both can share common infrastructure (storage, metadata, API endpoints) for efficient development.

The modular architecture allows these features to be added incrementally without disrupting existing functionality, following the same patterns already established in the codebase.
