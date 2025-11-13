# LlamaIndex RAG Layer Assessment

**Date:** January 2025
**Branch:** `feat/vectordb-setup`
**Application:** AI Workflow Engine

---

## Executive Summary

**Current State:** You already have a **working RAG implementation using ChromaDB** in the `feat/vectordb-setup` branch (see `docs/VECTOR_DATABASE.md`).

**Assessment:** Should you migrate to LlamaIndex.TS?

**Recommendation: ⚠️ KEEP CHROMADB for now - Migration to LlamaIndex not recommended at this stage**

Your existing ChromaDB solution is:
- ✅ **Production-ready** and fully implemented
- ✅ **Well-documented** with complete API reference
- ✅ **Simple architecture** - easy to understand and maintain
- ✅ **Cost-effective** - no additional framework overhead
- ✅ **Working** - embeddings, search, and indexing all functional

**When to reconsider LlamaIndex:**
- 📈 When you need advanced features (hybrid search, re-ranking, query transformations)
- 🔄 When you want to consolidate vector DB + query engine into one framework
- 🎯 When building complex RAG workflows (multi-query, iterative refinement)
- 🏢 When scaling to multiple data sources and index types

**See detailed comparison below** to understand trade-offs.

---

## Your Existing RAG Solution (ChromaDB)

### What's Already Implemented

From the `feat/vectordb-setup` branch:

1. **Complete Service Layer:**
   - `VectorService` - Chroma collection management and search
   - `EmbeddingService` - OpenAI embedding generation
   - `ChunkingService` - Text chunking with overlap (1000 chars, 200 overlap)
   - Enhanced `DocumentService` - Auto-indexing on upload

2. **tRPC API Endpoints:**
   - `search.searchDocuments` - Semantic search with filters
   - `search.getEmbeddingStats` - Index statistics
   - `search.reindexDocument` - Manual reindexing
   - `search.healthCheck` - Service health monitoring

3. **Infrastructure:**
   - ChromaDB running in Docker (port 8000)
   - OpenAI embeddings (`text-embedding-3-small`, 1536 dimensions)
   - Persistent storage in Docker volume
   - Database seeding scripts

4. **Features:**
   - ✅ Automatic indexing on document upload
   - ✅ Semantic search with similarity scoring
   - ✅ Project-isolated collections
   - ✅ Metadata filtering by document IDs
   - ✅ Minimum score thresholds
   - ✅ Health checks and monitoring
   - ✅ Chunk-level search results
   - ✅ Statistics and index status tracking

### Architecture

```
Document Upload → Chunking → OpenAI Embeddings → ChromaDB Storage
                                                        ↓
User Query → OpenAI Embeddings → ChromaDB Search → Ranked Results
```

**Stack:**
- **Vector DB:** ChromaDB (external, Docker container)
- **Embeddings:** OpenAI `text-embedding-3-small`
- **Storage:** Docker volume `chroma_data`
- **API:** Custom tRPC endpoints

---

## Application Context

### Current State

Your AI Workflow Engine is:
- **Production-ready** with 469+ passing tests
- Built on **Next.js 15.5.2** with TypeScript 5.9.2
- Using **PostgreSQL 15** via Prisma ORM
- Integrating with **OpenRouter API** for multi-model AI access
- **RAG fully implemented** with ChromaDB + OpenAI embeddings (in `feat/vectordb-setup`)
- **Database schema** has `Float[]` embedding fields (for future use or alternative implementation)

### RAG Requirements

Based on codebase analysis:

1. **Data Sources to Index:**
   - Documents (text files, markdown, JSON, CSV - currently stored)
   - Conversation history (Messages table)
   - Projects and metadata
   - Future: KnowledgeEntities (schema defined, no service layer yet)

2. **Current Gaps (per TODOs in DocumentService.ts:33, 109, 161):**
   - Generate embeddings for document content
   - Implement vector similarity search (currently hardcoded 0.8 similarity)
   - Regenerate embeddings when content changes

3. **Architectural Needs:**
   - Clean service layer integration (matches existing ServiceFactory pattern)
   - PostgreSQL-based vector storage (avoid external dependencies)
   - TypeScript type safety
   - Support for OpenRouter/OpenAI-compatible embeddings
   - Scalable for production workloads

---

## LlamaIndex.TS Capabilities

### What LlamaIndex Provides

