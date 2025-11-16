# Enhanced Logging Migration Guide

This guide helps you migrate from the existing pino logger to the new Enhanced Logger with cloud aggregation support.

## Table of Contents

- [Overview](#overview)
- [Key Benefits](#key-benefits)
- [Quick Start](#quick-start)
- [Migration Patterns](#migration-patterns)
- [Specialized Logging](#specialized-logging)
- [Axiom Setup](#axiom-setup)
- [Querying Logs](#querying-logs)
- [Dashboard Examples](#dashboard-examples)
- [Best Practices](#best-practices)

## Overview

The Enhanced Logger is a wrapper around the existing pino logger that adds:

- **Cloud Aggregation**: Automatic log ingestion to Axiom for searchable, queryable logs
- **Request Correlation**: Track logs across distributed operations with request IDs
- **Specialized Methods**: Purpose-built logging for chains, costs, security, and performance
- **Graceful Degradation**: Falls back to local logging if Axiom is unavailable
- **Zero Impact in Development**: Only uses local pino logging during development

## Key Benefits

### Before (Existing Logger)
```typescript
import { logger } from '~/server/utils/logger';

logger.info('Processing request', { userId: '123', action: 'chat' });
logger.error('Request failed', new Error('Network timeout'), { userId: '123' });
```

**Problems:**
- Logs scattered across text files
- Hard to correlate related events
- No cost/performance tracking
- Difficult to query or analyze
- Manual grep/search required

### After (Enhanced Logger)
```typescript
import { enhancedLogger } from '~/lib/logging';

const log = enhancedLogger.child({ requestId: '123', sessionId: '456' });
log.info({ component: 'api' }, 'Processing request', { action: 'chat' });
log.error({ component: 'api' }, 'Request failed', new Error('Network timeout'));
```

**Benefits:**
- All logs searchable in Axiom dashboard
- Automatic request correlation
- SQL queries on logs
- Cost and performance dashboards
- Real-time monitoring and alerts

## Quick Start

### 1. Import the Enhanced Logger

```typescript
// Old way
import { logger } from '~/server/utils/logger';

// New way
import { enhancedLogger } from '~/lib/logging';
```

### 2. Create a Child Logger with Context

```typescript
// At the start of a request handler
const log = enhancedLogger.child({
  requestId: generateRequestId(),
  sessionId: req.session?.id,
  component: 'api',
});
```

### 3. Use Throughout Your Code

```typescript
// All logs will include the context (requestId, sessionId, component)
log.info({}, 'Request started', { path: req.path });
log.info({}, 'Database query completed', { duration: 45 });
log.info({}, 'Request completed', { status: 200 });
```

## Migration Patterns

### Basic Logging

#### Before
```typescript
import { logger } from '~/server/utils/logger';

logger.info('User logged in', { userId: '123' });
```

#### After
```typescript
import { enhancedLogger } from '~/lib/logging';

enhancedLogger.info(
  { requestId, component: 'auth' },
  'User logged in',
  { userId: '123' }
);
```

### Error Logging

#### Before
```typescript
logger.error('Database query failed', error, { query: 'SELECT *' });
```

#### After
```typescript
enhancedLogger.error(
  { requestId, component: 'database' },
  'Database query failed',
  error,
  { query: 'SELECT *' }
);
```

### Child Logger Pattern (Recommended)

Instead of passing context to every log call, create a child logger:

```typescript
// Create child logger with base context
const log = enhancedLogger.child({
  requestId: '123',
  sessionId: '456',
  component: 'chat',
});

// Use throughout your function - context is inherited
log.info({}, 'Processing message');
log.info({}, 'Calling AI model');
log.info({}, 'Response generated');

// Add additional context for specific logs
log.info({ stage: 'validation' }, 'Validating response');
```

## Specialized Logging

### Chain Orchestration Logging

Track each stage of your chain execution:

```typescript
import { enhancedLogger } from '~/lib/logging';

const log = enhancedLogger.child({
  requestId,
  sessionId,
  component: 'chain',
});

// Log individual stage
log.logChainStage({
  stage: 'analyze',
  duration: 156,
  cost: 0.0001,
  model: 'deepseek/deepseek-chat',
  success: true,
});

log.logChainStage({
  stage: 'execute',
  duration: 2340,
  cost: 0.0234,
  model: 'anthropic/claude-3-5-sonnet',
  success: true,
});

// Log completion with summary
log.logChainComplete(
  {},
  [analyzeStage, routeStage, executeStage, validateStage],
  0.0289 // total cost
);
```

**Axiom Query:**
```sql
-- Average duration by chain stage
SELECT stage, AVG(duration) as avg_ms
FROM logs
WHERE component = 'chain' AND stage IS NOT NULL
GROUP BY stage
```

### Cost Tracking

Track model usage and costs:

```typescript
enhancedLogger.logCost(
  { requestId, sessionId },
  {
    model: 'anthropic/claude-3-5-sonnet',
    inputTokens: 1000,
    outputTokens: 500,
    cost: 0.0234,
    requestType: 'chat',
  }
);
```

**Axiom Query:**
```sql
-- Total cost by model (last 7 days)
SELECT model, SUM(cost) as total_cost, COUNT(*) as requests
FROM logs
WHERE timestamp > ago(7d) AND cost IS NOT NULL
GROUP BY model
ORDER BY total_cost DESC
```

### Security Event Logging

Log security-related events with severity:

```typescript
// High severity - logged as error
enhancedLogger.logSecurityEvent(
  { requestId, sessionId },
  'potential_injection_detected',
  'high',
  { content: suspiciousContent, pattern: 'SQL injection' }
);

// Medium severity - logged as warning
enhancedLogger.logSecurityEvent(
  { requestId, userId },
  'unusual_access_pattern',
  'medium',
  { attempts: 5, timeWindow: '1m' }
);

// Low severity - logged as info
enhancedLogger.logSecurityEvent(
  { requestId },
  'auth_success',
  'low'
);
```

**Axiom Query:**
```sql
-- Security events by severity
SELECT severity, COUNT(*) as count
FROM logs
WHERE component = 'security'
GROUP BY severity
ORDER BY CASE severity
  WHEN 'high' THEN 1
  WHEN 'medium' THEN 2
  WHEN 'low' THEN 3
END
```

### Performance Tracking

Track operation performance:

```typescript
const startTime = Date.now();
await performDatabaseQuery();
const duration = Date.now() - startTime;

enhancedLogger.logPerformance(
  { requestId, component: 'database' },
  'complex_query',
  duration,
  { rows: 1500, cached: false }
);
```

**Axiom Query:**
```sql
-- Slowest operations (95th percentile)
SELECT operation,
       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95_ms
FROM logs
WHERE component = 'performance'
GROUP BY operation
ORDER BY p95_ms DESC
```

## Axiom Setup

### 1. Create Axiom Account

1. Go to https://app.axiom.co/
2. Sign up for a free account (1GB/month free)
3. Create a new dataset (e.g., `alembic-logs`)

### 2. Get Credentials

1. Go to Settings → API Tokens
2. Create a new token with "Ingest" permission
3. Copy your token and org ID

### 3. Configure Environment Variables

Add to your `.env` file (production only):

```bash
# Axiom Configuration
AXIOM_TOKEN=xaat-your-token-here
AXIOM_ORG_ID=your-org-id
AXIOM_DATASET=alembic-logs

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

### 4. Deploy

Deploy your application. Logs will now be sent to both:
- **Local**: JSON logs (standard pino output)
- **Axiom**: Cloud dashboard with search and analytics

## Querying Logs

### Common Queries

#### Find All Logs for a Request
```sql
SELECT * FROM logs
WHERE requestId = 'your-request-id'
ORDER BY timestamp ASC
```

#### Error Rate Over Time
```sql
SELECT bin(timestamp, 1h) as hour,
       COUNT(*) as total,
       SUM(CASE WHEN level = 'error' THEN 1 ELSE 0 END) as errors,
       (SUM(CASE WHEN level = 'error' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as error_rate
FROM logs
GROUP BY hour
ORDER BY hour DESC
```

#### Most Expensive Requests
```sql
SELECT requestId,
       SUM(cost) as total_cost,
       COUNT(*) as model_calls,
       MAX(timestamp) as last_seen
FROM logs
WHERE cost IS NOT NULL
GROUP BY requestId
ORDER BY total_cost DESC
LIMIT 10
```

#### Average Chain Performance
```sql
SELECT stage,
       AVG(duration) as avg_ms,
       MIN(duration) as min_ms,
       MAX(duration) as max_ms,
       COUNT(*) as executions
FROM logs
WHERE component = 'chain' AND stage IS NOT NULL
GROUP BY stage
```

#### Security Events Timeline
```sql
SELECT bin(timestamp, 5m) as time_window,
       severity,
       COUNT(*) as count
FROM logs
WHERE component = 'security'
GROUP BY time_window, severity
ORDER BY time_window DESC
```

## Dashboard Examples

### 1. Cost Monitoring Dashboard

Create a dashboard with:

**Total Cost (Last 24h)**
```sql
SELECT SUM(cost) as total FROM logs
WHERE timestamp > ago(24h) AND cost IS NOT NULL
```

**Cost by Model**
```sql
SELECT model, SUM(cost) as cost
FROM logs
WHERE timestamp > ago(24h) AND cost IS NOT NULL
GROUP BY model
```

**Cost Over Time**
```sql
SELECT bin(timestamp, 1h) as hour, SUM(cost) as cost
FROM logs
WHERE timestamp > ago(24h) AND cost IS NOT NULL
GROUP BY hour
ORDER BY hour
```

### 2. Performance Dashboard

**P50/P95/P99 Latency**
```sql
SELECT operation,
       PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration) as p50,
       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95,
       PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration) as p99
FROM logs
WHERE component = 'performance'
GROUP BY operation
```

**Throughput Over Time**
```sql
SELECT bin(timestamp, 1m) as minute, COUNT(*) as requests
FROM logs
WHERE component = 'api'
GROUP BY minute
ORDER BY minute DESC
```

### 3. Error Tracking Dashboard

**Recent Errors**
```sql
SELECT timestamp, message, error, component, requestId
FROM logs
WHERE level = 'error'
ORDER BY timestamp DESC
LIMIT 50
```

**Error Distribution**
```sql
SELECT component, COUNT(*) as count
FROM logs
WHERE level = 'error' AND timestamp > ago(24h)
GROUP BY component
ORDER BY count DESC
```

## Best Practices

### 1. Always Use Request IDs

```typescript
// ✅ Good - correlatable
const log = enhancedLogger.child({ requestId: generateRequestId() });
log.info({}, 'Processing started');
log.info({}, 'Processing complete');

// ❌ Bad - can't correlate related logs
enhancedLogger.info({}, 'Processing started');
enhancedLogger.info({}, 'Processing complete');
```

### 2. Use Components to Organize

```typescript
// ✅ Good - easy to filter in Axiom
const log = enhancedLogger.child({ requestId, component: 'chain' });
log.logChainStage(...);

// ❌ Bad - hard to find related logs
enhancedLogger.logChainStage({ requestId }, ...);
```

### 3. Log Structured Data

```typescript
// ✅ Good - queryable fields
log.info({}, 'User action', {
  userId: '123',
  action: 'chat',
  model: 'claude-3-5-sonnet',
  duration: 1234,
});

// ❌ Bad - can't query
log.info({}, 'User 123 performed chat using claude-3-5-sonnet in 1234ms');
```

### 4. Use Specialized Methods

```typescript
// ✅ Good - standardized format
log.logCost({ requestId }, {
  model: 'claude-3-5-sonnet',
  inputTokens: 1000,
  outputTokens: 500,
  cost: 0.0234,
  requestType: 'chat',
});

// ❌ Bad - inconsistent format
log.info({ requestId }, 'Model cost', {
  m: 'claude-3-5-sonnet',
  in: 1000,
  out: 500,
  $: 0.0234,
});
```

### 5. Don't Log Sensitive Data

```typescript
// ✅ Good - sanitized
log.info({}, 'User login', {
  userId: user.id,
  email: user.email.replace(/(?<=.{2}).(?=[^@]*?@)/g, '*'),
});

// ❌ Bad - contains passwords
log.info({}, 'Login attempt', {
  username: req.body.username,
  password: req.body.password, // Never log passwords!
});
```

### 6. Flush on Shutdown

```typescript
// In your application shutdown handler
process.on('SIGTERM', async () => {
  await enhancedLogger.flush();
  await server.close();
  process.exit(0);
});
```

## Troubleshooting

### Logs Not Appearing in Axiom

1. **Check environment variables:**
   ```bash
   echo $NODE_ENV  # Should be 'production'
   echo $AXIOM_TOKEN  # Should be set
   echo $AXIOM_DATASET  # Should be set
   ```

2. **Check logger status:**
   ```typescript
   console.log(enhancedLogger.isAxiomEnabled());  // Should be true
   ```

3. **Check Axiom dashboard:**
   - Go to your dataset in Axiom
   - Check for ingestion errors
   - Verify dataset name matches env variable

### Logs Being Dropped

If you see warnings about failed Axiom flushes:

1. **Check network connectivity** to Axiom
2. **Verify API token permissions** (needs "Ingest")
3. **Check rate limits** (free tier: 1GB/month)
4. **Increase flush interval** if hitting rate limits

### Performance Impact

The Enhanced Logger is designed for minimal performance impact:

- **Development**: Zero overhead (Axiom disabled)
- **Production**: Async batching (5s flush interval)
- **Auto-flush**: After 100 events (prevents memory bloat)

If you experience issues:
- Logs are buffered in memory (negligible impact)
- Failed Axiom ingests don't block execution
- Local pino logging is unaffected

## Migration Checklist

- [ ] Review this migration guide
- [ ] Set up Axiom account and dataset
- [ ] Add environment variables to production
- [ ] Update imports to use `enhancedLogger`
- [ ] Add request ID generation
- [ ] Create child loggers with context
- [ ] Replace specialized logging (costs, chains, security)
- [ ] Test in development (local pino only)
- [ ] Deploy to staging
- [ ] Verify logs in Axiom dashboard
- [ ] Create Axiom dashboards for monitoring
- [ ] Set up alerts for critical errors
- [ ] Deploy to production

## Support

For questions or issues:

1. **Axiom Documentation**: https://axiom.co/docs
2. **Pino Documentation**: https://getpino.io/
3. **Project Issues**: Create a GitHub issue

## Example: Full Request Handler

Here's a complete example showing the recommended pattern:

```typescript
import { enhancedLogger } from '~/lib/logging';
import { generateRequestId } from '~/lib/utils';

export async function chatHandler(req: Request, res: Response) {
  const requestId = generateRequestId();
  const log = enhancedLogger.child({
    requestId,
    sessionId: req.session.id,
    component: 'chat',
  });

  log.info({}, 'Chat request started', {
    model: req.body.model,
    messageLength: req.body.message.length,
  });

  try {
    // Analyze stage
    const analyzeStart = Date.now();
    const analysis = await analyzeQuery(req.body.message);
    log.logChainStage({
      stage: 'analyze',
      duration: Date.now() - analyzeStart,
      cost: 0.0001,
      model: 'deepseek/deepseek-chat',
      success: true,
    });

    // Execute stage
    const executeStart = Date.now();
    const response = await executeQuery(analysis);
    const executeDuration = Date.now() - executeStart;

    log.logChainStage({
      stage: 'execute',
      duration: executeDuration,
      cost: response.cost,
      model: response.model,
      success: true,
    });

    log.logCost({ requestId }, {
      model: response.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      cost: response.cost,
      requestType: 'chat',
    });

    log.info({}, 'Chat request completed', {
      totalDuration: Date.now() - requestId.timestamp,
      success: true,
    });

    return res.json(response);
  } catch (error) {
    log.error({}, 'Chat request failed', error, {
      stage: 'execute',
    });

    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

This pattern provides:
- ✅ Request correlation via requestId
- ✅ Structured context (component, sessionId)
- ✅ Chain stage tracking
- ✅ Cost tracking
- ✅ Performance metrics
- ✅ Error handling
- ✅ All logs queryable in Axiom
