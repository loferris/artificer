import React from 'react';
import { useCostTracker } from '../hooks/useCostTracker';

type ViewMode = 'terminal' | 'chat';

interface CostTrackerProps {
  viewMode: ViewMode;
}

export const CostTracker: React.FC<CostTrackerProps> = ({ viewMode }) => {
  const { totalCost, totalMessages, totalTokens, isLoading, error, refresh } = useCostTracker();

  // Dynamic styles based on view mode
  const isTerminal = viewMode === 'terminal';
  const containerClass = isTerminal 
    ? "fixed top-16 right-4 z-40 bg-gray-900 text-green-400 p-3 rounded-lg border border-gray-700 font-mono text-xs shadow-lg min-w-[200px]"
    : "fixed top-16 right-4 z-40 bg-white/90 backdrop-blur-sm text-gray-700 p-3 rounded-lg border border-gray-200 font-mono text-xs shadow-lg min-w-[200px]";
  
  const errorClass = isTerminal
    ? "fixed top-16 right-4 z-40 bg-red-900 text-red-100 p-3 rounded-lg border border-red-700 font-mono text-xs shadow-lg"
    : "fixed top-16 right-4 z-40 bg-red-50 text-red-800 p-3 rounded-lg border border-red-200 font-mono text-xs shadow-lg";

  if (error) {
    return (
      <div className={errorClass}>
        <div className={isTerminal ? "text-red-300" : "text-red-600"}>$ cost_tracker --status</div>
        <div>ERROR: Failed to load cost data</div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="flex justify-between items-center mb-1">
        <span className={isTerminal ? "text-gray-500" : "text-gray-500"}>$ cost_tracker --summary</span>
        <button
          onClick={() => refresh()}
          className={isTerminal 
            ? "text-gray-500 hover:text-green-400 transition-colors text-xs"
            : "text-gray-500 hover:text-blue-600 transition-colors text-xs"
          }
          title="Refresh stats"
        >
          ↻
        </button>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className={isTerminal ? "text-gray-300" : "text-gray-600"}>total_cost:</span>
          <span className={isTerminal 
            ? "text-yellow-400" 
            : "text-orange-600 font-semibold"
          }>
            {isLoading ? '...' : `$${totalCost.toFixed(6)}`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className={isTerminal ? "text-gray-300" : "text-gray-600"}>messages:</span>
          <span className={isTerminal 
            ? "text-blue-400" 
            : "text-blue-600 font-semibold"
          }>
            {isLoading ? '...' : totalMessages.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className={isTerminal ? "text-gray-300" : "text-gray-600"}>tokens:</span>
          <span className={isTerminal 
            ? "text-purple-400" 
            : "text-purple-600 font-semibold"
          }>
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