import { trpc } from '../lib/trpc/client';

export interface CostStats {
  totalCost: number;
  totalMessages: number;
  totalTokens: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useCostTracker = () => {
  // Use the existing efficient usage endpoint
  const { data, isLoading, error, refetch } = trpc.usage.getSessionStats.useQuery();

  return {
    totalCost: data?.totalCost || 0,
    totalMessages: data?.messageCount || 0,
    totalTokens: data?.totalTokens || 0,
    isLoading,
    error,
    refresh: refetch,
  };
};