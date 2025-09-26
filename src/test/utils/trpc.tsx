import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import type { AppRouter } from '../../server/root';
import { TerminalThemeProvider } from '../../contexts/TerminalThemeContext';

export const trpc = createTRPCReact<AppRouter>();

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

export const createTestTrpcClient = () =>
  trpc.createClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:3000/api/trpc',
      }),
    ],
  });

export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  const trpcClient = createTestTrpcClient();

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TerminalThemeProvider>{children}</TerminalThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
};