| Feature | Support | Notes |
|---------|---------|-------|
| **TypeScript Native** | ✅ Full | Built specifically for TypeScript/Node.js |
| **PostgreSQL/pgvector** | ✅ Yes | PGVectorStore officially supported |
| **Next.js Compatibility** | ✅ Yes | Supports Node.js 20+, React Server Components |
| **OpenAI Embeddings** | ✅ Yes | Built-in support for OpenAI embedding models |
| **Custom LLM Providers** | ✅ Yes | Can integrate with OpenRouter |
| **Document Processing** | ✅ Yes | Text, Markdown, JSON, CSV, PDF (via loaders) |
| **Chunking Strategies** | ✅ Yes | Multiple strategies (sentence, token, semantic) |
| **Query Engines** | ✅ Yes | Context retrieval, chat engines, streaming |
| **Vector Stores** | ✅ Multiple | 11+ options including pgvector |
| **Production Ready** | ✅ Yes | Active development, TypeScript-first |

### Supported Vector Stores

LlamaIndex.TS supports:
- **PGVectorStore** ⭐ (PostgreSQL + pgvector extension)
- PineconeVectorStore (managed, requires subscription)
- ChromaVectorStore (separate server required)
- QdrantVectorStore (separate server required)
- WeaviateVectorStore (separate server required)
- MilvusVectorStore (separate server required)
- MongoDBAtlasVectorSearch (requires MongoDB Atlas)
- AstraDBVectorStore (requires DataStax Astra)
- SupabaseVectorStore (requires Supabase)
- AzureAISearchVectorStore (requires Azure)
- SimpleVectorStore (in-memory, development only)

**Best fit for your stack:** `PGVectorStore` - uses your existing PostgreSQL database with pgvector extension.

---

## Alignment with Your Architecture

### ✅ Strengths (Why LlamaIndex Fits)

1. **TypeScript-Native Integration**
   - Matches your TypeScript 5.9.2 codebase
   - Type-safe end-to-end (aligns with your tRPC + Zod pattern)
   - Works seamlessly with Next.js 15.5.2

2. **PostgreSQL/pgvector Support**
   - Uses your existing PostgreSQL 15 database
   - No additional infrastructure required
   - PGVectorStore integrates with Prisma's connection
   - Embedding fields already in schema (`Float[]`)

3. **Service Layer Compatibility**
   - Can create `RAGService` following your existing pattern
   - Dependency injection via ServiceFactory
   - Clean separation of concerns

4. **LLM Flexibility**
   - Built-in OpenAI support for embeddings
   - Can configure custom LLM backends (OpenRouter compatible)
   - Supports model fallback (matches your OpenRouterAssistant pattern)

5. **Data Loaders**
   - Handles text, markdown, JSON, CSV (your current formats)
   - PDF loaders available for future expansion
   - Can ingest from your existing Document storage

6. **Production Characteristics**
   - Streaming support (matches your SSE/WebSocket pattern)
   - Context window management
   - Query optimization
   - Active maintenance and TypeScript-first development

### ⚠️ Considerations (Potential Challenges)

1. **Additional Dependencies**
   - Adds `llamaindex` npm package (~large dependency tree)
   - May increase bundle size for Next.js app
   - Consider using in API routes only (not client-side)

2. **pgvector Extension Required**
   - Need to install pgvector extension in PostgreSQL
   - Requires database migration
   - Current Docker setup needs updating

3. **Embedding API Costs**
   - OpenAI embeddings API has per-token pricing
   - Consider OpenRouter for embedding models if available
   - Batch processing recommended for cost efficiency

4. **Schema Management**
   - LlamaIndex creates its own tables in PostgreSQL
   - May need to coordinate with Prisma migrations
   - Consider separate schema namespace for LlamaIndex tables

5. **Learning Curve**
   - Team needs to learn LlamaIndex concepts
   - Different abstraction from your current service patterns
   - May be overkill if needs are simple

6. **Abstraction Layer**
   - LlamaIndex abstracts away vector operations
   - Less control over exact indexing/retrieval logic
   - Trade-off: convenience vs. fine-grained control

---

## Alternative: Lightweight Custom RAG

### Option B: Build Custom RAG Layer

If LlamaIndex feels like too much abstraction, you could implement RAG directly:

**Architecture:**
```typescript
// Simple RAG implementation
class EmbeddingService {
  // Generate embeddings via OpenAI/OpenRouter API
  async generateEmbedding(text: string): Promise<number[]>
}

class VectorSearchService {
  // Perform cosine similarity search using pgvector
  async search(embedding: number[], limit: number): Promise<Document[]>
}

class RAGService {
  // Orchestrate retrieval + context injection
  async retrieveContext(query: string): Promise<string>
}
```

