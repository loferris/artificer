# Python Service Fallback Strategy

## Overview

Artificer uses a **hybrid architecture** with automatic fallback between Python and TypeScript implementations:

- **Python** (primary): 10-20x faster for PDF/image processing
- **TypeScript** (fallback): Reliable backup when Python unavailable

## Architecture

```
Request → Check Python Available?
            ├─ Yes → Try Python (fast path)
            │          └─ Success → Return result
            │          └─ Failure → Fall through to TypeScript
            └─ No → Use TypeScript directly
```

## Fallback Triggers

Python is automatically bypassed when:

1. **Manual override**: `FORCE_TYPESCRIPT_MODE=true` environment variable
2. **Service down**: Python health check failed
3. **Circuit breaker open**: 5+ consecutive failures detected
4. **Timeout**: Request exceeds configured timeout (default: 30s)

## Circuit Breaker Protection

The circuit breaker prevents cascading failures:

### States

- **CLOSED**: Normal operation (Python requests pass through)
- **OPEN**: Service failing (requests fail fast, skip Python)
- **HALF_OPEN**: Testing recovery (allows test requests through)

### Configuration

```typescript
{
  failureThreshold: 5,      // Open after 5 failures
  successThreshold: 2,      // Close after 2 successes in half-open
  timeout: 60000,           // Try again after 60s
}
```

### State Transitions

```
CLOSED
  └─> 5 failures → OPEN
                    └─> 60s timeout → HALF_OPEN
                                        └─> 2 successes → CLOSED
                                        └─> 1 failure → OPEN
```

## Health Checks

### Periodic Monitoring

- Health check every 30 seconds
- Logs only state changes (not every failure)
- Auto-recovery when Python comes back online

### Availability Check

```typescript
pythonOCRClient.isAvailable()
// Returns true only if:
// - Not manually disabled (FORCE_TYPESCRIPT_MODE != true)
// - Service responding to health checks
// - Circuit breaker not OPEN
```

## Configuration

### Environment Variables

```bash
# Python service URL
PYTHON_OCR_URL=http://localhost:8000

# Request timeout in milliseconds
PYTHON_TIMEOUT_MS=30000

# Force TypeScript-only mode (disables Python)
FORCE_TYPESCRIPT_MODE=false
```

### Testing Fallback

```bash
# Test TypeScript-only mode
FORCE_TYPESCRIPT_MODE=true npm run dev

# Simulate Python service down
docker stop artificer-python-service

# Check service status
curl http://localhost:3000/api/trpc/monitoring.getPythonServiceStats
```

## Performance Comparison

| Operation | Python | TypeScript | Speedup |
|-----------|--------|------------|---------|
| PDF Extract (10pg) | 5-20ms | 100-200ms | 10-20x |
| PDF to Images | 50-100ms | 500-1000ms | 5-10x |
| Image OCR (OpenAI) | 2-5s | 3-8s | 1.5-2x |
| Markdown Convert | 10ms | 25ms | 2-3x |

*Note: OCR is similar speed because both use OpenAI API (network-bound)*

## Monitoring

### tRPC Endpoint

```typescript
// Get Python service statistics
const stats = await trpc.monitoring.getPythonServiceStats.query();

console.log(stats);
// {
//   ocr: {
//     available: true,
//     forceDisabled: false,
//     baseUrl: "http://localhost:8000",
//     circuitBreaker: {
//       state: "CLOSED",
//       failureCount: 0,
//       ...
//     }
//   },
//   conversion: { ... },
//   text: { ... },
//   summary: {
//     allAvailable: true,
//     anyCircuitOpen: false,
//     forceDisabled: false
//   }
// }
```

### Log Messages

**Normal operation:**
```
Python OCR service is available
Using Python OCR service for PDF processing
PDF processed by Python service
```

**Fallback scenarios:**
```
Python service failed, falling back to TypeScript
Python service not available, using TypeScript
Circuit breaker opened (failure threshold exceeded)
```

**Recovery:**
```
Python OCR service recovered
Circuit breaker closed (service recovered)
```

## Error Handling

