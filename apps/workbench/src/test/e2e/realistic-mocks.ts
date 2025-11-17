// Realistic mock data based on actual API responses
// Generated from analyzing the actual tRPC router implementations

export const realisticMockConversation = {
  id: 'conv_cuid_example_123',
  title: 'New Conversation',
  model: 'deepseek-chat',
  createdAt: new Date('2024-01-15T10:30:00Z'),
  updatedAt: new Date('2024-01-15T10:30:00Z'),
  systemPrompt: 'You are a helpful AI assistant.',
  temperature: 0.7,
  maxTokens: 1000,
  messages: [
    {
      id: 'msg_cuid_example_456',
      role: 'user',
      content: 'Hello, how are you?',
      tokens: 6,
      createdAt: new Date('2024-01-15T10:30:00Z'),
      conversationId: 'conv_cuid_example_123',
      parentId: null,
    },
    {
      id: 'msg_cuid_example_789',
      role: 'assistant',
      content:
        "Hello! I'm doing well, thank you for asking. I'm here to help you with any questions or tasks you might have. How can I assist you today?",
      tokens: 28,
      createdAt: new Date('2024-01-15T10:30:05Z'),
      conversationId: 'conv_cuid_example_123',
      parentId: null,
    },
  ],
};

export const realisticMockMessages = [
  {
    id: 'msg_cuid_example_456',
    role: 'user',
    content: 'Hello, how are you?',
    tokens: 6,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    conversationId: 'conv_cuid_example_123',
    parentId: null,
  },
  {
    id: 'msg_cuid_example_789',
    role: 'assistant',
    content:
      "Hello! I'm doing well, thank you for asking. I'm here to help you with any questions or tasks you might have. How can I assist you today?",
    tokens: 28,
    createdAt: new Date('2024-01-15T10:30:05Z'),
    conversationId: 'conv_cuid_example_123',
    parentId: null,
  },
];

export const realisticMockUsageStats = {
  conversationCount: 3,
  messageCount: 8,
  totalTokens: 156,
  totalCost: 0.000312, // totalTokens * 0.000002
};

export const realisticMockModelUsage = {
  totalMessages: 8,
  byRole: [
    {
      role: 'user',
      count: 4,
      percentage: 50.0,
    },
    {
      role: 'assistant',
      count: 4,
      percentage: 50.0,
    },
  ],
};

export const realisticMockChatResponse = {
  id: 'msg_cuid_example_789',
  content:
    "Hello! I'm doing well, thank you for asking. I'm here to help you with any questions or tasks you might have. How can I assist you today?",
  role: 'assistant' as const,
  timestamp: new Date('2024-01-15T10:30:05Z'),
  model: 'deepseek-chat',
  cost: 0.000056, // estimated cost for this response
};

// Mock data for different scenarios
export const mockDataScenarios = {
  empty: {
    conversations: [],
    messages: [],
    usageStats: {
      conversationCount: 0,
      messageCount: 0,
      totalTokens: 0,
      totalCost: 0,
    },
    modelUsage: {
      totalMessages: 0,
      byRole: [],
    },
  },

  withConversation: {
    conversations: [realisticMockConversation],
    messages: realisticMockMessages,
    usageStats: realisticMockUsageStats,
    modelUsage: realisticMockModelUsage,
  },

  multipleConversations: {
    conversations: [
      realisticMockConversation,
      {
        ...realisticMockConversation,
        id: 'conv_cuid_example_456',
        title: 'Another Conversation',
        updatedAt: new Date('2024-01-15T09:15:00Z'),
        messages: [],
      },
    ],
    messages: realisticMockMessages,
    usageStats: {
      ...realisticMockUsageStats,
      conversationCount: 2,
    },
    modelUsage: realisticMockModelUsage,
  },
};
