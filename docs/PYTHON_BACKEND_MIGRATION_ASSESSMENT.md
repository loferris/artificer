# Standalone Server to Python Migration Assessment

**Date:** January 2025
**Branch:** `feat/vectordb-setup`
**Application:** AI Workflow Engine

---

## Executive Summary

**Current State:** You have a standalone TypeScript tRPC server (`standalone.ts`) that runs independently of Next.js on port 3001.

**Assessment:** Should you rewrite it in Python?

**Recommendation: ⚠️ EVALUATE CAREFULLY - High effort, questionable ROI**

**Migration Complexity:** Very High
- **Estimated Effort:** 200-300 hours
- **Risk Level:** High
- **Lines of Code to Rewrite:** ~4,500+ lines

**Key Insight:** The standalone server shares **all business logic** with the Next.js app. Rewriting to Python means maintaining two completely separate codebases with duplicate logic.

---

## Current Standalone Server Analysis

### What the Standalone Server Does

From `src/server/standalone.ts` (209 lines):

1. **tRPC Server** on port 3001
   - Exposes same `appRouter` as Next.js app
   - Shares all business logic and services
   - Type-safe API for TypeScript clients

2. **OpenAPI/REST Support**
   - `/openapi.json` - OpenAPI 3.0 specification
   - `/docs` - Swagger UI interface
   - REST endpoint generation from tRPC

3. **Standalone Features**
   - **CORS enabled** for cross-origin requests
   - **Demo mode** (in-memory, no database)
   - **Database mode** (PostgreSQL via Prisma)
   - **Health check** at `/health`
   - **Graceful shutdown** (SIGTERM/SIGINT)

4. **Purpose** (per file comment):
   > "Can be used as an orchestration layer for external applications (e.g., Python backends)"

### Shared Components

The standalone server **shares 100%** of its business logic with Next.js:

#### 1. tRPC Routers (10 files)
- `chat` - Chat/streaming endpoints
- `conversations` - Conversation CRUD
- `messages` - Message CRUD
- `usage` - Token usage tracking
- `export` - Data export functionality
- `subscriptions` - Real-time subscriptions
- `projects` - Project management
- `monitoring` - Model usage monitoring
- `auth` - API key authentication
- `search` - Vector/semantic search (RAG)

#### 2. Service Layer (21 files, ~4,459 lines)
- **ChatService** - LLM chat orchestration
- **ConversationService** - Conversation management
- **MessageService** - Message handling
- **ProjectService** - Project CRUD
- **DocumentService** - Document upload/storage
- **VectorService** - ChromaDB integration
- **EmbeddingService** - OpenAI embeddings
- **ChunkingService** - Text chunking for RAG
- **ApiKeyService** - API key auth
- **OpenRouterAssistant** - Multi-model LLM integration
- **ServiceFactory** - Dependency injection

#### 3. Database Layer
- **Prisma ORM** - PostgreSQL integration
- **Schema** - Users, Conversations, Messages, Projects, Documents, KnowledgeEntities
- **Migrations** - Database version control

#### 4. External Integrations
- **OpenRouter API** - Multi-model LLM access (Claude, GPT-4, DeepSeek, Qwen)
- **OpenAI API** - Embeddings generation
- **ChromaDB** - Vector database

### Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│            Next.js App (Port 3000)                      │
│  ┌──────────────┐         ┌─────────────────────────┐  │
│  │  Frontend    │────────▶│  tRPC Routers (10)      │  │
│  │  (React SPA) │         └─────────────────────────┘  │
│  └──────────────┘                    │                  │
└──────────────────────────────────────┼──────────────────┘
                                       │
                  ┌────────────────────┴────────────────┐
                  │    Shared Business Logic            │
                  │  - Service Layer (21 files)         │
                  │  - Prisma ORM                       │
                  │  - External API integrations        │
                  └────────────────────┬────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────┐
