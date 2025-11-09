# Authentication System

Production-ready API key authentication with IP whitelisting for the AI Workflow Engine.

## Overview

The authentication system provides two-tier access control:

- **Demo Mode** (Vercel): No authentication required - public access for demos
- **Production Mode** (Digital Ocean/VPS): API key + IP whitelist required

## Architecture

```
Request → IP Whitelist Check → API Key Validation → tRPC Procedure
```

### Components

1. **User & ApiKey Tables** (Prisma schema)
   - Users own API keys
   - Keys are hashed (SHA-256) for secure storage
   - Per-key IP whitelists
   - Expiration dates and usage tracking

2. **ApiKeyService** (`src/server/services/auth/ApiKeyService.ts`)
   - Generate secure API keys
   - Validate keys with IP checks
   - Track usage timestamps
   - Revoke/delete keys

3. **tRPC Middleware** (`src/server/trpc.ts`)
   - `publicProcedure` - No auth required (monitoring, health checks)
   - `protectedProcedure` - Requires API key + IP whitelist

4. **Admin Scripts**
   - `npm run generate-api-key` - Create new keys
   - `npm run list-api-keys` - View all keys
   - `npm run revoke-api-key` - Revoke a key

## Configuration

### Environment Variables

```bash
# Enable/disable authentication
REQUIRE_AUTH=true

# Global IP whitelist (comma-separated)
IP_WHITELIST=192.168.1.1,203.0.113.0

# Admin email for first user
ADMIN_EMAIL=admin@example.com
```

### Demo Mode (Vercel)

```bash
REQUIRE_AUTH=false  # or omit entirely
```

All endpoints work without authentication.

### Production Mode (Digital Ocean/VPS)

```bash
REQUIRE_AUTH=true
IP_WHITELIST=your.home.ip,your.office.ip
```

All protected endpoints require `Authorization: Bearer <key>` header.

## Usage

### Generating API Keys

```bash
# Basic key (never expires)
npm run generate-api-key

# Named key with expiration
npm run generate-api-key -- --name "LibreChat Production" --expires 365

# Key with IP whitelist (overrides global)
npm run generate-api-key -- --name "Home Access" --ip "192.168.1.100"
```

**Output:**
```
✅ API Key Generated Successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  sk_3ff143cc67dfa404986cc34bec5a8d7b1682c9fa0d7383216d99a6f3cb261aa3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  IMPORTANT: Save this key securely! It will not be shown again.
```

### Making Authenticated Requests

#### cURL

```bash
curl -H "Authorization: Bearer sk_xxx..." \
  http://localhost:3000/api/trpc/conversations.list
```

#### Python

```python
import requests

headers = {
    "Authorization": "Bearer sk_xxx...",
    "Content-Type": "application/json"
}

response = requests.get(
    "http://localhost:3000/api/trpc/conversations.list",
    headers=headers
)
```

#### LibreChat Configuration

```yaml
# .env for LibreChat
AI_WORKFLOW_ENGINE_URL=https://your-domain.com
AI_WORKFLOW_ENGINE_API_KEY=sk_xxx...
```

#### Open WebUI Configuration

```yaml
# Environment variables for Open WebUI
EXTERNAL_API_URL=https://your-domain.com
EXTERNAL_API_KEY=sk_xxx...
```

### Managing API Keys

**List all keys:**
```bash
npm run list-api-keys
```

**Revoke a key:**
```bash
npm run revoke-api-key -- <key-id>
```

## Protected Endpoints

The following routers require authentication when `REQUIRE_AUTH=true`:

- ✅ **chat** - All chat operations
- ✅ **conversations** - CRUD operations
- ✅ **messages** - Message operations
- ✅ **projects** - Project & document management
- ✅ **usage** - Usage tracking
- ✅ **export** - Export operations
- ✅ **subscriptions** - WebSocket streaming
- ✅ **auth** - Auth test endpoints

## Public Endpoints

These endpoints remain public (no auth required):

- ✅ **monitoring** - Health checks and monitoring
- ✅ **auth.public** - Public test endpoint

## Security Features

### API Key Security

- Keys are hashed with SHA-256 before storage
- Plaintext keys shown only once during generation
- Keys prefixed with `sk_` for easy identification
- 32-byte random generation (64 hex characters)

### IP Whitelisting

Two levels of IP control:

1. **Global whitelist** (`IP_WHITELIST` env var)
   - Applies to all API keys by default
   - Leave empty to allow all IPs

2. **Per-key whitelist** (during key generation)
   - Overrides global whitelist
   - Useful for restricting specific keys to specific locations

### Request Validation

All requests are validated for:

1. **IP address** - Must be in whitelist (if configured)
2. **API key presence** - Must include `Authorization` header
3. **API key validity** - Must exist in database
4. **Expiration** - Must not be expired
5. **Rate limiting** - Enforced separately

## Testing

### Test Authentication Endpoints

```bash
# Public endpoint (should work without auth)
curl http://localhost:3000/api/trpc/auth.public

# Protected endpoint (should fail without auth when REQUIRE_AUTH=true)
curl http://localhost:3000/api/trpc/auth.protected

# Protected endpoint with auth (should succeed)
curl -H "Authorization: Bearer sk_xxx..." \
  http://localhost:3000/api/trpc/auth.protected

# Get current user info
curl -H "Authorization: Bearer sk_xxx..." \
  http://localhost:3000/api/trpc/auth.whoami
```

## Deployment Checklist

### Production Deployment

- [ ] Set `REQUIRE_AUTH=true`
- [ ] Configure `IP_WHITELIST` with your IPs
- [ ] Generate production API keys
- [ ] Test API key access
- [ ] Verify IP whitelist is working
- [ ] Configure LibreChat/Open WebUI with API key
- [ ] Set up monitoring alerts

### Demo Deployment (Vercel)

- [ ] Ensure `REQUIRE_AUTH` is not set or set to `false`
- [ ] Deploy without API key requirements
- [ ] Test public access works

## Troubleshooting

### "API key required" error

**Cause:** `REQUIRE_AUTH=true` but no API key provided

**Solution:** Include `Authorization: Bearer <key>` header

### "IP not whitelisted" error

**Cause:** Request IP not in whitelist

**Solutions:**
- Add IP to `IP_WHITELIST` env var
- Generate a new key with specific IP whitelist
- Remove IP whitelist (set `IP_WHITELIST=""` to allow all)

### "Invalid API key" error

**Causes:**
- Key doesn't exist in database
- Key has been revoked
- Typo in key

**Solution:** Verify key with `npm run list-api-keys`

### "API key expired" error

**Cause:** Key expiration date passed

**Solution:** Generate a new key

## Database Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String?  @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  projects  Project[]
  apiKeys   ApiKey[]
}

model ApiKey {
  id          String    @id @default(cuid())
  userId      String
  name        String
  keyHash     String    @unique
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  createdAt   DateTime  @default(now())
  ipWhitelist String[]  @default([])
  scopes      String[]  @default(["*"])
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Future Enhancements

- [ ] API key scopes for fine-grained permissions
- [ ] Rate limiting per API key
- [ ] API key usage analytics
- [ ] OAuth provider support
- [ ] JWT token support for web UI
- [ ] API key rotation
- [ ] Audit logging for key usage
