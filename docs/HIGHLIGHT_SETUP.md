# Highlight.io Integration Guide

This guide explains how to use Highlight.io for error tracking and distributed tracing in the AI Workflow Engine.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Development Setup (Self-Hosted)](#development-setup-self-hosted)
- [Production Setup (Cloud)](#production-setup-cloud)
- [Usage Examples](#usage-examples)
- [Viewing Traces and Errors](#viewing-traces-and-errors)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Highlight.io provides:

- **Error Tracking**: Automatically capture and group errors with stack traces
- **Distributed Tracing**: Track requests across services and functions
- **Session Replay**: (Cloud only) See what users did before an error occurred
- **Performance Monitoring**: Identify slow operations and bottlenecks
- **Request Correlation**: Link logs, traces, and errors by request ID

### Why Two Modes?

**Development (Self-Hosted)**:
- ✅ Free and unlimited
- ✅ Run entirely on your machine
- ✅ No data sent to third parties
- ✅ Faster iteration
- ❌ Requires Docker and ~2GB RAM
- ❌ No session replay

**Production (Cloud)**:
- ✅ Managed infrastructure
- ✅ Session replay and advanced features
- ✅ Better UI and dashboards
- ✅ No local resource usage
- ❌ Requires signup and API keys
- ❌ Data sent to Highlight servers

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Workflow Engine                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │          EnhancedLogger                                  │  │
│  │  ┌────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │    Pino    │  │    Axiom    │  │   Highlight     │  │  │
│  │  │  (Local)   │  │  (Analytics)│  │ (Error/Tracing) │  │  │
│  │  └────────────┘  └─────────────┘  └─────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                  │                             │
└──────────────────────────────────┼─────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
        ┌───────────────────────┐    ┌───────────────────────┐
        │  Self-Hosted Backend  │    │   Highlight Cloud     │
        │  (Development)        │    │   (Production)        │
        │                       │    │                       │
        │  - PostgreSQL         │    │  - Managed Service    │
        │  - ClickHouse         │    │  - Session Replay     │
        │  - Redis              │    │  - Advanced Features  │
        │  - OpenSearch         │    │  - No Infrastructure  │
        │                       │    │                       │
        │  http://localhost:3001│    │  https://app.highlight│
        └───────────────────────┘    └───────────────────────┘
```

## Development Setup (Self-Hosted)

### Prerequisites

- Docker Desktop installed
- At least 4GB RAM available for Docker
- ~5GB disk space for Docker volumes

### Step 1: Start Highlight Backend

```bash
# Start all Highlight services
npm run highlight:up

# This will start:
# - PostgreSQL (metadata storage)
# - ClickHouse (traces/logs storage)
# - Redis (caching)
# - OpenSearch (search)
# - Highlight Backend (API)
# - Highlight Frontend (UI)
```

**Wait time**: First startup takes ~2-3 minutes to pull images and initialize databases.

### Step 2: Verify Services Are Running

```bash
# Check service health
docker compose -f docker-compose.highlight.yml ps

# Should show all services as "Up (healthy)"
```

Expected output:
```
NAME                    STATUS
highlight-backend       Up (healthy)
highlight-frontend      Up (healthy)
highlight-postgres      Up (healthy)
highlight-clickhouse    Up (healthy)
highlight-redis         Up (healthy)
highlight-opensearch    Up (healthy)
```

### Step 3: Configure Environment Variables

Add to your `.env` file:

```env
# Highlight Configuration (Development)
HIGHLIGHT_PROJECT_ID=local-dev
HIGHLIGHT_BACKEND_URL=http://localhost:4318
HIGHLIGHT_SERVICE_NAME=alembic-orchestrator
```

### Step 4: Access the UI

1. Open http://localhost:3001 in your browser
2. First-time setup:
   - Email: `admin@highlight.local`
   - Password: `admin`
3. Create a project called "local-dev" (must match `HIGHLIGHT_PROJECT_ID`)

### Step 5: Test the Integration

```bash
# Start your app with Highlight
npm run dev:with-highlight

# Or manually
npm run highlight:up
npm run dev
```

Trigger an error in your application, then check the Highlight UI for the error.

### Managing Self-Hosted Highlight

```bash
# View logs
npm run highlight:logs

# Restart all services
npm run highlight:restart

# Stop services (keeps data)
npm run highlight:down

# Stop and delete all data
npm run highlight:clean
```

### Resource Usage

Self-hosted Highlight typically uses:
- **CPU**: 10-20% (idle), 40-60% (active)
- **RAM**: 1.5-2.5GB
- **Disk**: 500MB - 5GB (depends on usage)

## Production Setup (Cloud)

### Step 1: Sign Up for Highlight Cloud

1. Go to https://app.highlight.io/
2. Sign up for a free account (includes 500 sessions/month free)
3. Create a new project

### Step 2: Get Your Project ID

1. In the Highlight dashboard, go to Settings → Project Settings
2. Copy your Project ID (format: `abc123def456`)

### Step 3: Configure Environment Variables

Add to your production `.env` file:

```env
# Highlight Configuration (Production - Cloud)
HIGHLIGHT_PROJECT_ID=your_project_id_here
HIGHLIGHT_SERVICE_NAME=alembic-orchestrator

# Note: HIGHLIGHT_BACKEND_URL is NOT set (uses cloud by default)
```

### Step 4: Deploy

Deploy your application. Errors and traces will automatically appear in the Highlight cloud dashboard at https://app.highlight.io/

## Usage Examples

### Basic Error Tracking

Errors are automatically tracked when using the EnhancedLogger:

```typescript
import { enhancedLogger } from '~/lib/logging';

const log = enhancedLogger.child({
  requestId: '123',
  sessionId: '456',
  component: 'api',
});

try {
  await riskyOperation();
} catch (error) {
  // This automatically sends the error to Highlight
  log.error({ requestId: '123' }, 'Operation failed', error);
}
```

### Distributed Tracing with withTracing

Wrap async functions to automatically create trace spans:

```typescript
import { withTracing } from '~/lib/logging';

// Wrap a function
const tracedDatabaseQuery = withTracing(
  async (query: string) => {
    return await database.execute(query);
  },
  {
    operationName: 'database.query',
    component: 'database',
    requestId: '123',
  }
);

// Use it
const result = await tracedDatabaseQuery('SELECT * FROM users');
```

### Decorator-Based Tracing

Use the `@Traced` decorator on class methods:

```typescript
import { Traced } from '~/lib/logging';

class ChainOrchestrator {
  @Traced({
    operationName: 'ChainOrchestrator.executeChain',
    component: 'chain',
  })
  async executeChain(input: string): Promise<string> {
    // This method is automatically traced
    return await this.process(input);
  }
}
```

### Manual Span Creation

For complex scenarios with multiple steps:

```typescript
import { Highlight } from '~/lib/logging';

async function complexOperation(requestId: string) {
  const span = Highlight.startSpan('complex-operation', {
    attributes: { requestId },
  });

  try {
    await step1();
    span.addEvent('step1-complete');

    await step2();
    span.addEvent('step2-complete');

    await step3();
    span.addEvent('step3-complete');

    span.setStatus({ code: 1 }); // OK
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
```

### Request Correlation

Extract tracing context from HTTP headers:

```typescript
import { extractTracingContext, withTracing } from '~/lib/logging';

export async function apiHandler(req: Request, res: Response) {
  // Extract request/session IDs from headers
  const { requestId, sessionId } = extractTracingContext(req.headers);

  // Create traced function with context
  const tracedHandler = withTracing(
    async () => {
      return await processRequest(req.body);
    },
    {
      operationName: 'api.processRequest',
      requestId,
      sessionId,
      component: 'api',
    }
  );

  const result = await tracedHandler();
  res.json(result);
}
```

### Chain Orchestration Tracing

Example of tracing the full chain orchestration:

```typescript
import { enhancedLogger, withTracing } from '~/lib/logging';

class ChainOrchestrator {
  async executeChain(request: ChainRequest): Promise<ChainResponse> {
    const log = enhancedLogger.child({
      requestId: request.id,
      sessionId: request.sessionId,
      component: 'chain',
    });

    // Trace analyze stage
    const analyze = withTracing(
      async () => this.analyzeQuery(request.query),
      {
        operationName: 'chain.analyze',
        requestId: request.id,
        component: 'chain',
      }
    );

    const analysis = await analyze();
    log.logChainStage({
      stage: 'analyze',
      duration: analysis.duration,
      cost: analysis.cost,
      model: analysis.model,
      success: true,
    });

    // Trace route stage
    const route = withTracing(
      async () => this.routeToModel(analysis),
      {
        operationName: 'chain.route',
        requestId: request.id,
        component: 'chain',
      }
    );

    const routing = await route();
    log.logChainStage({
      stage: 'route',
      duration: routing.duration,
      success: true,
    });

    // Trace execute stage
    const execute = withTracing(
      async () => this.executeModel(routing.model, request.query),
      {
        operationName: 'chain.execute',
        requestId: request.id,
        component: 'chain',
        attributes: {
          model: routing.model,
        },
      }
    );

    const response = await execute();
    log.logChainStage({
      stage: 'execute',
      duration: response.duration,
      cost: response.cost,
      model: routing.model,
      success: true,
    });

    return response;
  }
}
```

## Viewing Traces and Errors

### Self-Hosted UI (Development)

1. Open http://localhost:3001
2. Login with `admin@highlight.local` / `admin`
3. Navigate to:
   - **Errors**: See all errors grouped by type
   - **Traces**: View distributed traces with timing
   - **Search**: Query logs and spans

### Cloud UI (Production)

1. Open https://app.highlight.io/
2. Select your project
3. Navigate to:
   - **Errors**: Grouped errors with stack traces and context
   - **Traces**: Distributed trace visualization
   - **Sessions**: (Cloud only) Session replay before errors
   - **Logs**: Search and filter logs
   - **Metrics**: Performance dashboards

### Understanding Trace Visualization

```
Request Timeline (Total: 1,234ms)
├─ chain.analyze (156ms)
│  ├─ model.invoke (120ms)
│  └─ response.parse (36ms)
├─ chain.route (45ms)
│  └─ model.select (45ms)
└─ chain.execute (1,033ms)
   ├─ model.invoke (980ms)
   ├─ response.parse (45ms)
   └─ response.validate (8ms)
```

Each span shows:
- Operation name
- Duration
- Success/failure status
- Custom attributes (requestId, model, cost, etc.)
- Any errors that occurred

## Best Practices

### 1. Always Provide Request Context

```typescript
// ✅ Good - includes request ID for correlation
const log = enhancedLogger.child({ requestId, sessionId });

// ❌ Bad - no way to correlate related operations
const log = enhancedLogger.child({});
```

### 2. Use Descriptive Operation Names

```typescript
// ✅ Good - clear hierarchy and operation
operationName: 'chain.orchestrator.executeWithRetry'

// ❌ Bad - vague and unhelpful
operationName: 'execute'
```

### 3. Add Relevant Attributes

```typescript
// ✅ Good - includes context for debugging
withTracing(fn, {
  operationName: 'model.invoke',
  attributes: {
    model: 'claude-3-5-sonnet',
    inputTokens: 1000,
    outputTokens: 500,
  },
});

// ❌ Bad - no context
withTracing(fn, { operationName: 'model.invoke' });
```

### 4. Don't Over-Trace

```typescript
// ✅ Good - trace meaningful operations
await withTracing(async () => {
  return await database.complexQuery();
}, { operationName: 'database.complexQuery' });

// ❌ Bad - tracing trivial operations creates noise
await withTracing(async () => {
  return x + y;
}, { operationName: 'math.add' });
```

### 5. Handle Errors Gracefully

```typescript
// ✅ Good - errors are caught and logged properly
try {
  await tracedOperation();
} catch (error) {
  log.error({ requestId }, 'Operation failed', error);
  // Handle error appropriately
}

// ❌ Bad - errors silently disappear
try {
  await tracedOperation();
} catch (error) {
  // Nothing
}
```

## Troubleshooting

### Self-Hosted Backend Not Starting

**Symptom**: Services fail to start or stay unhealthy

**Solution**:
```bash
# Check logs for errors
npm run highlight:logs

# Common issues:
# 1. Port conflicts (3001, 8082, 4318, 5433, 9000, 9201)
docker ps  # Check what's using ports

# 2. Insufficient Docker resources
# Increase Docker Desktop memory to 4GB+

# 3. Corrupted volumes
npm run highlight:clean  # Delete all data
npm run highlight:up     # Fresh start
```

### Traces Not Appearing

**Symptom**: Code runs but no traces in UI

**Solution**:
```typescript
// 1. Check Highlight is enabled
console.log(enhancedLogger.isHighlightEnabled());  // Should be true

// 2. Verify environment variables
console.log(process.env.HIGHLIGHT_PROJECT_ID);     // Should be set
console.log(process.env.HIGHLIGHT_BACKEND_URL);    // Self-hosted: set, Cloud: undefined

// 3. Check for initialization errors
// Look for warnings in console output during startup
```

### Project ID Mismatch

**Symptom**: Traces sent but don't appear in UI

**Solution**:
```bash
# Ensure .env project ID matches UI project ID
# Self-hosted: must be "local-dev" (or whatever you created)
# Cloud: get from Highlight dashboard settings
```

### High Resource Usage (Self-Hosted)

**Symptom**: Docker using too much CPU/RAM

**Solution**:
```bash
# 1. Limit ClickHouse memory
# Edit docker-compose.highlight.yml:
# Add to highlight-clickhouse environment:
#   CLICKHOUSE_MAX_MEMORY_USAGE: 1000000000  # 1GB

# 2. Clean old data
npm run highlight:clean
npm run highlight:up

# 3. Only run when needed
npm run highlight:down  # When not debugging
```

### Connection Refused Errors

**Symptom**: `ECONNREFUSED localhost:4318`

**Solution**:
```bash
# 1. Verify backend is running
docker compose -f docker-compose.highlight.yml ps

# 2. Check backend logs
docker compose -f docker-compose.highlight.yml logs highlight-backend

# 3. Restart services
npm run highlight:restart
```

## Differences Between Self-Hosted and Cloud

| Feature | Self-Hosted | Cloud |
|---------|-------------|-------|
| Error Tracking | ✅ Yes | ✅ Yes |
| Distributed Tracing | ✅ Yes | ✅ Yes |
| Session Replay | ❌ No | ✅ Yes |
| Log Search | ✅ Basic | ✅ Advanced |
| Alerts | ❌ No | ✅ Yes |
| Team Collaboration | ⚠️ Limited | ✅ Yes |
| Data Retention | ∞ (until you delete) | 30 days (free tier) |
| Setup | Docker compose | API keys |
| Cost | Free | Free tier + paid plans |
| Performance | Local (faster) | Network (slower) |

## Next Steps

1. **Development**: Start with self-hosted to learn the system
2. **Staging**: Test with cloud to verify production setup
3. **Production**: Use cloud for managed infrastructure
4. **Monitoring**: Set up alerts in cloud for critical errors

## Resources

- **Self-Hosted Docs**: https://www.highlight.io/docs/getting-started/self-host
- **Cloud Docs**: https://www.highlight.io/docs/getting-started/overview
- **Node.js SDK**: https://www.highlight.io/docs/sdk/nodejs
- **Tracing Guide**: https://www.highlight.io/docs/general/product-features/tracing

## Support

For questions or issues:
1. Check Highlight documentation: https://www.highlight.io/docs
2. Highlight Discord: https://highlight.io/community
3. Project issues: Create a GitHub issue
