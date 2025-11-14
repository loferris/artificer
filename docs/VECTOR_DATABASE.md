# Vector Database & Semantic Search

This system uses **Chroma** for vector storage and **OpenAI** for embedding generation to enable semantic search across project documents.

## Architecture

```
Document Upload → Text Extraction → Chunking → Embedding Generation → Chroma Storage
                                                                              ↓
User Query → Embedding Generation → Semantic Search ← Chroma Vector DB
```

### Components

1. **ChunkingService**: Splits documents into overlapping chunks (1000 chars, 200 char overlap)
2. **EmbeddingService**: Generates embeddings using OpenAI `text-embedding-3-small`
3. **VectorService**: Manages Chroma collections and semantic search
4. **DocumentService**: Automatically generates embeddings on document upload

## Quick Start

### 1. Start Chroma Database

```bash
# Start Chroma with docker-compose
docker-compose up -d chroma

# Verify Chroma is running
curl http://localhost:8000/api/v1/heartbeat
```

### 2. Configure Environment

Add to your `.env` file:

```bash
# Chroma vector database
CHROMA_URL=http://localhost:8000

# OpenAI for embeddings
OPENAI_API_KEY=sk-your-openai-api-key

# Optional: Customize embedding model
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

### 3. Upload Documents

Documents uploaded via the projects interface are automatically:
1. Stored in PostgreSQL (metadata + text content)
2. Chunked into semantic segments
3. Embedded using OpenAI
4. Stored in Chroma for semantic search

### 4. Search Documents

Use the search API to find relevant document chunks:

```typescript
// TypeScript/React example
const { data } = trpc.search.searchDocuments.useMutation();

const results = await data({
  projectId: 'project-123',
  query: 'How do I configure authentication?',
  limit: 10,
  minScore: 0.7,
});
```

```bash
# cURL example
curl -X POST http://localhost:3000/api/trpc/search.searchDocuments \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-123",
    "query": "authentication configuration",
    "limit": 10
  }'
```

## API Reference

### Search Documents

**Endpoint**: `trpc.search.searchDocuments`

**Input**:
```typescript
{
  projectId: string;        // Project to search within
  query: string;            // Search query (1-1000 chars)
  limit?: number;           // Max results (1-50, default: 10)
  minScore?: number;        // Minimum similarity (0-1, optional)
  documentIds?: string[];   // Filter by specific documents (optional)
}
```

**Output**:
```typescript
{
  query: string;
  results: Array<{
    id: string;              // Chunk ID
    documentId: string;      // Parent document ID
    projectId: string;       // Project ID
    content: string;         // Chunk text content
    filename: string;        // Original filename
    score: number;           // Similarity score (0-1)
    metadata: {
      chunkIndex: number;
      totalChunks: number;
      startChar: number;
      endChar: number;
    };
  }>;
  count: number;
}
```

### Get Embedding Stats

**Endpoint**: `trpc.search.getEmbeddingStats`

Returns statistics about indexed documents in a project.

**Input**:
```typescript
{
  projectId: string;
}
```

**Output**:
```typescript
{
  totalChunks: number;              // Total chunks stored
  totalDocuments: number;           // Total documents in project
  indexedDocuments: number;         // Documents with embeddings
  unindexedDocuments: number;       // Documents without embeddings
  indexedFiles: Array<{
    id: string;
    filename: string;
    size: number;
    uploadedAt: Date;
  }>;
  unindexedFiles: Array<{...}>;
}
```

### Reindex Document

**Endpoint**: `trpc.search.reindexDocument`

Manually regenerate embeddings for a document.

**Input**:
```typescript
{
  documentId: string;
}
```

**Output**:
```typescript
{
  documentId: string;
  filename: string;
  chunksCreated: number;
}
```

### Health Check

**Endpoint**: `trpc.search.healthCheck`

Check if vector services are operational.

**Output**:
```typescript
{
  chroma: boolean;        // Chroma DB accessible
  embeddings: boolean;    // OpenAI API accessible
  overall: boolean;       // Both services healthy
}
```

## Configuration

### Chunking Parameters

Modify in `ChunkingService.ts`:

```typescript
const chunkingService = new ChunkingService({
  chunkSize: 1000,        // Characters per chunk
  chunkOverlap: 200,      // Overlap between chunks
  separators: ['\n\n', '\n', '. ', ' '],  // Break points
});
```

**Recommended settings by document type:**

| Document Type | Chunk Size | Overlap | Separators |
|---------------|------------|---------|------------|
| Technical docs | 1000 | 200 | `['\n\n', '\n', '. ']` |
| Code | 500 | 100 | `['\n\n', '\n', ';', '{']` |
| Prose/articles | 1500 | 300 | `['\n\n', '. ', ' ']` |
| Chat logs | 800 | 150 | `['\n\n', '\n']` |

### Embedding Model Options

| Model | Dimensions | Cost/1M tokens | Max tokens |
|-------|------------|----------------|------------|
| `text-embedding-3-small` | 1536 | $0.02 | 8191 |
| `text-embedding-3-large` | 3072 | $0.13 | 8191 |
| `text-embedding-ada-002` | 1536 | $0.10 | 8191 |

**Recommendation**: Use `text-embedding-3-small` for best cost/performance ratio.

### Chroma Collections

- One collection per project: `ai_workflow_project_{projectId}`
- Collections are created automatically on first document upload
- Persistent storage in Docker volume: `chroma_data`

## Performance & Costs

### Embedding Generation

**Example costs for document processing:**

| Document Size | Chunks | Tokens | Embedding Cost |
|---------------|--------|--------|----------------|
| 10 KB (10k chars) | ~10 | ~2,500 | $0.00005 |
| 100 KB | ~100 | ~25,000 | $0.0005 |
| 1 MB | ~1,000 | ~250,000 | $0.005 |
| 10 MB | ~10,000 | ~2,500,000 | $0.05 |

### Search Performance

- **Query latency**: 50-200ms (depends on collection size)
- **Chroma scales to**: Millions of vectors on single server
- **Memory usage**: ~1.5KB per vector (1536 dimensions)

### Optimization Tips

1. **Batch uploads**: Upload multiple documents together
2. **Async processing**: Embeddings generate in background
3. **Index monitoring**: Use `getEmbeddingStats` to track indexing
4. **Chunk size tuning**: Smaller chunks = better precision, more cost
5. **Reindex selectively**: Only reindex changed documents

## Troubleshooting

### Chroma not accessible

```bash
# Check if Chroma is running
docker ps | grep chroma