│     Standalone Server (Port 3001)    │                  │
│  - Same tRPC routers                 │                  │
│  - Same services                     │                  │
│  - OpenAPI/REST support              │                  │
│  - CORS enabled                      │                  │
└─────────────────────────────────────────────────────────┘
```

**Key Point:** Both servers use identical code. **Zero duplication currently.**

---

## Migration Target: Python Backend

### Python Framework Options

#### Option A: FastAPI (Recommended)

**What is FastAPI?**
- Modern, high-performance Python web framework
- Async/await support (similar to Node.js)
- Automatic OpenAPI generation
- Pydantic for validation (similar to Zod)
- Type hints for auto-completion

**Stats:**
- ~75k GitHub stars
- Very active development
- Excellent documentation
- Production-ready

**Key Features:**
- Automatic API documentation (Swagger UI)
- Type-based validation
- Async database support (asyncpg, SQLAlchemy async)
- WebSocket support
- Dependency injection
- High performance (~10-20k req/s)

**Best for:** REST APIs with automatic OpenAPI docs

#### Option B: Flask

**What is Flask?**
- Lightweight, flexible Python framework
- Synchronous by default
- Minimal, unopinionated
- Large ecosystem of extensions

**Stats:**
- ~67k GitHub stars
- Mature and stable
- Huge community

**Key Features:**
- Simple, easy to learn
- Flexible (no opinions on structure)
- Many plugins available
- Good for small-medium apps

**Best for:** Simple REST APIs, legacy projects

#### Option C: Django + DRF

**What is Django?**
- Full-featured web framework
- Batteries-included philosophy
- Built-in admin panel, ORM, auth

**Django REST Framework (DRF):**
- REST API toolkit for Django
- Serializers, viewsets, authentication
- Browsable API

**Stats:**
- Django: ~78k stars
- DRF: ~28k stars
- Very mature

**Key Features:**
- ORM included (no Prisma needed)
- Admin panel
- Built-in authentication
- Large ecosystem

**Best for:** Full web applications, when you need admin panel

### Recommendation: FastAPI

For your use case, **FastAPI** is the best choice:
- ✅ Similar to TypeScript async/await patterns
- ✅ Automatic OpenAPI generation (matches current standalone)
- ✅ Type hints (closest to TypeScript's type safety)
- ✅ High performance (async)
- ✅ Modern, active development
- ✅ Good for AI/ML integrations (popular in Python ML ecosystem)

---

## What Needs to be Rewritten

### 1. API Layer (10 routers → FastAPI routes)

**Current:** tRPC routers with type-safe procedures

**Python:** FastAPI route functions

**Example Conversion:**

**TypeScript (tRPC):**
```typescript
// src/server/routers/chat.ts
export const chatRouter = router({
  sendMessage: publicProcedure
    .input(z.object({
      conversationId: z.string(),
      content: z.string(),
      model: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const chatService = new ChatService(ctx.db, ctx.user.id);
      return await chatService.sendMessage(input);
    }),
});
```

**Python (FastAPI):**
```python
# app/routers/chat.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services.chat import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])

class SendMessageRequest(BaseModel):
    conversation_id: str
    content: str
    model: str | None = None

@router.post("/send-message")
async def send_message(
    request: SendMessageRequest,
    chat_service: ChatService = Depends(get_chat_service)
):
    return await chat_service.send_message(request)
```

**Effort per router:** 8-12 hours
**Total for 10 routers:** 80-120 hours

### 2. Service Layer (21 services)

**Current:** TypeScript classes with async/await

**Python:** Python classes with async/await

**Example Conversion:**

**TypeScript:**
```typescript
// src/server/services/chat/ChatService.ts
export class ChatService {
  constructor(
    private db: PrismaClient | null,
    private userId: string
  ) {}

  async sendMessage(input: SendMessageInput): Promise<Message> {
    const conversation = await this.db.conversation.findUnique({
      where: { id: input.conversationId }
    });

    // ... business logic

    return message;
  }
}
```

**Python:**
```python
# app/services/chat.py
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Conversation, Message

class ChatService:
    def __init__(self, db: AsyncSession, user_id: str):
        self.db = db
        self.user_id = user_id

    async def send_message(self, input_data: SendMessageInput) -> Message:
        stmt = select(Conversation).where(Conversation.id == input_data.conversation_id)
        result = await self.db.execute(stmt)
        conversation = result.scalar_one()

        # ... business logic

        return message
```

**Complexity:**
- **ChatService** - Very complex (LLM streaming, context management) → 20-30 hours
- **VectorService** - Complex (ChromaDB integration) → 15-20 hours
- **EmbeddingService** - Moderate (OpenAI API) → 8-12 hours
- **DocumentService** - Moderate (file handling) → 10-15 hours
- Simple CRUD services (Conversation, Message, Project) → 5-8 hours each

**Total for 21 services:** 120-180 hours

### 3. Database Layer

**Current:** Prisma ORM with TypeScript

**Python:** SQLAlchemy 2.0 (async)

**Conversion needed:**

1. **Prisma Schema → SQLAlchemy Models** (20-30 hours)
   - 8 models (User, Conversation, Message, Project, Document, KnowledgeEntity, ApiKey, Usage)
   - Relationships (foreign keys, one-to-many, many-to-many)
   - Indexes and constraints

2. **Prisma Migrations → Alembic Migrations** (10-15 hours)
   - Convert existing migrations
   - Set up Alembic configuration
   - Test migration paths

3. **Query Conversion** (20-30 hours)
   - Prisma queries → SQLAlchemy Core/ORM queries
   - Transaction handling
   - Connection pooling

**Total:** 50-75 hours

### 4. External API Integrations

**Current:** TypeScript SDKs

**Python:** Python SDKs

#### OpenRouter API (ChatService)
- **Current:** Custom HTTP client with fetch
- **Python:** `httpx` or `requests` (async)
- **Effort:** 10-15 hours (streaming support is tricky)

#### OpenAI Embeddings (EmbeddingService)
- **Current:** `openai` TypeScript SDK
- **Python:** `openai` Python SDK (very similar!)
- **Effort:** 5-8 hours (easiest migration)

#### ChromaDB (VectorService)
- **Current:** `chromadb` TypeScript client
- **Python:** `chromadb` Python client (native!)
- **Effort:** 5-8 hours (Python is native for ChromaDB)

**Total:** 20-30 hours

### 5. Validation & Type Safety

**Current:** Zod schemas for validation

**Python:** Pydantic models

**Example:**

**TypeScript (Zod):**
```typescript
const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  model: z.string().optional(),
});
```

**Python (Pydantic):**
```python
from pydantic import BaseModel, Field, UUID4
from typing import Optional

