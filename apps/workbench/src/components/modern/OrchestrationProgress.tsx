import React, { useState } from 'react';

interface OrchestrationProgressProps {
  stage: 'analyzing' | 'routing' | 'executing' | 'validating' | 'retrying' | 'complete' | 'idle';
  message: string;
  progress: number; // 0-1
  metadata?: {
    complexity?: number;
    category?: string;
    model?: string;
    cacheHit?: boolean;
    retryCount?: number;
    estimatedCost?: number;
  };
  className?: string;
}

export const OrchestrationProgress: React.FC<OrchestrationProgressProps> = ({
  stage,
  message,
  progress,
  metadata,
  className = '',
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Progress bar color based on stage
  const getProgressColor = () => {
    switch (stage) {
      case 'analyzing':
        return 'bg-blue-500';
      case 'routing':
        return 'bg-purple-500';
      case 'executing':
        return 'bg-green-500';
      case 'validating':
        return 'bg-yellow-500';
      case 'retrying':
        return 'bg-orange-500';
      case 'complete':
        return 'bg-green-600';
      default:
        return 'bg-gray-500';
    }
  };

  // Background pulse animation for active stages
  const getPulseClass = () => {
    if (stage === 'complete' || stage === 'idle') {
      return '';
    }
    return 'animate-pulse';
  };

  const hasMetadata = metadata && Object.keys(metadata).length > 0;

  return (
    <div className={`flex justify-start mb-4 ${className}`}>
      <div className="max-w-[70%] w-full">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          {/* Stage message */}
          <div className="flex items-center space-x-2 mb-3">
            <div className={`flex-shrink-0 ${getPulseClass()}`}>
              <span className="text-2xl">{message.split(' ')[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {message.split(' ').slice(1).join(' ')}
              </div>
            </div>
            <div className="flex-shrink-0 text-xs text-gray-500">
              {Math.round(progress * 100)}%
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div
              className={`absolute top-0 left-0 h-full ${getProgressColor()} transition-all duration-300 ease-out`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Metadata badges */}
          {hasMetadata && (
            <div className="flex flex-wrap gap-2 mb-2">
              {metadata.complexity !== undefined && (
                <div className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 border border-blue-200">
                  <span className="text-xs font-medium text-blue-700">
                    Complexity: {metadata.complexity}/10
                  </span>
                </div>
              )}

              {metadata.category && (
                <div className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 border border-purple-200">
                  <span className="text-xs font-medium text-purple-700 capitalize">
                    {metadata.category}
                  </span>
                </div>
              )}

              {metadata.model && (
                <div className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 border border-green-200">
                  <span className="text-xs font-medium text-green-700">
                    {metadata.model.split('/').pop()}
                  </span>
                </div>
              )}

              {metadata.cacheHit && (
                <div className="inline-flex items-center px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
                  <span className="text-xs font-medium text-amber-700">
                    💾 Cached
                  </span>
                </div>
              )}

              {metadata.retryCount !== undefined && metadata.retryCount > 0 && (
                <div className="inline-flex items-center px-2 py-1 rounded-md bg-orange-50 border border-orange-200">
                  <span className="text-xs font-medium text-orange-700">
                    🔄 Retry {metadata.retryCount}
                  </span>
                </div>
              )}

              {metadata.estimatedCost !== undefined && (
                <div className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 border border-gray-200">
                  <span className="text-xs font-medium text-gray-700">
                    ${metadata.estimatedCost.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Show details toggle */}
          {hasMetadata && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1 mt-2"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>{showDetails ? 'Hide details' : 'Show details'}</span>
            </button>
          )}

          {/* Expanded details */}
          {showDetails && hasMetadata && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-1">
              {metadata.complexity !== undefined && (
                <div>
                  <span className="font-medium">Complexity:</span> {metadata.complexity}/10
                </div>
              )}
              {metadata.category && (
                <div>
                  <span className="font-medium">Category:</span> {metadata.category}
                </div>
              )}
              {metadata.model && (
                <div>
                  <span className="font-medium">Model:</span> {metadata.model}
                </div>
              )}
              {metadata.estimatedCost !== undefined && (
                <div>
                  <span className="font-medium">Estimated Cost:</span> ${metadata.estimatedCost.toFixed(4)}
                </div>
              )}
              {metadata.cacheHit && (
                <div>
                  <span className="font-medium">Cache:</span> Hit (routing decision reused)
                </div>
              )}
              {metadata.retryCount !== undefined && (
                <div>
                  <span className="font-medium">Retry Count:</span> {metadata.retryCount}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
