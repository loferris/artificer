/**
 * Seed script for vector database testing
 *
 * Creates sample projects and documents to test semantic search
 */

import { PrismaClient } from '@prisma/client';
import { VectorService, ChunkingService, EmbeddingService } from '../src/server/services/vector';

const prisma = new PrismaClient();

const sampleDocuments = [
  {
    filename: 'authentication-guide.md',
    content: `# Authentication Guide

## Overview
This guide covers authentication and authorization in the AI Workflow Engine.

## Setup
1. Configure NextAuth in your .env file
2. Add NEXTAUTH_SECRET and NEXTAUTH_URL
3. Set up your authentication providers (Google, GitHub, etc.)

## Session Management
Sessions are managed using NextAuth.js with JWT tokens. The session data includes:
- User ID
- Email
- Authentication provider
- Expiration timestamp

## API Authentication
All API endpoints require authentication via session cookies or API keys.
Use the authorization header: Authorization: Bearer <api-key>

## Best Practices
- Always use HTTPS in production
- Rotate API keys regularly
- Implement rate limiting
- Use strong password policies`,
  },
  {
    filename: 'vector-database-setup.md',
    content: `# Vector Database Configuration

## Chroma Setup
Chroma is used for storing document embeddings and semantic search.

### Installation
1. Start Chroma with docker-compose
2. Configure CHROMA_URL in .env
3. Add OpenAI API key for embeddings

### Usage
Documents are automatically indexed when uploaded to projects.
The system uses text-embedding-3-small model with 1536 dimensions.

### Search API
Use the search.searchDocuments endpoint to perform semantic queries.
Results are ranked by similarity score (0-1).

### Performance
- Handles millions of vectors
- Sub-200ms query latency
- Automatic chunking with 1000 char segments`,
  },
  {
    filename: 'api-reference.md',
    content: `# API Reference

## tRPC Endpoints

### Chat
- chat.sendMessage: Send a message and get AI response
- chat.streamMessage: Stream AI responses in real-time

### Projects
- projects.create: Create a new project
- projects.list: List all projects
- projects.addDocument: Upload a document to a project
- projects.searchDocuments: Search within project documents

### Search
- search.searchDocuments: Semantic search across documents
- search.getEmbeddingStats: Get indexing statistics
- search.reindexDocument: Regenerate embeddings

### Conversations
- conversations.create: Start a new conversation
- conversations.list: List all conversations
- conversations.delete: Delete a conversation

## Authentication
All endpoints require valid session or API key.
Rate limits apply per endpoint type.`,
  },
  {
    filename: 'deployment-guide.md',
    content: `# Deployment Guide

## Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set up PostgreSQL database (Neon, Supabase, or Railway)
4. Deploy with automatic CI/CD

## Docker Deployment
Use the provided docker-compose.yml for self-hosting:
- PostgreSQL for data persistence
- Chroma for vector search
- Redis for caching (optional)

## Environment Variables
Required for production:
- DATABASE_URL: PostgreSQL connection string
- OPENROUTER_API_KEY: For AI model access
- OPENAI_API_KEY: For embeddings
- CHROMA_URL: Vector database endpoint
- NEXTAUTH_SECRET: Session encryption key

## Monitoring
Set up logging and monitoring:
- Structured logging with Pino
- Error tracking with Sentry (optional)
- Performance monitoring with Vercel Analytics`,
  },
  {
    filename: 'troubleshooting.md',
    content: `# Troubleshooting Guide

## Database Connection Issues
If you see "database not available" errors:
1. Verify DATABASE_URL is correct
2. Check PostgreSQL is running
3. Run migrations: npx prisma migrate dev
4. Test connection: npx prisma db push

## Vector Search Not Working
Common issues:
1. Chroma not running - check docker compose ps
2. Missing OpenAI API key
3. Documents not indexed - check embedding stats
4. Rate limiting - check API quotas

## Build Errors
TypeScript errors:
- Run: npx tsc --noEmit
- Check for missing dependencies
- Verify all imports are correct

## Performance Issues
If search is slow:
1. Check Chroma container resources
2. Reduce chunk size for faster indexing
3. Use pagination for large result sets
4. Enable caching for frequent queries`,
  },
  {
    filename: 'model-configuration.md',
    content: `# AI Model Configuration

## Supported Models
The system supports all OpenRouter models:
- Claude 3.5 Sonnet (best quality)
- Claude 3 Haiku (fast, cheap)
- GPT-4 Turbo (OpenAI)
- DeepSeek Chat (very cheap)
- Qwen 2.5 (open source)

## Cost Management
Track costs with built-in usage monitoring:
- Real-time cost calculation
- Per-conversation tracking
- Monthly usage reports

## Model Selection
Set default model in .env:
OPENROUTER_MODEL=anthropic/claude-3-haiku

Or specify per conversation:
await createConversation({ model: 'deepseek-chat' })

## Fallback Strategy
Configure fallback models for reliability:
1. Primary model (fastest/preferred)
2. Fallback model (if primary fails)
3. Default model (deepseek-chat)`,
  },
];