class SendMessageSchema(BaseModel):
    conversation_id: UUID4
    content: str = Field(min_length=1, max_length=10000)
    model: Optional[str] = None
```

**Effort:** 15-25 hours (convert all Zod schemas)

### 6. Authentication & Middleware

**Current:** API key authentication via tRPC context

**Python:** FastAPI dependencies and middleware

**Effort:** 10-15 hours

### 7. Testing

**Current:** 469+ tests with Vitest

**Python:** Pytest

**Conversion:**
- Unit tests for all services → 30-40 hours
- Integration tests → 20-30 hours
- E2E tests → 10-15 hours

**Total:** 60-85 hours

### 8. Deployment & Infrastructure

**Current:**
- Docker with Node.js
- Railway deployment
- Environment variables

**Python:**
- Docker with Python 3.11+
- Railway deployment (similar)
- Environment variables (same)

**Effort:** 10-15 hours (Dockerfile, docker-compose updates)

---

## Total Migration Effort

### By Component

| Component | Effort (hours) | Complexity |
|-----------|----------------|------------|
| API Layer (10 routers) | 80-120 | Medium |
| Service Layer (21 services) | 120-180 | High |
| Database Layer (Prisma → SQLAlchemy) | 50-75 | High |
| External APIs | 20-30 | Medium |
| Validation (Zod → Pydantic) | 15-25 | Low-Medium |
| Auth & Middleware | 10-15 | Medium |
| Testing | 60-85 | High |
| Deployment | 10-15 | Low |
| **Total** | **365-545 hours** | **Very High** |

### Conservative Estimate with Buffer

**Realistic Total:** **400-600 hours** (10-15 weeks full-time, or 20-30 weeks part-time)

This accounts for:
- Learning Python async patterns
- Debugging integration issues
- Handling edge cases
- Documentation
- Code review and refactoring

---

## Pros and Cons

### Stay with TypeScript Standalone

#### Pros ✅
- **Zero migration effort** - Already works
- **Code sharing** - 100% shared with Next.js app
- **Type safety** - End-to-end TypeScript types
- **tRPC** - Type-safe API for TypeScript clients
- **Single language** - Team only needs TypeScript
- **Proven** - Already production-ready
- **Testing** - 469+ tests already written
- **Fast iteration** - Changes apply to both servers

#### Cons ❌
- **Node.js runtime** - Python ML libraries not available
- **TypeScript for Python devs** - External Python apps need REST/OpenAPI (but you have this!)
- **Not native for ML** - Python ecosystem is richer for AI/ML

---

### Migrate to Python (FastAPI)

#### Pros ✅
- **Python ecosystem** - Access to Python ML libraries (scikit-learn, transformers, etc.)
- **Native ChromaDB** - ChromaDB is Python-native
- **Data science stack** - NumPy, Pandas, Jupyter integration
- **ML frameworks** - PyTorch, TensorFlow, Hugging Face
- **Python developers** - Easier to hire Python devs for ML work
- **Orchestration** - Better fit if you're building Python-heavy ML pipelines

#### Cons ❌
- **400-600 hours migration** - Massive time investment
- **Code duplication** - Need to maintain two codebases
- **Lost type safety** - No TypeScript end-to-end types
- **Lost tRPC** - Need REST API (but you have OpenAPI)
- **Testing overhead** - Rewrite all 469+ tests
- **Two languages** - Team needs TypeScript AND Python
- **Drift risk** - TypeScript and Python versions may diverge
- **Slower frontend changes** - Can't share types with frontend

---

## Alternative Architectures

Instead of full migration, consider these hybrid approaches:

### Option A: Python Microservices (Recommended)

**Architecture:**
```
TypeScript Backend (Current)
       │
       ├─→ Chat/CRUD/Projects (TypeScript)
       │
       └─→ Python Microservice (NEW)
           - ML model serving
           - Custom embeddings
           - Advanced RAG (LangChain)
           - Data processing
