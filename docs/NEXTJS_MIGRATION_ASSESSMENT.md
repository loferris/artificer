# Next.js to Fastify/Hono Migration Assessment

**Date:** January 2025
**Branch:** `feat/vectordb-setup`
**Application:** AI Workflow Engine

---

## Executive Summary

**Current State:** Your application uses Next.js primarily as a **routing and API layer**, not for SSR/SSG. The frontend is a pure client-side SPA.

**Assessment:** Should you migrate to Fastify or Hono?

**Recommendation: ⚠️ EVALUATE CAREFULLY - Migration is feasible but requires significant effort**

**Migration Complexity:** Medium-High
- **Estimated Effort:** 60-100 hours
- **Risk Level:** Medium
- **Value Proposition:** Depends on your priorities

**Key Insight:** You already have a standalone tRPC server (`src/server/standalone.ts`) that runs independently of Next.js. This makes migration easier than typical Next.js apps.

---

## Current Next.js Usage Analysis

### How Next.js is Actually Used

Based on comprehensive codebase analysis:

#### ✅ What You USE from Next.js

1. **File-based Routing (Pages Router)**
   - 6 page files in `src/pages/`
   - Dynamic route: `projects/[id].tsx`
   - Automatic routing configuration

2. **API Routes** (11 files in `src/pages/api/`)
   - `/api/trpc/[trpc]` - tRPC catch-all route
   - `/api/stream/chat` - SSE streaming endpoint (210 lines)
   - `/api/health`, `/api/debug`, `/api/demo-status` - Utility endpoints
   - `/api/messages/*`, `/api/conversations/*` - REST endpoints
   - `/api/client-errors` - Error logging

3. **Development Tooling**
   - Fast refresh for React components
   - TypeScript integration
   - Built-in dev server

4. **Build Optimization**
   - Standalone output mode for Docker deployment
   - Production build optimization
   - Asset bundling

5. **Custom Server Integration** (`server.ts`)
   - WebSocket support for tRPC subscriptions
   - Custom request handling
   - Port 3000 default

#### ❌ What You DON'T USE from Next.js

- **Server-Side Rendering (SSR)**: Explicitly disabled (`ssr: false`)
- **Static Site Generation (SSG)**: No `getStaticProps` or `getServerSideProps`
- **Image Optimization**: No `next/image` usage
- **Middleware**: No middleware.ts file
- **App Router**: Using legacy Pages Router
- **Edge Runtime**: Standard Node.js runtime only
- **API Route Helpers**: Minimal use of Next.js conveniences

**Bottom Line:** You're using Next.js as a **sophisticated development server and router**, not for its primary value proposition (SSR/SSG).

---

## Architecture Breakdown

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Custom Server (server.ts)                 │
│  ┌──────────────────────┐         ┌──────────────────────┐  │
│  │   Next.js Handler    │         │  WebSocket Server    │  │
│  │  - Pages routing     │         │  - tRPC subscriptions│  │
│  │  - API routes        │         │  - Real-time updates │  │
│  │  - Static assets     │         └──────────────────────┘  │
│  └──────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌────▼─────┐    ┌─────▼──────┐
    │ React   │      │  tRPC    │    │   API      │
    │ Pages   │      │  Router  │    │  Routes    │
    │ (6 files)│     │          │    │ (11 files) │
    └─────────┘      └──────────┘    └────────────┘
