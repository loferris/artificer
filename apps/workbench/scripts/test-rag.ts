/**
 * Test script for RAG integration
 *
 * This script:
 * 1. Creates a conversation linked to a project with documents
 * 2. Sends a message that should trigger RAG context retrieval
 * 3. Logs the RAG context and AI response
 */

import { PrismaClient } from '@prisma/client';
import { createServiceContainer } from '../src/server/services/ServiceFactory';

const PROJECT_ID = 'cmi0paty30002pbn5y11dmtvx'; // DevOps & Deployment project (newly seeded)

async function testRAG() {
  const db = new PrismaClient();

  try {
    console.log('🚀 Starting RAG integration test...\n');

    // Check project exists
    const project = await db.project.findUnique({
      where: { id: PROJECT_ID },
      include: { documents: true },
    });

    if (!project) {
      throw new Error(`Project ${PROJECT_ID} not found`);
    }

    console.log(`📁 Project: ${project.name}`);
    console.log(`📄 Documents: ${project.documents.length} files`);
    project.documents.forEach((doc) => {
      console.log(`   - ${doc.filename} (${doc.contentType})`);
    });
    console.log('');

    // Create services with RAG enabled
    console.log('🔧 ENABLE_RAG:', process.env.ENABLE_RAG);
    console.log('🔧 OPENAI_API_KEY set:', !!process.env.OPENAI_API_KEY);
    console.log('🔧 CHROMA_URL:', process.env.CHROMA_URL);

    const services = createServiceContainer({ db });
    console.log('🔧 ChatService has RAG:', !!(services.chatService as any).ragService);
    console.log('');

    // Create a conversation linked to the project
    console.log('💬 Creating conversation linked to project...');
    const conversation = await services.conversationService.create({
      title: 'RAG Test Conversation',
      model: 'anthropic/claude-3-haiku',
      projectId: PROJECT_ID,
    });
    console.log(`✅ Conversation created: ${conversation.id}\n`);

    // Send a message that should trigger RAG
    console.log('📨 Sending message: "How do I deploy this application?"\n');
    console.log('⏳ Waiting for response...\n');

    const result = await services.chatService.sendMessage({
      content: 'How do I deploy this application?',
      conversationId: conversation.id,
    });

    console.log('✅ Response received!\n');
    console.log('─'.repeat(80));
    console.log('🤖 AI Response:');
    console.log('─'.repeat(80));
    console.log(result.assistantMessage.content);
    console.log('─'.repeat(80));
    console.log('');

    // Check if response contains context from documents
    const hasDeploymentContext = result.assistantMessage.content.toLowerCase().includes('deploy');
    const hasTroubleshootingContext = result.assistantMessage.content.toLowerCase().includes('troubleshoot');

    console.log('📊 Analysis:');
    console.log(`   - Response length: ${result.assistantMessage.content.length} characters`);
    console.log(`   - Contains "deploy": ${hasDeploymentContext ? '✅' : '❌'}`);
    console.log(`   - Contains "troubleshoot": ${hasTroubleshootingContext ? '✅' : '❌'}`);
    console.log(`   - Model: ${result.assistantMessage.model || 'unknown'}`);
    console.log(`   - Tokens: ${result.assistantMessage.tokens || 'N/A'}`);
    console.log('');

    console.log('✅ RAG test completed successfully!');
    console.log('\nNote: Check server logs for RAG context retrieval details');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the test
testRAG();