```

**Implementation:**
1. Keep TypeScript standalone server
2. Create **small Python service** for ML-specific tasks
3. TypeScript calls Python via HTTP REST
4. Python handles only ML/data science work

**Effort:** 40-60 hours (1 focused microservice)

**Benefits:**
- ✅ Best of both worlds
- ✅ Use Python only where needed
- ✅ Keep existing codebase
- ✅ Small scope, low risk
- ✅ Can iterate independently

**Example Use Cases:**
- Custom embedding models (BERT, Sentence-Transformers)
- Advanced RAG with LangChain
- ML model inference
- Data preprocessing pipelines

### Option B: Python Functions (Serverless)

**Architecture:**
```
TypeScript Backend
       │
       └─→ Call Python serverless functions
           - Vercel Functions (Python)
           - AWS Lambda (Python)
           - Google Cloud Functions
```

**Effort:** 20-30 hours

**Benefits:**
- ✅ No infrastructure to manage
- ✅ Pay-per-use
- ✅ Auto-scaling
- ✅ Simple integration

**Limitations:**
- ❌ Cold starts
- ❌ Limited execution time
- ❌ Not suitable for long-running tasks

### Option C: Jupyter Notebooks + API

**Architecture:**
```
TypeScript Backend
       │
       └─→ Jupyter Notebook Server
           - Data analysis
           - Model experimentation
           - Generate insights