async function seedProjects() {
  console.log('🌱 Seeding projects and documents...\n');

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Documentation',
      description: 'Technical documentation and guides',
      settings: {},
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'API Examples',
      description: 'API reference and code examples',
      settings: {},
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'DevOps & Deployment',
      description: 'Deployment guides and troubleshooting',
      settings: {},
    },
  });

  console.log('✅ Created 3 projects');

  // Map documents to projects
  const documentAssignments = [
    { project: project1, docs: [sampleDocuments[0], sampleDocuments[1]] },
    { project: project2, docs: [sampleDocuments[2], sampleDocuments[5]] },
    { project: project3, docs: [sampleDocuments[3], sampleDocuments[4]] },
  ];

  // Create documents and generate embeddings
  const skipEmbeddings = process.env.SKIP_EMBEDDINGS === 'true';

  let embeddingService: EmbeddingService | undefined;
  let chunkingService: ChunkingService | undefined;
  let vectorService: VectorService | undefined;

  if (!skipEmbeddings) {
    embeddingService = new EmbeddingService();
    chunkingService = new ChunkingService();
    vectorService = new VectorService(prisma);
    console.log('🧠 Embeddings enabled - will generate and store in Chroma\n');
  } else {
    console.log('⏭️  Embeddings SKIPPED - only creating documents in PostgreSQL\n');
  }

  let totalDocuments = 0;
  let totalChunks = 0;

  for (const assignment of documentAssignments) {
    console.log(`\n📁 Processing project: ${assignment.project.name}`);

    for (const docData of assignment.docs) {
      // Create document in PostgreSQL
      const document = await prisma.document.create({
        data: {
          projectId: assignment.project.id,
          filename: docData.filename,
          originalName: docData.filename,
          contentType: 'text/markdown',
          content: docData.content,
          size: docData.content.length,
          embedding: [],
          metadata: {},
        },
      });

      console.log(`  📄 Created document: ${docData.filename}`);

      // Only generate embeddings if not skipped
      if (!skipEmbeddings && chunkingService && embeddingService && vectorService) {
        // Chunk the document
        const chunks = chunkingService.chunkDocument(
          document.id,
          assignment.project.id,
          docData.content,
          docData.filename
        );

        console.log(`    ✂️  Created ${chunks.length} chunks`);

        // Generate embeddings
        console.log(`    🧠 Generating embeddings... (this may take 10-30 seconds)`);
        let embeddings: number[][];
        try {
          embeddings = await Promise.race([
            embeddingService.generateEmbeddings(chunks.map(c => c.content)),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Embedding generation timeout after 60s')), 60000)
            )
          ]) as number[][];

          console.log(`    ✅ Generated ${embeddings.length} embeddings`);
        } catch (error) {
          console.error(`    ❌ Failed to generate embeddings:`, error);
          throw error;
        }

        // Store in Chroma
        await vectorService.storeDocumentChunks(
          assignment.project.id,
          chunks,
          embeddings
        );

        console.log(`    ✅ Stored in Chroma`);

        totalChunks += chunks.length;
      }

      totalDocuments++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✨ Seeding complete!');
  console.log(`📊 Created ${totalDocuments} documents`);

  if (!skipEmbeddings) {
    console.log(`📊 Generated ${totalChunks} total chunks with embeddings`);
    console.log('\n🔍 Try searching:');
    console.log('  - "how to configure authentication"');
    console.log('  - "vector database setup"');
    console.log('  - "deployment to vercel"');
    console.log('  - "troubleshooting database errors"');
  } else {
    console.log('ℹ️  Run again without SKIP_EMBEDDINGS=true to generate vector embeddings');
  }

  console.log('='.repeat(50));
}

async function main() {
  try {
    await seedProjects();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