### Enhanced Error Messages

Errors now include detailed context:

```typescript
// Old (vague)
Error: Python OCR service not available

// New (detailed)
Error: Python OCR service unavailable: circuit breaker is OPEN
// Context logged:
// - pdfSize: 1234567
// - pythonUrl: http://localhost:8000/api/pdf/extract
// - timeout: 30000
// - circuitState: OPEN
```

### Fallback Success

```typescript
try {
  // Try Python
  result = await pythonOCRClient.extractPdfText(buffer);
} catch (error) {
  logger.warn('Python service failed, falling back to TypeScript', {
    error: error.message,
    circuitState: 'OPEN',
    pdfSize: buffer.length
  });

  // Automatic fallback to TypeScript
  result = await pdfExtractor.extractText(buffer);
}
```

## Best Practices

### 1. Monitor Circuit Breaker State

```typescript
// Dashboard should show circuit breaker status
setInterval(async () => {
  const stats = await trpc.monitoring.getPythonServiceStats.query();

  if (stats.summary.anyCircuitOpen) {
    console.warn('⚠️ Python service circuit breaker is OPEN');
  }
}, 60000); // Check every minute
```

### 2. Alert on Extended Outages

```typescript
// Alert if Python down for > 5 minutes
if (stats.ocr.circuitBreaker.state === 'OPEN') {
  const timeSinceFailure = Date.now() - stats.ocr.circuitBreaker.lastFailureTime;

  if (timeSinceFailure > 300000) { // 5 minutes
    sendAlert('Python service has been down for 5+ minutes');
  }
}
```

### 3. Use Force Mode for Testing

```bash
# Always test TypeScript path before deploying
FORCE_TYPESCRIPT_MODE=true npm run test

# Verify both paths work
npm run test:integration
```

### 4. Log Performance Comparisons

```typescript
logger.info('PDF processed', {
  backend: 'python', // or 'typescript'
  processingTime: 15,
  pdfSize: 1234567,
  speedup: typescriptTime / pythonTime // Log speedup ratio
});
```

## Troubleshooting

### Python service not recovering

**Check:**
1. Is Python service actually running? `docker ps`
2. Health endpoint accessible? `curl http://localhost:8000/health`
3. Circuit breaker state? Check monitoring endpoint
4. Manual reset: Restart Node.js server

### Constant fallback to TypeScript

**Possible causes:**
1. `FORCE_TYPESCRIPT_MODE=true` set
2. Python service URL wrong
3. Network issue (firewall, port)
4. Python service crashing on requests

**Debug:**
```bash
# Check environment
echo $FORCE_TYPESCRIPT_MODE
echo $PYTHON_OCR_URL

# Test Python directly
curl -X POST http://localhost:8000/health

# Check logs
docker logs artificer-python-service

# Monitor circuit breaker
curl http://localhost:3000/api/trpc/monitoring.getPythonServiceStats
```

### Performance not improving

**Verify Python is being used:**
```typescript
// Check logs for:
"Using Python OCR service for PDF processing"
// vs
"Using TypeScript PDF extraction (fallback)"
```

If seeing fallback messages, Python isn't being used.

## Recovery Procedures

### Manual Reset

```typescript
// Reset circuit breaker manually
import { circuitBreakerRegistry } from '@/server/utils/CircuitBreaker';

circuitBreakerRegistry.resetAll();
```

### Gradual Recovery

1. Fix Python service
2. Wait 60s for circuit breaker timeout
3. Circuit enters HALF_OPEN state
4. 2 successful requests → Circuit closes
5. Back to normal operation

### Force Recovery

```bash
# Restart Node.js server (clears circuit breaker state)
npm run dev

# Or use TypeScript mode temporarily
FORCE_TYPESCRIPT_MODE=true npm run dev
```

## Future Improvements

- [ ] Add retry with exponential backoff
- [ ] Per-operation timeout configuration
- [ ] Request queuing during failures
- [ ] Performance comparison dashboard
- [ ] Automated fallback testing in CI
- [ ] Cost tracking (Python vs TypeScript)
- [ ] A/B testing framework