```

**Effort:** 10-20 hours

**Benefits:**
- ✅ Interactive development
- ✅ Perfect for exploratory work
- ✅ Can expose via REST API (papermill, voila)

### Option D: Keep Current + Use Python Client Libraries

**Architecture:**
```
TypeScript Standalone Server
       │
       └─→ OpenAPI REST endpoints
           ↓
     Python Client Code
     - Use requests/httpx
     - Type stubs from OpenAPI
```

**Effort:** 5-10 hours (generate Python client from OpenAPI)

**Benefits:**
- ✅ **Zero migration effort**
- ✅ Python apps can call your API
- ✅ Auto-generated client from OpenAPI spec
- ✅ Best for orchestration use case

**This is your current state!** You already have:
- ✅ `/openapi.json` - OpenAPI 3.0 spec
- ✅ `/docs` - Swagger UI
- ✅ CORS enabled
- ✅ REST endpoints

**Example Python Client:**
```python
# Auto-generate from OpenAPI
import httpx

class AIWorkflowClient:
    def __init__(self, base_url="http://localhost:3001"):
        self.client = httpx.AsyncClient(base_url=base_url)

    async def send_message(self, conversation_id: str, content: str):
        response = await self.client.post(
            "/chat.sendMessage",
            json={"conversationId": conversation_id, "content": content}
        )
        return response.json()
