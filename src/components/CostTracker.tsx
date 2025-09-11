import React from 'react';
import { useCostTracker } from '../hooks/useCostTracker';

export const CostTracker: React.FC = () => {
  const { totalCost, totalMessages, totalTokens, isLoading, error, refresh } = useCostTracker();

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-900 text-red-100 p-3 rounded-lg border border-red-700 font-mono text-xs shadow-lg">
        <div className="text-red-300">$ cost_tracker --status</div>
        <div>ERROR: Failed to load cost data</div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-green-400 p-3 rounded-lg border border-gray-700 font-mono text-xs shadow-lg min-w-[200px]">
      <div className="flex justify-between items-center mb-1">
        <span className="text-gray-500">$ cost_tracker --summary</span>
        <button
          onClick={() => refresh()}
          className="text-gray-500 hover:text-green-400 transition-colors text-xs"
          title="Refresh stats"
        >
          ↻
        </button>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-300">total_cost:</span>
          <span className="text-yellow-400">
            {isLoading ? '...' : `$${totalCost.toFixed(6)}`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">messages:</span>
          <span className="text-blue-400">
            {isLoading ? '...' : totalMessages.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">tokens:</span>
          <span className="text-purple-400">
            {isLoading ? '...' : totalTokens.toLocaleString()}
          </span>
        </div>
      </div>
      {isLoading && (
        <div className="mt-2 text-gray-500 animate-pulse">
          Loading stats...
        </div>
      )}
    </div>
  );
};