```

### Alternative: Standalone Server (Already Exists!)

```
┌──────────────────────────────────────────────────────────┐
│         Standalone tRPC Server (standalone.ts)            │
│  - Pure tRPC over HTTP                                    │
│  - OpenAPI/REST support                                   │
│  - CORS enabled                                           │
│  - No Next.js dependency                                  │
│  - Port 3001 default                                      │
└──────────────────────────────────────────────────────────┘
```

**Key Insight:** Your app already has a working backend without Next.js. Migration would primarily involve:
1. Migrating frontend build to Vite
2. Converting Next.js API routes to Fastify/Hono routes
3. Serving frontend static files from backend

---

## Migration Target Options

### Option A: Fastify

**What is Fastify?**
- High-performance Node.js web framework
- Schema-based validation (JSON Schema)
- Plugin architecture
- TypeScript support
- Focus: Speed and developer experience

**Fastify Stats:**
- ~32k GitHub stars
- Very active development
- Excellent TypeScript support
- Rich ecosystem of plugins

**Key Features:**
- Fastest Node.js framework (benchmarks)
- Built-in schema validation
- Logging (Pino) included
- Extensive plugin system
- Lifecycle hooks
- Decorator pattern

### Option B: Hono

**What is Hono?**
- Ultra-lightweight web framework
- Edge-first design (but works on Node.js)
- TypeScript-first
- Minimal dependencies
- Focus: Simplicity and portability

**Hono Stats:**
- ~18k GitHub stars
- Rapidly growing
- Excellent TypeScript inference
- Runs on: Node.js, Bun, Deno, Cloudflare Workers, Vercel Edge

**Key Features:**
- Smallest bundle size
- RPC client like tRPC (hono/client)
- Middleware system
- Edge runtime compatible
- Zero dependencies (core)
- Type-safe routing

---

## Detailed Comparison

### Fastify vs. Hono vs. Current Next.js

| Aspect | Current (Next.js) | Fastify | Hono | Winner |
|--------|------------------|---------|------|--------|
| **Performance** | Good | Excellent (benchmarked) | Excellent (benchmarked) | 🏆 Hono (slight edge) |
| **Bundle Size** | Large (~100MB) | Medium (~20MB) | Tiny (~5MB) | 🏆 Hono |
| **TypeScript Support** | Good | Excellent | Excellent | 🟰 Tie |
| **Learning Curve** | Known | Moderate | Low | 🏆 Hono |
| **Plugin Ecosystem** | Massive | Large | Growing | 🏆 Next.js |
| **Edge Runtime** | Limited | No | Yes | 🏆 Hono |
| **Schema Validation** | Zod (manual) | Built-in (JSON Schema) | Manual (Zod) | 🏆 Fastify |
| **WebSocket Support** | Custom (ws) | Plugin | Plugin | 🟰 Tie |
| **Static File Serving** | Built-in | Plugin | Plugin | 🏆 Next.js |
| **Deployment** | Vercel-optimized | Universal | Universal | 🏆 Next.js |
| **tRPC Integration** | Native (@trpc/next) | Good | Good | 🏆 Next.js |
| **Development Speed** | Fast Refresh | Manual restart | Manual restart | 🏆 Next.js |
| **Build Complexity** | Opinionated | Flexible | Flexible | 🟰 Tie |
| **Community Size** | Huge | Large | Growing | 🏆 Next.js |
| **Documentation** | Excellent | Excellent | Good | 🏆 Next.js/Fastify |

### Performance Benchmarks (Requests/sec)

Based on community benchmarks:

| Framework | Requests/sec | Latency (ms) |
|-----------|--------------|--------------|
| Hono | ~75,000 | 0.13 |
| Fastify | ~65,000 | 0.15 |
| Express | ~15,000 | 0.67 |
| Next.js API | ~10,000 | 1.00 |

**Note:** Real-world performance depends on your application logic, database queries, and I/O operations. Framework overhead is often negligible compared to these factors.

---

## Migration Effort Breakdown

### Components to Migrate

#### 1. **Frontend Build System** (20-30 hours)

**Current:** Next.js Pages Router with automatic routing

**Target:** Vite + React with manual routing

**Tasks:**
- Install and configure Vite (~2 hours)
- Set up React Router v6 (~4-6 hours)
  - Convert 6 pages to React Router routes
  - Migrate `useRouter` to `useNavigate`/`useParams`
  - Implement dynamic routes (`projects/:id`)
- Configure build output and assets (~2-4 hours)
- Set up development server (~2-3 hours)
- Migrate environment variables (~1-2 hours)
- Configure TailwindCSS with Vite (~2-3 hours)
- Test HMR and fast refresh (~2-4 hours)
- Update TypeScript paths and imports (~3-5 hours)

**Files Affected:** 6 page files, 31+ components

#### 2. **Backend Migration** (30-40 hours)

**Current:** Next.js API routes + Custom server + Standalone server

**Target:** Fastify or Hono server

##### Option A: Fastify Migration

**Tasks:**
- Set up Fastify server (~3-4 hours)
- Install plugins: cors, static, helmet, websocket (~2-3 hours)
- Migrate 11 API routes to Fastify routes (~15-20 hours)
  - `/api/trpc/[trpc]` - tRPC adapter (~3-4 hours)
  - `/api/stream/chat` - SSE streaming (~4-5 hours)
  - 9 other REST endpoints (~1 hour each)
- Configure static file serving for frontend (~2-3 hours)
- Set up WebSocket server (~3-4 hours)
- Configure logging (Pino already used) (~1-2 hours)
- Set up request validation schemas (~3-4 hours)
- Test all endpoints (~4-6 hours)

##### Option B: Hono Migration

**Tasks:**
- Set up Hono server (~2-3 hours)
- Install middleware: cors, static, helmet (~1-2 hours)
- Migrate 11 API routes to Hono routes (~15-20 hours)
  - `/api/trpc/[trpc]` - tRPC adapter (~3-4 hours)
  - `/api/stream/chat` - SSE streaming (~4-5 hours)
  - 9 other REST endpoints (~0.5-1 hour each)
- Configure static file serving for frontend (~2-3 hours)
- Set up WebSocket server (~3-4 hours)
- Configure logging (~2-3 hours)
- Set up request validation with Zod (~2-3 hours)
- Test all endpoints (~4-6 hours)

**Fastify Complexity:** Medium (more boilerplate, but well-documented)
**Hono Complexity:** Low (minimal boilerplate, simpler API)

#### 3. **Build & Deployment** (10-15 hours)

**Tasks:**
- Update Docker configuration (~2-3 hours)
- Update docker-compose.yml (~1-2 hours)
- Create production build script (~1-2 hours)
- Configure Railway deployment (~2-3 hours)
- Remove Vercel-specific config (~1 hour)
- Update GitHub Actions / CI/CD (~2-3 hours)
- Test deployment pipeline (~2-3 hours)

#### 4. **Testing & QA** (15-20 hours)

**Tasks:**
- Update unit tests for new routing (~5-7 hours)
- Update integration tests (~5-7 hours)
- E2E testing with new architecture (~3-5 hours)
- Performance testing and optimization (~2-3 hours)
- Fix bugs and regressions (~3-5 hours)

#### 5. **Documentation** (5-10 hours)

**Tasks:**
- Update README.md (~2-3 hours)
- Update developer documentation (~2-3 hours)
- Document new build/deploy process (~1-2 hours)
- Update API documentation (~1-2 hours)

---

## Total Migration Effort

### Fastify Migration

| Phase | Hours | Complexity |
|-------|-------|------------|
| Frontend (Vite + React Router) | 20-30 | Medium |
| Backend (Fastify) | 30-40 | Medium |
| Build & Deployment | 10-15 | Medium |
| Testing & QA | 15-20 | High |
| Documentation | 5-10 | Low |
| **Total** | **80-115 hours** | **Medium-High** |

### Hono Migration

| Phase | Hours | Complexity |
|-------|-------|------------|
| Frontend (Vite + React Router) | 20-30 | Medium |
| Backend (Hono) | 25-35 | Low-Medium |
| Build & Deployment | 10-15 | Medium |
| Testing & QA | 15-20 | High |
| Documentation | 5-10 | Low |
| **Total** | **75-110 hours** | **Medium** |

**Conservative Estimate:** 100-120 hours (including unknowns and buffer)

---

## Pros and Cons

### Stay with Next.js

#### Pros ✅
- **Zero migration effort** - Keep working on features
- **Proven architecture** - Already production-ready with 469+ tests
- **Excellent DX** - Fast refresh, auto-routing, built-in optimization
- **Massive ecosystem** - Largest community, most plugins
- **Vercel deployment** - Optimized for easy deployment
- **Future-proof** - Can adopt SSR/SSG later if needed
- **Team familiarity** - No learning curve

#### Cons ❌
- **Large bundle size** - ~100MB node_modules (but irrelevant for server)
- **Overkill for SPA** - Not using SSR/SSG (main features)
- **Opinionated** - Less control over server architecture
- **Slower API routes** - ~10k req/s vs 65-75k req/s
- **Vendor tie-in** - Optimized for Vercel (though works elsewhere)

---

### Migrate to Fastify

#### Pros ✅
- **High performance** - 6x faster API routes (~65k req/s)
- **Schema validation** - Built-in JSON Schema validation
- **Mature ecosystem** - Lots of plugins and examples
- **Excellent docs** - Comprehensive documentation
- **TypeScript-first** - Great TypeScript support
- **Logging built-in** - Pino logger included (you already use it)
- **Full control** - No framework magic, explicit routing
- **Production-ready** - Used by major companies

#### Cons ❌
- **80-115 hours migration** - Significant time investment
- **More boilerplate** - Manual setup for routing, validation
- **No Fast Refresh** - Development DX downgrade
- **Manual routing** - Have to configure all routes explicitly
- **Plugin complexity** - Need to learn plugin system
- **Static serving** - Need to configure frontend asset serving
- **Learning curve** - Team needs to learn Fastify

---

### Migrate to Hono

#### Pros ✅
- **Highest performance** - Fastest Node.js framework (~75k req/s)
- **Tiny bundle** - Minimal dependencies (~5MB)
- **Simple API** - Easy to learn, minimal boilerplate
- **Excellent TypeScript** - Best-in-class type inference
- **Edge-ready** - Can deploy to Cloudflare Workers, Vercel Edge
- **Modern** - Built for modern JavaScript (ESM, async/await)
- **Flexible deployment** - Works on Node.js, Bun, Deno, edge runtimes
- **RPC support** - Hono/client provides tRPC-like experience

#### Cons ❌
- **75-110 hours migration** - Significant time investment
- **Smaller ecosystem** - Fewer plugins than Express/Fastify
- **Less mature** - Younger project (but very active)
- **No Fast Refresh** - Development DX downgrade
- **Manual validation** - Need to integrate Zod manually
- **Fewer examples** - Less Stack Overflow / blog content
- **Learning curve** - Team needs to learn Hono
- **Static serving** - Need to configure frontend asset serving

---

## Fastify vs. Hono: Which to Choose?

### Choose Fastify if:
- ✅ You want **mature, battle-tested** framework
- ✅ You need **built-in schema validation** (JSON Schema)
- ✅ You value **extensive plugin ecosystem**
- ✅ You want **comprehensive documentation**
- ✅ Your team prefers **Express-like APIs**
- ✅ You need **enterprise-grade** support

### Choose Hono if:
- ✅ You want **simplest migration path**
- ✅ You prioritize **performance** (15% faster than Fastify)
- ✅ You want **edge runtime** compatibility (future-proof)
- ✅ You value **minimal dependencies** (tiny bundle)
- ✅ You prefer **modern, clean APIs**
- ✅ You like **tRPC-style RPC** (hono/client)
- ✅ You want to deploy to **multiple runtimes** (Bun, Deno, etc.)

**My Recommendation:** **Hono** - Simpler, faster, more future-proof. Better fit for modern TypeScript apps.

---

## Migration Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Breaking frontend routes** | Medium | High | Comprehensive testing, gradual migration |
| **API compatibility issues** | Medium | High | Integration tests, API contract tests |
| **Performance regression** | Low | Medium | Benchmark before/after, load testing |
| **WebSocket issues** | Medium | Medium | Test real-time features thoroughly |
| **Deployment failures** | Medium | Critical | Staging environment, rollback plan |
| **Team productivity loss** | High | Medium | Training, documentation, pair programming |
| **Regression bugs** | Medium | Medium | E2E tests, QA pass before production |
| **Lost development velocity** | High | High | 100+ hours diverted from features |

**Highest Risk:** **Opportunity cost** - 100+ hours not spent on features, bug fixes, or revenue-generating work.

---

## Incremental Migration Strategy

If you decide to migrate, **do NOT do a big-bang rewrite**. Use this approach:

### Phase 1: Prepare (Week 1-2)

1. **Create feature branch**: `feat/migrate-to-hono` or `feat/migrate-to-fastify`
2. **Set up new server** alongside Next.js on different port
3. **Migrate 1-2 simple API routes** (e.g., `/api/health`, `/api/debug`)
4. **Test in parallel** with existing Next.js routes
5. **Benchmark performance** to validate benefits

**Decision Point:** If Phase 1 goes well, continue. If painful, abort with minimal sunk cost.

### Phase 2: Backend Migration (Week 3-5)

6. **Migrate remaining API routes** (10 routes)
7. **Set up tRPC adapter** for new framework
8. **Configure WebSocket server**
9. **Update tests** for new backend
10. **Run both servers** in parallel (Next.js + Hono/Fastify)

**Decision Point:** Backend fully functional? Proceed to frontend.

### Phase 3: Frontend Migration (Week 6-8)

11. **Set up Vite + React Router** in separate directory
12. **Migrate pages incrementally** (start with simplest)
13. **Point frontend** to new backend API
14. **Configure static serving** from backend
15. **Test thoroughly** in staging environment

### Phase 4: Production Cutover (Week 9-10)

16. **Deploy to staging** with new architecture
17. **Run production** traffic through both (A/B test if possible)
18. **Monitor metrics** (performance, errors, user experience)
19. **Cutover production** when confident
20. **Monitor closely** for first week, be ready to rollback

**Total Timeline:** 10 weeks (part-time) or 4-5 weeks (full-time)

---

## Alternative: Hybrid Approach

**You already have a standalone server!** Consider this strategy:

### Option C: Expand Standalone Server

**Current:** `standalone.ts` runs independently on port 3001

**Proposal:** Make standalone server the primary backend

**Strategy:**
1. **Keep Next.js** for frontend development (Fast Refresh, routing)
2. **Point Next.js** API routes to proxy to standalone server
3. **Gradually migrate** API routes to standalone server
4. **Eventually:** Replace Next.js with Vite when all APIs migrated
5. **Benefit:** Incremental migration with lower risk

**Migration Effort:** 40-60 hours (half of full migration)

**Implementation:**
```typescript
// src/pages/api/[...proxy].ts
export default async function handler(req, res) {
  // Proxy to standalone server on port 3001
  const response = await fetch(`http://localhost:3001${req.url}`);
  return res.status(response.status).json(await response.json());
}
```

This gives you:
- ✅ Next.js DX for frontend development
- ✅ Fastify/Hono benefits for backend
- ✅ Gradual migration path
- ✅ Lower risk (can rollback easily)

---

## Cost-Benefit Analysis

### Staying with Next.js

**Costs:**
- ❌ Slower API performance (but likely not bottleneck)
- ❌ Using 10% of framework features
- ❌ Larger deployment size

**Benefits:**
- ✅ Zero migration time (100+ hours saved)
- ✅ Team can focus on features
- ✅ Best-in-class DX
- ✅ Proven at scale

**ROI:** Excellent - no cost, high productivity

### Migrating to Hono/Fastify

**Costs:**
- ❌ 75-115 hours development time
- ❌ Risk of bugs and regressions
- ❌ Team learning curve
- ❌ Lost feature development time
- ❌ Potential deployment issues

**Benefits:**
- ✅ 6-7x faster API routes (if that matters)
- ✅ Smaller deployment (if that matters)
- ✅ More control over architecture
- ✅ Edge runtime option (Hono only)
- ✅ Learning new technology

**ROI:** Questionable - high cost, benefits depend on priorities

### When Migration Makes Sense

Migrate if **3 or more** apply:

- ✅ API performance is a **bottleneck** (profiling shows this)
- ✅ You want to deploy to **edge runtime** (Cloudflare, Vercel Edge)
- ✅ Bundle size is **critical** (constrained environment)
- ✅ Team wants to **learn new stack** (educational value)
- ✅ You're **refactoring anyway** (already touching this code)
- ✅ Next.js **version upgrade** is painful (breaking changes)
- ✅ You want **more control** over server architecture

**Currently:** How many apply? Likely 0-1. **Migration not recommended.**

---

## Performance Reality Check

### Your Current Bottlenecks (Likely)

Based on your architecture:

1. **Database queries** (PostgreSQL)
   - Likely 10-100x slower than framework overhead
   - Optimization: Indexing, query optimization, connection pooling

2. **External API calls** (OpenRouter, OpenAI)
   - Network latency: 100-500ms per request
   - Framework overhead: 0.1-1ms per request (negligible)

3. **LLM streaming** (SSE)
   - Streaming rate: ~50 tokens/sec
   - Framework doesn't impact this

4. **Vector search** (ChromaDB)
   - Embedding generation: 100-300ms
   - Similarity search: 10-100ms

**Framework Performance Impact:** <1% of total request time

**Recommendation:** Profile your application first. Don't optimize framework if database/API is the bottleneck.

---

## Final Recommendation

### 🏆 Stay with Next.js

**Why?**

1. **No Proven Bottleneck**
   - API performance likely not your bottleneck
   - Database, LLM, and vector search are slower than framework

2. **Excellent Current State**
   - 469+ tests passing
   - Production-ready
   - Well-documented
   - Team knows it

3. **Opportunity Cost**
   - 100+ hours better spent on:
     - Features (RAG improvements, UI enhancements)
     - Performance optimization (database indexes, caching)
     - Testing and quality
     - Documentation

4. **Risk > Reward**
   - High migration risk (bugs, regressions)
   - Uncertain benefits (likely negligible performance gain)
   - Lost productivity during migration

5. **Future Flexibility**
   - Can adopt SSR/SSG if needed
   - Can migrate later if truly needed
   - Already have standalone option

**When to Reconsider:**

Migrate when **3+ of these** are true:
- ✅ Profiling shows API framework is bottleneck
- ✅ Need to deploy to edge runtime
- ✅ Already planning major refactor
- ✅ Bundle size is critical constraint
- ✅ Next.js upgrade path is painful
- ✅ Team wants to learn new stack
- ✅ Have 100+ hours available

**Until then:** Focus on features, not refactoring.

---

## Alternative Optimizations

Instead of framework migration, consider:

### 1. Optimize Current Next.js Setup (5-10 hours)

- Enable HTTP/2
- Add response caching (Redis)
- Optimize database queries
- Add CDN for static assets
- Enable compression middleware

**Expected Gain:** 2-5x faster responses (bigger impact than framework)

### 2. Scale Horizontally (1-2 hours)

- Deploy multiple Next.js instances
- Add load balancer
- Use managed PostgreSQL with read replicas

**Expected Gain:** Handle 10x more traffic

### 3. Profile and Fix Real Bottlenecks (10-20 hours)

- Use profiling tools (Node.js profiler, clinic.js)
- Identify slow database queries
- Optimize vector search
- Cache embedding results
- Optimize LLM prompt sizes

**Expected Gain:** 10-50x faster for specific operations

**ROI:** Much better than framework migration

---

## Migration Checklist (If You Proceed)

### Pre-Migration

- [ ] Profile application to confirm framework is bottleneck
- [ ] Get team buy-in (100+ hours investment)
- [ ] Create feature branch
- [ ] Set up staging environment
- [ ] Document current API contracts
- [ ] Freeze new features during migration

### Phase 1: Setup

- [ ] Install Hono/Fastify
- [ ] Set up development server
- [ ] Configure TypeScript
- [ ] Set up logging
- [ ] Configure CORS
- [ ] Create hello-world endpoint

### Phase 2: API Migration

- [ ] Migrate health check endpoint (test pattern)
- [ ] Migrate debug endpoint
- [ ] Migrate tRPC adapter
- [ ] Migrate REST endpoints (9 files)
- [ ] Migrate SSE streaming endpoint
- [ ] Set up WebSocket server
- [ ] Test all endpoints

### Phase 3: Frontend Migration

- [ ] Install Vite + React Router
- [ ] Configure build
- [ ] Migrate _app.tsx setup
- [ ] Migrate index page
- [ ] Migrate projects page
- [ ] Migrate monitoring page
- [ ] Migrate dynamic project route
- [ ] Configure static asset serving
- [ ] Test all routes

### Phase 4: Deployment

- [ ] Update Dockerfile
- [ ] Update docker-compose.yml
- [ ] Configure Railway deployment
- [ ] Test staging deployment
- [ ] Performance benchmarks (before/after)
- [ ] Update CI/CD pipeline

### Phase 5: Testing

- [ ] Run all unit tests
- [ ] Run integration tests
- [ ] E2E testing
- [ ] Load testing
- [ ] Security audit
- [ ] QA pass

### Phase 6: Production

- [ ] Deploy to production
- [ ] Monitor metrics closely
- [ ] Be ready to rollback
- [ ] Fix any issues
- [ ] Document new architecture

---

## References

### Framework Documentation
- **Fastify:** https://fastify.dev/
- **Hono:** https://hono.dev/
- **Next.js:** https://nextjs.org/
- **Vite:** https://vitejs.dev/
- **React Router:** https://reactrouter.com/

### Migration Guides
- **Next.js to Vite:** https://vitejs.dev/guide/migration-from-next.html
- **tRPC with Fastify:** https://trpc.io/docs/server/adapters/fastify
- **tRPC with Hono:** https://hono.dev/docs/helpers/trpc-server

### Benchmarks
- **Web Framework Benchmarks:** https://github.com/fastify/benchmarks
- **Hono Benchmarks:** https://hono.dev/concepts/benchmarks

### Your Current Implementation
- **Custom Server:** `server.ts`
- **Standalone Server:** `src/server/standalone.ts` (Hono/Fastify starting point!)
- **API Routes:** `src/pages/api/**/*.ts` (11 files)
- **Frontend Pages:** `src/pages/**/*.tsx` (6 files)

---

**Assessment Completed By:** Claude (AI Workflow Engine Analysis)
**Branch:** `feat/vectordb-setup`
**Assessment Date:** January 2025