```

**Tools to auto-generate clients:**
- `openapi-python-client` - Generate async Python client
- `openapi-generator` - Generate client in any language

---

## Cost-Benefit Analysis

### Current State (TypeScript Standalone)

**Costs:**
- ❌ Node.js runtime (but async/await is great!)
- ❌ Python devs need to learn TypeScript (but you have OpenAPI!)

**Benefits:**
- ✅ Zero migration time (600 hours saved)
- ✅ Code sharing with Next.js
- ✅ Type safety end-to-end
- ✅ Single language, single codebase
- ✅ Already production-ready

**ROI:** Excellent

### Full Python Migration

**Costs:**
- ❌ 400-600 hours development time
- ❌ Duplicate codebase to maintain
- ❌ Lost type safety with frontend
- ❌ Two languages for team
- ❌ Rewrite all tests
- ❌ Risk of bugs during migration

**Benefits:**
- ✅ Python ML ecosystem access
- ✅ Native ChromaDB
- ✅ Python-first development
- ✅ Easier for Python devs

**ROI:** Poor (unless you have specific Python ML needs)

### Hybrid (TypeScript + Python Microservice)

**Costs:**
- ❌ 40-60 hours for microservice
- ❌ Two languages (but isolated)

**Benefits:**
- ✅ Python for ML-specific tasks
- ✅ Keep existing TypeScript codebase
- ✅ Best of both worlds
- ✅ Low risk

**ROI:** Good (if you need Python ML features)

---

## Decision Matrix

### Full Python Migration Makes Sense If:

You need **4 or more** of these:
- ✅ Building **custom ML models** (PyTorch, TensorFlow)
- ✅ Team is **Python-first** (no TypeScript experience)
- ✅ Need **advanced data science** (NumPy, Pandas, scikit-learn)
- ✅ Building **Python-heavy pipelines** (Airflow, Dagster)
- ✅ Have **600+ hours available** for migration
- ✅ Want to **eliminate TypeScript** entirely
- ✅ Need **Python-native libraries** (no JS equivalent)

**Currently:** How many apply? Likely 0-1. **Full migration NOT recommended.**

### Python Microservice Makes Sense If:

You need **2 or more** of these:
- ✅ Custom **embedding models** (Sentence-Transformers, BERT)
- ✅ Advanced **RAG with LangChain**
- ✅ **ML model serving** (PyTorch, TensorFlow)
- ✅ **Data preprocessing** pipelines
- ✅ Integration with **Python ML tools**

**Recommendation:** Start with **Option D** (use OpenAPI client), then add microservice if needed.

### Keep TypeScript Standalone If:

- ✅ Current solution meets needs
- ✅ Don't need custom Python ML models
- ✅ Team is TypeScript-focused
- ✅ Want to avoid 600-hour migration
- ✅ Value code sharing with Next.js
- ✅ Type safety is important

**This is likely your situation.** **Recommended.**

---

## Recommended Approach

### Phase 1: Current State (0 hours) ✅

**You already have this:**
1. TypeScript standalone server on port 3001
2. OpenAPI specification at `/openapi.json`
3. Swagger UI at `/docs`
4. CORS enabled for external access
5. REST endpoints auto-generated from tRPC

**For Python clients:**
```bash
# Auto-generate Python client from OpenAPI spec
pip install openapi-python-client
openapi-python-client generate --url http://localhost:3001/openapi.json
```

### Phase 2: If You Need Python (40-60 hours)

**Only if you identify specific Python ML needs:**

1. **Create Python microservice** (20-30 hours)
   - FastAPI server on port 3002
   - Handle ML-specific tasks only
   - Examples: custom embeddings, LangChain workflows, model serving

2. **Integrate with TypeScript backend** (10-15 hours)
   - TypeScript calls Python via HTTP
   - Python service is stateless
   - Share PostgreSQL database

3. **Test integration** (10-15 hours)
   - End-to-end tests
   - Performance testing
   - Error handling

### Phase 3: Future (if needed)

**Only if Python microservice is successful and you want more:**
- Add more Python microservices
- Consider full migration (re-evaluate ROI)
- Keep hybrid architecture

---

## Migration Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Lost type safety** | High | High | Generate TypeScript types from Pydantic |
| **Code divergence** | High | High | Shared OpenAPI spec, automated testing |
| **Bugs in rewrite** | High | Critical | Extensive testing, gradual rollout |
| **Slower development** | High | Medium | Code sharing lost, parallel changes needed |
| **Team skill gap** | Medium | Medium | Training, hiring Python developers |
| **Performance regression** | Low | Medium | Benchmark before/after |
| **Database migration issues** | Medium | High | Test migrations extensively |
| **Integration breakage** | Medium | High | OpenAPI contract testing |

**Highest Risk:** **Code duplication and divergence** - Maintaining two versions of same business logic is error-prone.

---

## Performance Comparison

### TypeScript (Node.js) vs Python (FastAPI)

**Raw Framework Performance:**

| Framework | Requests/sec | Latency |
|-----------|--------------|---------|
| Node.js (Express) | ~15k | 0.67ms |
| FastAPI (async) | ~10-20k | 0.5-1.0ms |
| Flask (sync) | ~3-5k | 3-5ms |

**However, for your app:**

**Real bottlenecks:**
1. **LLM API calls** (OpenRouter): 500-2000ms
2. **Database queries** (PostgreSQL): 10-100ms
3. **Embedding generation** (OpenAI): 100-300ms
4. **Vector search** (ChromaDB): 10-50ms

**Framework overhead:** <1ms (negligible)

**Conclusion:** Framework choice won't impact performance. LLM and database are 100-1000x slower than framework.

---

## Real-World Example

### Scenario: You want to use LangChain (Python library) for advanced RAG

**Option 1: Full Python Migration** (400-600 hours)
- Rewrite entire backend
- Maintain two codebases
- High risk

**Option 2: Python Microservice** (40-60 hours)
- Create FastAPI service for LangChain
- Keep TypeScript for everything else
- Low risk

**Option 3: Python Function** (10-20 hours)
- Deploy serverless function
- Call from TypeScript
- Very low risk

**Recommendation:** Start with Option 3, scale to Option 2 if successful.

---

## Final Recommendation

### 🏆 Keep TypeScript Standalone + Use OpenAPI for Python Clients

**Why?**

1. **You Already Have What You Need**
   - OpenAPI REST endpoints ✅
   - Swagger documentation ✅
   - CORS enabled ✅
   - Perfect for Python orchestration ✅

2. **Avoid Massive Migration**
   - Save 400-600 hours
   - No code duplication
   - No drift risk
   - Keep type safety

3. **Python Integration Already Works**
   - Auto-generate Python client from OpenAPI
   - Use `httpx` for async calls
   - Type hints from Pydantic

4. **Add Python When Needed**
   - Start with microservice for ML-specific tasks
   - Keep TypeScript for CRUD/business logic
   - Best of both worlds

**Action Plan:**

1. **Now:** Generate Python client from your OpenAPI spec
   ```bash
   openapi-python-client generate --url http://localhost:3001/openapi.json
   ```

2. **Use Python client in external apps:**
   ```python
   from ai_workflow_client import Client

   async def main():
       client = Client(base_url="http://localhost:3001")
       result = await client.chat.send_message(
           conversation_id="...",
           content="Hello from Python!"
       )
   ```

3. **If you need Python ML features:**
   - Build small FastAPI microservice
   - Keep it focused (embeddings, LangChain, etc.)
   - Call from TypeScript backend

4. **Don't migrate unless:**
   - You have 600+ hours available
   - You're building Python-first ML platform
   - You can justify code duplication

---

## Python Microservice Template

If you decide to add a Python microservice, here's a starter template:

### Structure

```
python-ml-service/
├── app/
│   ├── main.py              # FastAPI app
│   ├── models.py            # Pydantic models
│   ├── services/
│   │   └── embeddings.py    # Custom embedding service
│   └── routers/
│       └── ml.py            # ML endpoints
├── Dockerfile
├── requirements.txt
├── pyproject.toml
└── tests/
```

### Example: Custom Embeddings Service

```python
# app/main.py
from fastapi import FastAPI
from app.routers import ml