**Pros:**
- ✅ Full control over implementation
- ✅ Minimal dependencies (just OpenAI SDK)
- ✅ Perfect fit with existing service layer
- ✅ Smaller bundle size
- ✅ Easier to understand and maintain

**Cons:**
- ❌ Need to implement chunking strategies
- ❌ Need to build query optimization
- ❌ Need to handle edge cases (LlamaIndex does this)
- ❌ More development time upfront
- ❌ Less community support/examples

**When to choose custom:**
- Your RAG needs are straightforward (simple similarity search)
- Team prefers explicit control over abstractions
- You want to minimize dependencies
- You have time to build and test custom implementation

---

## ChromaDB (Current) vs. LlamaIndex: Detailed Comparison

This is the **most important section** - comparing your existing working solution with LlamaIndex.

### Side-by-Side Comparison

| Aspect | ChromaDB (Current) | LlamaIndex.TS | Winner |
|--------|-------------------|---------------|--------|
| **Implementation Status** | ✅ Fully implemented | ❌ Would need 40-60hrs | 🏆 **ChromaDB** |
| **Architecture Complexity** | Simple, explicit | Framework abstraction | 🏆 **ChromaDB** |
| **Dependencies** | `chromadb` + `openai` | `llamaindex` (large) | 🏆 **ChromaDB** |
| **Bundle Size** | Minimal | Larger | 🏆 **ChromaDB** |
| **Learning Curve** | Low (custom code) | Medium (framework concepts) | 🏆 **ChromaDB** |
| **Control & Flexibility** | Full control | Less control | 🏆 **ChromaDB** |
| **Maintenance** | You own the code | Framework updates | 🏆 **ChromaDB** |
| **Vector Database** | External (Docker) | Can use pgvector (DB-embedded) | 🏆 **LlamaIndex** |
| **Advanced Features** | Basic semantic search | Hybrid search, re-ranking, query transforms | 🏆 **LlamaIndex** |
| **Multi-source Indexing** | Manual implementation | Built-in loaders for APIs, PDFs, etc. | 🏆 **LlamaIndex** |
| **Query Optimization** | Manual | Automated query engine | 🏆 **LlamaIndex** |
| **Community/Examples** | Generic Chroma docs | LlamaIndex-specific examples | 🏆 **LlamaIndex** |
| **Future Scalability** | Good (Chroma scales well) | Excellent (built for complex RAG) | 🏆 **LlamaIndex** |
| **Infrastructure** | Docker + PostgreSQL | PostgreSQL only (with pgvector) | 🏆 **LlamaIndex** |

### Architectural Differences

**Current ChromaDB Architecture:**
```
Your Code → ChromaDB Client → ChromaDB Server (Docker) → Vector Storage
Your Code → OpenAI SDK → Embeddings API → Vectors
```
- **Pros:** Simple, explicit, easy to debug
- **Cons:** Requires separate Chroma service, manual orchestration

**LlamaIndex Architecture:**
```
Your Code → LlamaIndex → PGVectorStore → PostgreSQL (with pgvector)
              ↓
         OpenAI SDK → Embeddings API
              ↓
         Query Engine (auto-optimization)
```
- **Pros:** Unified framework, embedded in PostgreSQL, advanced query features
- **Cons:** Framework lock-in, less control, larger dependency

### Feature Comparison

#### What You Have (ChromaDB)
- ✅ Semantic search
- ✅ Document chunking
- ✅ Embedding generation
- ✅ Project-isolated collections
- ✅ Metadata filtering
- ✅ Health checks
- ✅ Index statistics
- ⚠️ Basic search (no re-ranking)
- ⚠️ Manual query optimization
- ❌ No hybrid search (semantic + keyword)
- ❌ No query transformations
- ❌ No multi-query strategies

#### What LlamaIndex Adds
- ✅ All of the above
- ✅ **Hybrid search** (semantic + BM25 keyword search)
- ✅ **Re-ranking** with cross-encoder models
- ✅ **Query transformations** (multi-query, HyDE, step-back)
- ✅ **Context compression** (reduce token usage)
- ✅ **Query routing** (semantic vs. keyword heuristics)
- ✅ **Data loaders** for PDFs, APIs, databases
- ✅ **Index types** (vector, keyword, knowledge graph)
- ✅ **Chat engines** with memory and context management
- ✅ **Agents** for complex workflows

