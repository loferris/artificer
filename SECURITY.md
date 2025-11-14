# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| dev     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue for security vulnerabilities
2. Email security concerns to the project maintainer
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes

---

# Deployment Security Considerations

This section outlines security considerations for different deployment scenarios of the AI Workflow Engine.

## Demo Deployment (Safe for Public Access)

The demo deployment uses in-memory storage with no persistent data or real API calls.

### Configuration
```env
DEMO_MODE=true
OPENROUTER_API_KEY=fake_key_or_empty
# No DATABASE_URL needed
```

### Security Properties
- ✅ **No data persistence** - All data resets on restart
- ✅ **No real API costs** - OpenRouter calls are mocked
- ✅ **No database access** - Operates entirely in memory
- ✅ **Limited impact** - Attackers can only create temporary in-memory data

### Suitable For
- Public demos
- Documentation/showcase sites
- Development testing
- Proof of concepts

---

## Production Deployment - Next.js App (Requires Database Auth)

The standard Next.js application with database connection.

### Configuration
```env
DEMO_MODE=false
DATABASE_URL=postgresql://user:password@host:5432/dbname
OPENROUTER_API_KEY=your_real_api_key
```

### Security Considerations
- ⚠️ **Database credentials** - Keep DATABASE_URL secret
- ⚠️ **API key protection** - OPENROUTER_API_KEY must be secret
- ⚠️ **Rate limiting** - Built-in, but session-based (can be bypassed)
- ⚠️ **CORS** - Configure allowed origins

### Recommendations
1. **Environment Variables**: Never commit real keys to git
2. **Database Security**: Use connection pooling, SSL required
3. **User Authentication**: Implement when multi-user support is added
4. **Monitoring**: Set up alerts for unusual activity

---

## Production Deployment - Standalone Server (⚠️ REQUIRES AUTHENTICATION)

The standalone orchestration server exposed for external applications (e.g., Python backends).

### ⚠️ Critical Security Requirements

**DO NOT deploy the standalone server to production without authentication.**

The standalone server currently has:
- ❌ No authentication
- ❌ No authorization
- ❌ No user identity
- ✅ Basic rate limiting (bypassable)

### Risk Level by Deployment Type

| Deployment | Risk | Mitigation Required |
|------------|------|---------------------|
| `localhost` only (Python app on same machine) | ✅ Low | None - not network-accessible |
| Internal network (trusted) | ⚠️ Medium | API key authentication |
| Public internet | 🚨 **Critical** | **DO NOT DEPLOY** without auth |

### Minimum Required Security

Before deploying standalone server to any network:

#### 1. API Key Authentication (Minimum)

Add API key validation to the standalone server:

```typescript
// src/server/standalone.ts
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error('API_KEY must be set for standalone server');
}

// In middleware
const providedKey = req.headers['x-api-key'];
if (providedKey !== API_KEY) {
  res.writeHead(401);
  res.end(JSON.stringify({ error: 'Unauthorized' }));
  return;
}
```

Python client:
```python
client = AIWorkflowClient(
    "http://your-server:3001",
    api_key="your-secret-key"
)
```

#### 2. Environment Configuration

```env
# Required
API_KEY=generate_a_strong_random_key_here
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=your_real_key

# Optional but recommended
STANDALONE_PORT=3001
STANDALONE_HOST=127.0.0.1  # localhost only, or 0.0.0.0 for network
CORS_ORIGIN=https://your-python-app.com  # Restrict CORS
```

#### 3. Network Security

**Option A: Localhost Only (Safest)**
```env
STANDALONE_HOST=127.0.0.1  # Only accessible from same machine
```

**Option B: IP Allowlisting**
- Use firewall rules to allow only specific IPs
- Configure cloud provider security groups

**Option C: VPN/Private Network**
- Deploy on internal network
- Use VPN for external access

#### 4. Rate Limiting Improvements

Current rate limiting is session-based. For production, add:
- IP-based rate limiting
- API key-based rate limiting
- Per-endpoint limits

### Recommended Production Architecture

```
┌─────────────────────┐
│   Python Backend    │
│  (Your App)         │
└──────────┬──────────┘
           │ HTTP + API Key
           │ (Internal Network/VPN)
           │
┌──────────▼──────────┐
│  Standalone Server  │
│  + API Key Auth     │
│  + Rate Limiting    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    PostgreSQL       │
│  (Credentials)      │
└─────────────────────┘
```