app = FastAPI(title="AI Workflow ML Service")

app.include_router(ml.router, prefix="/ml", tags=["ml"])

@app.get("/health")
async def health():
    return {"status": "ok"}

# app/services/embeddings.py
from sentence_transformers import SentenceTransformer

class CustomEmbeddingService:
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)

    async def generate_embedding(self, text: str) -> list[float]:
        embedding = self.model.encode(text)
        return embedding.tolist()

# app/routers/ml.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services.embeddings import CustomEmbeddingService

router = APIRouter()

class EmbeddingRequest(BaseModel):
    text: str

@router.post("/embeddings")
async def generate_embedding(
    request: EmbeddingRequest,
    service: CustomEmbeddingService = Depends(lambda: CustomEmbeddingService())
):
    embedding = await service.generate_embedding(request.text)
    return {"embedding": embedding}
```

### Call from TypeScript

```typescript
// In your TypeScript backend
async function getCustomEmbedding(text: string): Promise<number[]> {
  const response = await fetch('http://localhost:3002/ml/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const data = await response.json();
  return data.embedding;
}
```

**Effort:** 40-60 hours for production-ready microservice

---

## References

### Python Web Frameworks
- **FastAPI:** https://fastapi.tiangolo.com/
- **Flask:** https://flask.palletsprojects.com/
- **Django REST Framework:** https://www.django-rest-framework.org/

### Database (Python)
- **SQLAlchemy 2.0:** https://docs.sqlalchemy.org/
- **Alembic:** https://alembic.sqlalchemy.org/ (migrations)
- **asyncpg:** https://github.com/MagicStack/asyncpg (PostgreSQL async)

### OpenAPI Client Generation
- **openapi-python-client:** https://github.com/openapi-generators/openapi-python-client
- **openapi-generator:** https://openapi-generator.tech/

### ML/AI Libraries (Python)
- **LangChain:** https://python.langchain.com/
- **LlamaIndex (Python):** https://docs.llamaindex.ai/
- **Sentence-Transformers:** https://www.sbert.net/
- **Transformers (Hugging Face):** https://huggingface.co/docs/transformers

### Your Current Implementation
- **Standalone Server:** `src/server/standalone.ts`
- **OpenAPI Spec:** `src/server/openapi-spec.ts`
- **Service Layer:** `src/server/services/` (21 files, ~4,459 lines)
- **tRPC Routers:** `src/server/routers/` (10 files)

---

**Assessment Completed By:** Claude (AI Workflow Engine Analysis)
**Branch:** `feat/vectordb-setup`
**Assessment Date:** January 2025
