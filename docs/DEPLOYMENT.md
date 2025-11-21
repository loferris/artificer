# Deployment Guide

This document outlines deployment requirements and potential hosting options. **Note:** Specific platform configurations have not been fully tested - contributions and feedback welcome.

---

## Requirements

### Minimum Requirements
- **Node.js** 18.x or higher
- **PostgreSQL** 14.x or higher
- **Environment variables** configured (see below)

### Optional (for RAG features)
- **Chroma** vector database instance
- **OpenAI API key** for embeddings

---

## Environment Variables

### Required
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
OPENROUTER_API_KEY=sk-or-...
```

### Optional - RAG Features
```bash
CHROMA_URL=http://localhost:8000
OPENAI_API_KEY=sk-...
ENABLE_RAG=true
```

### Optional - Authentication
```bash
REQUIRE_AUTH=true
IP_WHITELIST=1.2.3.4,5.6.7.8
```

### Optional - Demo Mode
```bash
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
```

---

## Deployment Options

### Self-Hosted / VPS

Best for full control and WebSocket support.

**Platforms:** DigitalOcean, Linode, AWS EC2, any VPS

**Pros:**
- Full WebSocket support for real-time streaming
- No function timeout limits
- Complete control over infrastructure

**Cons:**
- Requires server management
- Manual SSL/scaling setup

**General steps:**
1. Provision server with Node.js 18+
2. Set up PostgreSQL database
3. Clone repository and install dependencies
4. Configure environment variables
5. Run `npx prisma migrate deploy`
6. Build with `npm run build`
7. Start with `npm start` or use PM2/systemd

### Platform-as-a-Service

Easier deployment with managed infrastructure.

**Potential platforms:** Railway, Render, Fly.io

**Pros:**
- Managed infrastructure
- Easy database provisioning
- Automatic SSL

**Cons:**
- May have timeout limits for long requests
- WebSocket support varies by platform
- Costs can scale with usage

**General steps:**
1. Connect repository to platform
2. Provision PostgreSQL add-on
3. Configure environment variables
4. Deploy (most platforms auto-detect Next.js)

### Serverless Platforms

**Potential platforms:** Vercel, Netlify

**Considerations:**
- WebSocket connections typically not supported (app falls back to SSE)
- Function timeout limits (10-60s depending on plan)
- Stateless execution model
- May require Edge runtime for some features

**If using serverless:**
- Streaming responses are already implemented
- Document storage uses PostgreSQL (not filesystem)
- Consider external services for Chroma

---

## Database Setup

### Local Development
```bash
# Start PostgreSQL with Docker
npm run db:up

# Run migrations
npm run db:migrate

# Optional: Seed with sample data
npm run db:seed
```

### Production
1. Provision PostgreSQL instance from your hosting provider
2. Get connection string (DATABASE_URL)
3. Run migrations: `npx prisma migrate deploy`

### Chroma (Optional, for RAG)
- Self-host Chroma or use a hosted service
- Set `CHROMA_URL` environment variable
- Requires `OPENAI_API_KEY` for embeddings

---

## Build & Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build for production
npm run build

# Start production server
npm start
```

The app runs on port 3000 by default. Configure with `PORT` environment variable.

---

## Standalone Orchestration Server

For headless API-only deployment:

```bash
# Production mode
npm run start:standalone
```

Runs on port 3001 by default. See `docs/STANDALONE_API.md` for details.

---

## Health Checks

- **Main app:** `GET /api/health`
- **Standalone:** `GET /health`

Both return JSON with service status.

---

## Troubleshooting

### Build fails with Prisma errors
Ensure `postinstall` script runs `prisma generate`. Check that `DATABASE_URL` is accessible during build.

### WebSocket connections fail
Platform may not support WebSockets. The app will fall back to SSE streaming automatically.

### Long requests timeout
Streaming is already implemented. If still timing out, check platform limits and consider self-hosting for unlimited execution time.

### RAG not returning sources
1. Verify `ENABLE_RAG=true`
2. Check Chroma is accessible at `CHROMA_URL`
3. Verify `OPENAI_API_KEY` is set for embeddings

---

## Contributing

If you successfully deploy to a specific platform, consider contributing:
- Platform-specific configuration files
- Deployment scripts or guides
- Documentation updates

File issues or PRs at the project repository.