### Cost Analysis

#### Current ChromaDB Solution
**Infrastructure:**
- ChromaDB Docker container: $0 (self-hosted) or ~$20-50/month (managed)
- PostgreSQL: Already running
- **Total:** ~$0-50/month

**Operational:**
- OpenAI embeddings: $0.02 per 1M tokens
- Same for both approaches

#### LlamaIndex Solution
**Infrastructure:**
- PostgreSQL + pgvector: Already running
- No external vector DB needed
- **Total:** $0/month (saves Chroma hosting)

**Operational:**
- OpenAI embeddings: $0.02 per 1M tokens (same)
- **Benefit:** Reduces infrastructure complexity

**Winner:** 🏆 **LlamaIndex** (eliminates separate vector DB)

### Migration Effort

If you decide to migrate from ChromaDB to LlamaIndex:

**Estimated Effort:** 30-40 hours
1. Install pgvector extension (2-4 hours)
2. Install LlamaIndex.TS (1 hour)
3. Rewrite VectorService using LlamaIndex (8-12 hours)
4. Migrate EmbeddingService to LlamaIndex (4-6 hours)
5. Update ChunkingService integration (4-6 hours)
6. Migrate existing data from Chroma to pgvector (4-6 hours)
7. Update tRPC endpoints (4-6 hours)
8. Testing and optimization (8-12 hours)

**Data Migration:**
- Export embeddings from Chroma
- Re-index documents in LlamaIndex
- Verify search results match

### When to Migrate to LlamaIndex

**Migrate NOW if:**
- ❌ None of these apply (your current solution works!)

**Migrate SOON if:**
- ✅ You need hybrid search (semantic + keyword)
- ✅ You want to eliminate Chroma infrastructure
- ✅ You're building complex RAG workflows
- ✅ You need multi-source indexing (PDFs, APIs, etc.)

**Migrate LATER if:**
- ✅ Current solution meets all needs
- ✅ Team bandwidth is limited
- ✅ Priority is shipping features, not refactoring

### Migration Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Search quality degradation | Low | High | A/B test both systems before migration |
| Data loss during migration | Medium | Critical | Export Chroma data before starting |
| Performance regression | Low | Medium | Benchmark before/after |
| Increased complexity | Medium | Low | Good documentation, team training |
| Framework lock-in | Low | Medium | LlamaIndex abstractions are well-documented |

### Recommendation: Keep ChromaDB for Now

**Why?**

1. **You have a working solution** - Don't fix what isn't broken
2. **Simple architecture** - Easy for team to understand and maintain
3. **Time investment** - 30-40 hours better spent on features
4. **No critical gaps** - Your current implementation meets core requirements
5. **Low risk** - No migration risk, no framework lock-in risk

**When to Reconsider:**

- When you need **hybrid search** (semantic + keyword)
- When you want to **eliminate Chroma infrastructure** (cost/complexity)
- When building **advanced RAG** (re-ranking, query transforms, multi-query)
- When scaling to **multiple index types** or **complex workflows**
- When you have **dedicated time** for the migration (not in crunch mode)

---

## LlamaIndex vs. LangChain

Since you're evaluating frameworks, here's a quick comparison:

| Aspect | LlamaIndex | LangChain |
|--------|-----------|-----------|
| **Primary Focus** | Data retrieval & RAG | General LLM orchestration |
| **RAG Performance** | ⭐⭐⭐⭐⭐ Optimized | ⭐⭐⭐⭐ Good |
| **Data Indexing** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Good |
| **Query Optimization** | Built-in algorithms | Manual configuration |
| **TypeScript Support** | ⭐⭐⭐⭐⭐ First-class | ⭐⭐⭐⭐ Good |
| **Learning Curve** | ⭐⭐⭐ Moderate | ⭐⭐ Steep |
| **Use Case Fit** | Document search & RAG | Complex workflows & agents |
| **Bundle Size** | Smaller | Larger |

**Recommendation:** For pure RAG use cases like yours, **LlamaIndex is the better choice**. LangChain is more suitable if you need complex agent workflows, tool chaining, or extensive external integrations.

---

## Implementation Plan (If Proceeding with LlamaIndex)

### Phase 1: Infrastructure Setup

1. **Install pgvector extension**
   ```bash
   # Update docker-compose.yml to use pgvector image
   # Run migration to enable extension
   CREATE EXTENSION vector;
   ```