# View Chroma logs
docker logs chatapp-chroma

# Restart Chroma
docker-compose restart chroma
```

### OpenAI API errors

**Rate limiting (429)**:
- EmbeddingService automatically retries with exponential backoff
- Reduce `batchSize` in EmbeddingService config

**Authentication errors (401)**:
- Verify `OPENAI_API_KEY` in `.env`
- Check API key has not expired

**Quota exceeded (429)**:
- Upgrade OpenAI plan
- Switch to different embedding provider (Vertex AI, Cohere)

### Document not indexed

```typescript
// Check embedding stats
const stats = await trpc.search.getEmbeddingStats.query({
  projectId: 'your-project-id'
});

console.log('Unindexed:', stats.unindexedFiles);

// Manually reindex a document
await trpc.search.reindexDocument.mutate({
  documentId: 'doc-id'
});
```

### Poor search results

1. **Check similarity scores**: If all scores < 0.5, query may be off-topic
2. **Try different queries**: Rephrase to match document language
3. **Adjust minScore**: Lower threshold to see more results
4. **Review chunks**: Use `getEmbeddingStats` to verify document indexing

## Future Enhancements

### Planned Features

- [ ] **Reranking**: Use cross-encoder for result reranking
- [ ] **Hybrid search**: Combine semantic + keyword search
- [ ] **Metadata filtering**: Filter by file type, date, tags
- [ ] **Multi-query**: Generate multiple query variations
- [ ] **Context window**: Return surrounding chunks for better context
- [ ] **Vertex AI support**: Alternative embedding provider
- [ ] **Auto-chunking by content**: Intelligent chunk boundaries (headings, paragraphs)

### Alternative Embedding Providers

The `EmbeddingService` can be extended to support:

- **Vertex AI** (Google Cloud): Better integration with GCS
- **Cohere**: Multilingual embeddings
- **Anthropic**: (When Claude embeddings available)
- **Self-hosted**: Sentence-Transformers, BAAI/bge models

## Integration with LibreChat / Open WebUI

Both frontends have built-in RAG support:

### LibreChat Configuration

```yaml
# librechat.yaml
ragApi:
  url: http://localhost:3000/api/trpc/search.searchDocuments
  apiKey: your-api-key  # Add auth to your endpoint
```

### Open WebUI Configuration

```python
# Configure in Open WebUI settings
RAG_EMBEDDING_ENGINE = "openai"
RAG_EMBEDDING_MODEL = "text-embedding-3-small"
CHROMA_HTTP_HOST = "localhost"
CHROMA_HTTP_PORT = 8000
```

## Security Considerations

1. **API Key Protection**: Never commit OpenAI keys to git
2. **Rate Limiting**: Apply rate limits to search endpoints
3. **Authentication**: Add auth before exposing search API publicly
4. **Input Validation**: Search queries are validated (1-1000 chars)
5. **Project Isolation**: Collections are per-project (no cross-project leakage)

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3000/api/trpc/search.healthCheck
```

### Key Metrics to Monitor

- **Embedding queue size**: Pending documents to index
- **Search latency**: P50, P95, P99 response times
- **OpenAI costs**: Track token usage and costs
- **Chroma disk usage**: Monitor `chroma_data` volume size
- **Index freshness**: Documents uploaded vs indexed

## Resources

- [Chroma Documentation](https://docs.trychroma.com/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Vector Database Comparison](https://benchmark.vectorview.ai/)
- [RAG Best Practices](https://www.anthropic.com/index/retrieval-augmented-generation-best-practices)
