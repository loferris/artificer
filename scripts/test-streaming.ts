// Run with: npx tsx scripts/test-streaming.ts

import { config } from 'dotenv';
import { DatabaseChatService, DemoChatService } from '../src/server/services/chat/ChatService';
import { MockAssistant, OpenRouterAssistant } from '../src/server/services/assistant/assistant';

// Load environment variables
config();

// Mock services for testing (you'd replace these with real ones)
const mockConversationService = {
  validateAccess: async () => ({ id: 'test-conv', title: 'Test' }),
  generateTitle: (content: string) => content.slice(0, 30),
  updateTitle: async () => {},
  updateActivity: async () => {},
} as any;

const mockMessageService = {
  create: async (data: any) => ({
    id: `msg-${Date.now()}`,
    ...data,
    createdAt: new Date(),
    tokens: data.content.split(' ').length,
  }),
  getConversationHistory: async () => [],
  countByConversation: async () => 2,
  estimateTokens: (content: string) => content.split(' ').length,
} as any;

async function testMockAssistant() {
  console.log('\n🤖 Testing Mock Assistant Streaming...\n');

  const mockAssistant = new MockAssistant();
  const chatService = new DatabaseChatService(
    mockConversationService,
    mockMessageService,
    mockAssistant,
  );

  const stream = chatService.createMessageStream({
    content: 'Tell me about AI orchestration',
    conversationId: 'test-conv-1',
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    if (chunk.error) {
      console.error('❌ Error:', chunk.error);
      break;
    }

    if (chunk.content) {
      process.stdout.write(chunk.content);
      fullResponse += chunk.content;
    }

    if (chunk.finished) {
      console.log('\n✅ Stream completed');
      console.log(`📊 Metadata:`, chunk.metadata);
      break;
    }
  }

  console.log(`\n📝 Full response: "${fullResponse}"`);
}

async function testDemoService() {
  console.log('\n🎭 Testing Demo Service Streaming...\n');

  const demoService = new DemoChatService();

  const stream = demoService.createMessageStream({
    content: 'What is the purpose of this demo?',
    conversationId: 'demo-conv-1',
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    if (chunk.error) {
      console.error('❌ Error:', chunk.error);
      break;
    }

    if (chunk.content) {
      process.stdout.write(chunk.content);
      fullResponse += chunk.content;
    }

    if (chunk.finished) {
      console.log('\n✅ Stream completed');
      console.log(`📊 Metadata:`, chunk.metadata);
      break;
    }
  }

  console.log(`\n📝 Full response: "${fullResponse}"`);
}

async function testOpenRouterAssistant() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.log('\n⚠️  Skipping OpenRouter test - no API key found');
    console.log('Set OPENROUTER_API_KEY environment variable to test');
    return;
  }

  console.log('\n🌐 Testing OpenRouter Assistant Streaming...\n');

  const openRouterAssistant = new OpenRouterAssistant(apiKey, 'anthropic/claude-3-haiku');
  const chatService = new DatabaseChatService(
    mockConversationService,
    mockMessageService,
    openRouterAssistant,
  );

  try {
    const stream = chatService.createMessageStream({
      content: 'Explain streaming APIs in one paragraph',
      conversationId: 'test-conv-openrouter',
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      if (chunk.error) {
        console.error('❌ Error:', chunk.error);
        break;
      }

      if (chunk.content) {
        process.stdout.write(chunk.content);
        fullResponse += chunk.content;
      }

      if (chunk.finished) {
        console.log('\n✅ Stream completed');
        console.log(`📊 Metadata:`, chunk.metadata);
        break;
      }
    }

    console.log(`\n📝 Full response length: ${fullResponse.length} characters`);
  } catch (error) {
    console.error('❌ OpenRouter test failed:', error);
  }
}

async function testCancellation() {
  console.log('\n⏹️  Testing Stream Cancellation...\n');

  const mockAssistant = new MockAssistant();
  const chatService = new DatabaseChatService(
    mockConversationService,
    mockMessageService,
    mockAssistant,
  );

  const controller = new AbortController();

  // Cancel after 200ms
  setTimeout(() => {
    console.log('\n🛑 Cancelling stream...');
    controller.abort();
  }, 200);

  const stream = chatService.createMessageStream({
    content: 'This should be cancelled mid-stream',
    conversationId: 'test-conv-cancel',
    signal: controller.signal,
  });

  for await (const chunk of stream) {
    if (chunk.error) {
      console.log(`✅ Cancellation handled: ${chunk.error}`);
      break;
    }

    if (chunk.content) {
      process.stdout.write(chunk.content);
    }

    if (chunk.finished) {
      console.log('\n✅ Stream completed (should not reach here)');
      break;
    }
  }
}

async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...\n');

  const mockAssistant = new MockAssistant();
  const chatService = new DatabaseChatService(
    mockConversationService,
    mockMessageService,
    mockAssistant,
  );

  // Test empty message
  console.log('Testing empty message validation...');
  const stream1 = chatService.createMessageStream({
    content: '',
    conversationId: 'test-conv-error',
  });

  for await (const chunk of stream1) {
    if (chunk.error) {
      console.log(`✅ Validation error caught: ${chunk.error}`);
    }
    break;
  }

  // Test too long message
  console.log('\nTesting message length validation...');
  const longMessage = 'a'.repeat(15000);
  const stream2 = chatService.createMessageStream({
    content: longMessage,
    conversationId: 'test-conv-error',
  });

  for await (const chunk of stream2) {
    if (chunk.error) {
      console.log(`✅ Length validation error caught: ${chunk.error}`);
    }
    break;
  }
}

async function runAllTests() {
  console.log('🧪 Testing ChatService Streaming Implementation');
  console.log('='.repeat(50));

  try {
    await testMockAssistant();
    await testDemoService();
    await testOpenRouterAssistant();
    await testCancellation();
    await testErrorHandling();

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    // This is a workaround for a bug in tsx where it hangs
    // It seems to be related to open handles from the test script
    process.exit(0);
  }
}

// Run tests if this script is executed directly
runAllTests().catch(console.error);
