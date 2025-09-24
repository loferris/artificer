import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { mockDataScenarios } from './realistic-mocks';

// Mock DOM APIs not available in jsdom
beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: vi.fn(),
    writable: true,
  });
});

// Mock the tRPC module for E2E testing
vi.mock('../../lib/trpc/client', () => ({
  trpc: {
    useUtils: vi.fn(() => ({
      conversations: {
        list: {
          invalidate: vi.fn(),
          setData: vi.fn(),
          getData: vi.fn(),
        },
      },
      messages: {
        getByConversation: {
          invalidate: vi.fn(),
          setData: vi.fn(),
          getData: vi.fn(),
        },
      },
    })),
    conversations: {
      list: {
        useQuery: vi.fn().mockReturnValue({
          data: mockDataScenarios.empty.conversations,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      create: {
        useMutation: vi.fn().mockReturnValue({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          isPending: false,
          isSuccess: false,
          error: null,
          reset: vi.fn(),
        }),
      },
      delete: {
        useMutation: vi.fn().mockReturnValue({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          isPending: false,
          isSuccess: false,
          error: null,
          reset: vi.fn(),
        }),
      },
    },
    messages: {
      getByConversation: {
        useQuery: vi.fn().mockReturnValue({
          data: mockDataScenarios.empty.messages,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
    },
    chat: {
      sendMessage: {
        useMutation: vi.fn().mockReturnValue({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          isPending: false,
          isSuccess: false,
          error: null,
          reset: vi.fn(),
        }),
      },
    },
    usage: {
      getSessionStats: {
        useQuery: vi.fn().mockReturnValue({
          data: mockDataScenarios.empty.usageStats,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
    },
  },
}));

// Mock data for E2E tests
export const mockConversations = [
  {
    id: 'conv-1',
    title: 'Test Conversation 1',
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    createdAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: 'conv-2',
    title: 'Test Conversation 2',
    updatedAt: new Date('2024-01-01T11:00:00Z'),
    createdAt: new Date('2024-01-01T11:00:00Z'),
  },
];

export const mockMessages = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user',
    content: 'Hello, how are you?',
    tokens: 6,
    createdAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    role: 'assistant',
    content: "I'm doing well, thank you! How can I help you today?",
    tokens: 12,
    createdAt: new Date('2024-01-01T10:01:00Z'),
  },
];

export const mockUsageStats = {
  conversationCount: 2,
  messageCount: 2,
  totalTokens: 18,
  totalCost: 0.000036,
};

// Helper function to set up default mock responses
export const setupDefaultMocks = async () => {
  const mockTrpc = {
    conversations: {
      list: {
        useQuery: vi.fn().mockReturnValue({
          data: mockConversations,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      create: {
        useMutation: vi.fn().mockReturnValue({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          isPending: false,
          isSuccess: false,
          error: null,
          reset: vi.fn(),
        }),
      },
      delete: {
        useMutation: vi.fn().mockReturnValue({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          isPending: false,
          isSuccess: false,
          error: null,
          reset: vi.fn(),
        }),
      },
    },
    messages: {
      getByConversation: {
        useQuery: vi.fn().mockReturnValue({
          data: mockMessages,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
    },
    chat: {
      sendMessage: {
        useMutation: vi.fn().mockReturnValue({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          isPending: false,
          isSuccess: false,
          error: null,
          reset: vi.fn(),
        }),
      },
    },
    usage: {
      getSessionStats: {
        useQuery: vi.fn().mockReturnValue({
          data: mockUsageStats,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
    },
    useUtils: vi.fn(() => ({
      conversations: {
        list: {
          invalidate: vi.fn(),
          setData: vi.fn(),
          getData: vi.fn(),
        },
      },
      messages: {
        getByConversation: {
          invalidate: vi.fn(),
          setData: vi.fn(),
          getData: vi.fn(),
        },
      },
    })),
  };

  // Apply the mock to the module
  const trpcModule = vi.mocked(await import('../../lib/trpc/client'));
  const { trpc } = trpcModule;
  Object.assign(trpc, mockTrpc);
};

// Helper function to simulate API delays
export const simulateApiDelay = (delay: number = 100) => {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
};

// Helper function to simulate API errors
export const simulateApiError = async (endpoint: string, errorMessage: string = 'API Error') => {
  const trpcModule = vi.mocked(await import('../../lib/trpc/client'));
  const { trpc } = trpcModule;

  switch (endpoint) {
    case 'conversations.list':
      trpc.conversations.list.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: { message: errorMessage },
        refetch: vi.fn(),
      });
      break;
    case 'messages.getByConversation':
      trpc.messages.getByConversation.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: { message: errorMessage },
        refetch: vi.fn(),
      });
      break;
    case 'usage.getSessionStats':
      trpc.usage.getSessionStats.useQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: errorMessage },
        refetch: vi.fn(),
      });
      break;
  }
};

// Helper function to update mock data for specific endpoints
export const updateMockData = async (endpoint: string, data: any) => {
  const trpcModule = vi.mocked(await import('../../lib/trpc/client'));
  const { trpc } = trpcModule;

  switch (endpoint) {
    case 'conversations.list':
      trpc.conversations.list.useQuery.mockReturnValue({
        data,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
      break;
    case 'messages.getByConversation':
      trpc.messages.getByConversation.useQuery.mockReturnValue({
        data,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
      break;
    case 'usage.getSessionStats':
      trpc.usage.getSessionStats.useQuery.mockReturnValue({
        data,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
      break;
  }
};

// Helper function to simulate loading states
export const simulateLoading = async (endpoint: string) => {
  const trpcModule = vi.mocked(await import('../../lib/trpc/client'));
  const { trpc } = trpcModule;

  switch (endpoint) {
    case 'conversations.list':
      trpc.conversations.list.useQuery.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });
      break;
    case 'messages.getByConversation':
      trpc.messages.getByConversation.useQuery.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });
      break;
    case 'usage.getSessionStats':
      trpc.usage.getSessionStats.useQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });
      break;
  }
};

// Helper function to simulate mutation states
export const simulateMutationState = async (mutation: string, state: 'pending' | 'success' | 'error') => {
  const trpcModule = vi.mocked(await import('../../lib/trpc/client'));
  const { trpc } = trpcModule;

  const baseState = {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    error: null,
    reset: vi.fn(),
  };

  switch (mutation) {
    case 'conversations.create':
      trpc.conversations.create.useMutation.mockReturnValue({
        ...baseState,
        isPending: state === 'pending',
        isSuccess: state === 'success',
        error: state === 'error' ? { message: 'Mutation failed' } : null,
      });
      break;
    case 'chat.sendMessage':
      trpc.chat.sendMessage.useMutation.mockReturnValue({
        ...baseState,
        isPending: state === 'pending',
        isSuccess: state === 'success',
        error: state === 'error' ? { message: 'Mutation failed' } : null,
      });
      break;
  }
};