2. **Install dependencies**
   ```bash
   npm install llamaindex
   npm install @llamaindex/pgvector  # If separate package
   ```

3. **Configure environment variables**
   ```bash
   OPENAI_API_KEY=sk-...  # For embeddings
   # Or use OPENROUTER_API_KEY if OpenRouter supports embeddings
   ```

### Phase 2: Service Layer Integration

4. **Create RAG services**
   - `src/server/services/rag/EmbeddingService.ts` - Generate embeddings
   - `src/server/services/rag/IndexingService.ts` - Index documents
   - `src/server/services/rag/RetrievalService.ts` - Query and retrieve context
   - `src/server/services/rag/RAGService.ts` - Orchestration layer

5. **Update ServiceFactory**
   ```typescript
   // Add RAG services to dependency injection
   private ragService: RAGService;
   ```

6. **Update DocumentService**
   - Replace TODOs with LlamaIndex integration
   - Generate embeddings on document upload
   - Regenerate on content updates
   - Implement vector similarity search

### Phase 3: Chat Integration

7. **Modify ChatService/OpenRouterAssistant**
   - Inject retrieved context into system prompts
   - Add metadata about sources used
   - Implement context ranking/filtering

8. **Add tRPC routes**
   - `semanticSearch` - Expose vector search to frontend
   - `ragQuery` - RAG-enabled chat endpoint

### Phase 4: Testing & Optimization

9. **Write tests**
   - Unit tests for each RAG service
   - Integration tests for end-to-end RAG flow
   - Performance benchmarks for vector search

10. **Optimize**
    - Tune chunk sizes and overlap
    - Configure HNSW index parameters for pgvector
    - Implement batch embedding generation
    - Add caching for frequent queries

### Estimated Effort

- **Phase 1:** 4-8 hours (infrastructure)
- **Phase 2:** 16-24 hours (service layer)
- **Phase 3:** 8-12 hours (chat integration)
- **Phase 4:** 12-16 hours (testing & optimization)

**Total:** 40-60 hours of development

---

## Cost Considerations

### Embedding Generation Costs (OpenAI)

Using OpenAI's `text-embedding-3-small` model:
- **Price:** $0.02 per 1M tokens
- **Example:** 1,000 documents × 500 tokens avg = 500K tokens = $0.01
- **Ongoing:** Only new/updated documents need embedding

### Infrastructure Costs

- **PostgreSQL + pgvector:** $0 (already running)
- **Compute:** Minimal additional overhead
- **Storage:** Vector data adds ~4KB per 1K-dimension embedding

### Alternative: OpenRouter Embeddings

Check if OpenRouter offers embedding models (lower cost):
- May support Voyage AI, Cohere, or other embedding providers
- Could reduce costs vs. direct OpenAI usage

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LlamaIndex breaking changes | Low | Medium | Pin versions, test before upgrades |
| pgvector performance issues | Low | High | Proper indexing (HNSW), query optimization |
| Embedding API costs escalate | Medium | Medium | Batch processing, caching, usage monitoring |
| Schema conflicts with Prisma | Low | Medium | Use separate schema namespace |
| Vendor lock-in to LlamaIndex | Low | Low | Well-documented abstractions, can migrate |
| Team learning curve | Medium | Low | Good documentation, active community |

---

## Decision Matrix