### Future Authentication Options

For multi-tenant or complex deployments, consider:

**JWT Tokens (Recommended for SaaS)**
```typescript
import jwt from 'jsonwebtoken';

const token = req.headers['authorization']?.replace('Bearer ', '');
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

**OAuth 2.0**
- For third-party integrations
- Standard authentication flow

**mTLS (Mutual TLS)**
- Certificate-based authentication
- Most secure for service-to-service

---

## Secrets Management

### What to Keep Secret
- ✅ `OPENROUTER_API_KEY` - API costs
- ✅ `DATABASE_URL` - Database access
- ✅ `API_KEY` - Standalone server access
- ✅ `JWT_SECRET` - If using JWT

### What's Safe to Share
- ✅ `DEMO_MODE=true` - Public knowledge
- ✅ Port numbers (3000, 3001)
- ✅ Model names (deepseek-chat)

### Where to Store Secrets

**Development:**
- `.env.local` file (gitignored)
- Never commit to git

**Production:**
- Environment variables in deployment platform
- Secret management services (AWS Secrets Manager, HashiCorp Vault)
- Never in code or config files

---

## Security Checklist

### Before Deploying Demo
- [ ] `DEMO_MODE=true` is set
- [ ] No real API keys in environment
- [ ] Verify data doesn't persist

### Before Deploying Production (Next.js)
- [ ] All secrets in environment variables
- [ ] DATABASE_URL uses SSL
- [ ] CORS origins configured
- [ ] Rate limiting tested
- [ ] Monitoring/alerts set up

### Before Deploying Standalone Server
- [ ] **API key authentication implemented**
- [ ] Network security configured (localhost/VPN/firewall)
- [ ] CORS origins restricted
- [ ] Rate limiting per API key
- [ ] Database credentials secured
- [ ] Monitoring/logging enabled
- [ ] Test authentication works
- [ ] Test unauthorized access fails

---

## Incident Response

If you suspect unauthorized access:

1. **Immediate Actions**
   - Rotate API keys (OpenRouter, database, API key)
   - Review access logs
   - Temporarily disable public access

2. **Investigation**
   - Check database for unauthorized changes
   - Review OpenRouter usage/costs
   - Analyze server logs

3. **Prevention**
   - Add authentication if missing
   - Improve rate limiting
   - Add monitoring/alerts

---

## Questions?

**Is demo mode safe for public?**
Yes - no real costs, no persistent data.

**Can I run standalone server without auth?**
Only if it's on localhost and not network-accessible.

**What's the minimum auth for production standalone?**
API key authentication (30 minutes to implement).

**Do I need auth for the Next.js app?**
Not urgently for single-user deployments, but recommended for multi-user.

---

# General Security Best Practices

## API Security
- Rate limiting applied to all endpoints
- Session-based authentication for single-user deployment
- Input validation on all user-provided data
- SQL injection protection via Prisma ORM

## Data Protection
- Conversation data stored locally in your database
- No data sent to third parties except chosen AI model providers
- Environment variables properly isolated
- Exported conversations excluded from version control

## Streaming Security
- WebSocket connections include rate limiting
- SSE endpoints validate input and apply CORS properly
- All streaming includes proper error handling and cleanup

## Development Security
- Dependencies regularly updated
- TypeScript strict mode enabled
- Linting rules enforce security best practices
- Test coverage for security-relevant code paths

## Network Security for Production
- Use HTTPS in production
- Configure proper CORS policies
- Implement reverse proxy for additional security
- Monitor for unusual traffic patterns

## Dependency Security
```bash
npm audit                    # Check for vulnerabilities
npm audit fix               # Fix automatically fixable issues
```

---

# Responsible Disclosure

We appreciate security researchers who responsibly disclose vulnerabilities. We commit to:

1. Acknowledging receipt of vulnerability reports within 48 hours
2. Providing regular updates on remediation progress
3. Crediting researchers (unless they prefer to remain anonymous)
4. Fixing confirmed vulnerabilities in a timely manner

## Security Updates

Security updates will be:
- Released as soon as possible after confirmation
- Clearly marked in release notes
- Documented in CHANGELOG.md
- Announced in project communications

---

Thank you for helping keep this project secure!

**Last Updated:** November 2025