### Stay with ChromaDB if:
- ✅ **Current solution meets your needs** (semantic search working)
- ✅ **Simple architecture is preferred** (easy to understand/maintain)
- ✅ **Team bandwidth is limited** (avoid 30-40hr migration)
- ✅ **Low risk tolerance** (don't want migration risks)
- ✅ **Shipping features is priority** (not refactoring)
- ✅ **Advanced RAG not needed** (basic search is sufficient)

👉 **This is your current situation - RECOMMENDED**

### Migrate to LlamaIndex if:
- ✅ You need **hybrid search** (semantic + keyword combined)
- ✅ You want to **eliminate Chroma infrastructure** (reduce complexity)
- ✅ You need **advanced RAG features** (re-ranking, query transforms)
- ✅ You're scaling to **multiple data sources** (PDFs, APIs, etc.)
- ✅ Team has **bandwidth for migration** (30-40 hours available)
- ✅ You want **framework support** for complex RAG workflows

### Choose Custom Implementation if:
- ✅ Your RAG needs are even simpler than current
- ✅ You want to eliminate both Chroma AND LlamaIndex
- ✅ You prefer lightweight pgvector-only solution
- ✅ You have time to build from scratch

### Choose LangChain if:
- ✅ You need complex agent workflows (not just RAG)
- ✅ You're building multi-tool orchestration systems
- ✅ Your use cases extend beyond document retrieval

---

## Final Recommendation

**🏆 Keep Your ChromaDB Solution for Now**

**Why NOT migrate to LlamaIndex at this stage:**

1. **You Have a Working Solution**
   - RAG is fully implemented and functional
   - 469+ tests passing, production-ready
   - Well-documented in `VECTOR_DATABASE.md`

2. **Simple > Complex**
   - Current architecture is easy to understand
   - No framework abstractions to learn
   - Full control over implementation

3. **Time Investment**
   - Migration would take 30-40 hours
   - Better spent shipping features
   - No critical gaps requiring migration

4. **Low Risk**
   - No migration risk (data loss, quality degradation)
   - No framework lock-in risk
   - No breaking changes from framework updates

5. **Cost Effective**
   - ChromaDB works well for your scale
   - Minimal infrastructure cost
   - No learning curve for team

**When to Reconsider LlamaIndex:**

Consider migrating when **2 or more** of these apply:

- ✅ Need **hybrid search** (semantic + BM25 keyword)
- ✅ Want **infrastructure simplification** (eliminate Chroma Docker container)
- ✅ Building **advanced RAG** (re-ranking, multi-query, query transforms)
- ✅ Scaling to **multiple index types** or **complex workflows**
- ✅ Have **dedicated migration time** (not in feature crunch)
- ✅ Team wants **framework benefits** (loaders, query engine, agents)

**Alternative: Enhance Current Solution**

Instead of migrating, consider adding features to your ChromaDB implementation:
- Implement hybrid search (semantic + PostgreSQL full-text search)
- Add re-ranking with cross-encoder models
- Implement query expansion/transformation
- Add PDF/Word document loaders
- Build custom query optimization

This gives you advanced features without migration overhead.

---

## Next Steps

### Immediate Actions (Now)

1. **✅ Merge `feat/vectordb-setup` to main**
   - Your RAG solution is production-ready
   - Continue building features on top of ChromaDB

2. **📊 Monitor Usage Patterns**
   - Track search quality and user satisfaction
   - Identify gaps that might require advanced RAG
   - Measure Chroma infrastructure costs

3. **📚 Document Migration Path** (for future reference)
   - Keep this assessment as reference
   - Document LlamaIndex as potential upgrade path
   - Revisit when needs evolve

### Future Evaluation (3-6 Months)

4. **🔄 Reassess Migration Need**
   - Review if advanced features are needed
   - Evaluate team bandwidth for migration
   - Check if LlamaIndex.TS has matured further

5. **🧪 Prototype Advanced Features**
   - If considering migration, build side-by-side proof-of-concept
   - A/B test search quality ChromaDB vs. LlamaIndex
   - Benchmark performance before committing

6. **📈 Scale Current Solution**
   - Optimize Chroma performance as data grows
   - Consider managed Chroma if self-hosting becomes burden
   - Implement caching and query optimization

---

## References

### Your Current Implementation
- **Vector Database Docs:** `docs/VECTOR_DATABASE.md` (comprehensive guide)
- **VectorService:** `src/server/services/vector/VectorService.ts`
- **EmbeddingService:** `src/server/services/vector/EmbeddingService.ts`
- **ChunkingService:** `src/server/services/vector/ChunkingService.ts`
- **Search Router:** tRPC `search.*` endpoints

### LlamaIndex Resources (for future reference)
- **LlamaIndex.TS Docs:** https://ts.llamaindex.ai/
- **PGVectorStore Integration:** https://neon.tech/docs/ai/llamaindex
- **TypeScript Examples:** https://github.com/run-llama/LlamaIndexTS
- **Neon Starter Apps:** Next.js + LlamaIndex examples

### Comparison Resources
- **ChromaDB Docs:** https://docs.trychroma.com/
- **OpenAI Embeddings:** https://platform.openai.com/docs/guides/embeddings
- **Vector DB Benchmarks:** https://benchmark.vectorview.ai/
- **RAG Best Practices:** https://www.anthropic.com/index/retrieval-augmented-generation-best-practices

---

**Assessment Completed By:** Claude (AI Workflow Engine Analysis)
**Branch:** `feat/vectordb-setup`
**Assessment Date:** January 2025
