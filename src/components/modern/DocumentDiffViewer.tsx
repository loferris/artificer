import React, { useMemo, useState } from 'react';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

interface DocumentDiffViewerProps {
  original: string;
  proposed: string;
  filename: string;
  onApply: () => void;
  onReject: () => void;
  reason?: string;
  isApplying?: boolean;
}

/**
 * Simple line-based diff algorithm
 * For production, consider using a library like diff-match-patch or react-diff-viewer
 */
function computeLineDiff(original: string, proposed: string): DiffLine[] {
  const originalLines = original.split('\n');
  const proposedLines = proposed.split('\n');
  const diff: DiffLine[] = [];

  let origIndex = 0;
  let propIndex = 0;

  while (origIndex < originalLines.length || propIndex < proposedLines.length) {
    const origLine = originalLines[origIndex];
    const propLine = proposedLines[propIndex];

    if (origLine === propLine) {
      // Lines match
      diff.push({
        type: 'unchanged',
        content: origLine || '',
        lineNumber: origIndex + 1,
      });
      origIndex++;
      propIndex++;
    } else if (!propLine || (origLine && !proposedLines.slice(propIndex).includes(origLine))) {
      // Line was removed
      diff.push({
        type: 'removed',
        content: origLine || '',
        lineNumber: origIndex + 1,
      });
      origIndex++;
    } else {
      // Line was added
      diff.push({
        type: 'added',
        content: propLine || '',
        lineNumber: propIndex + 1,
      });
      propIndex++;
    }
  }

  return diff;
}

export const DocumentDiffViewer: React.FC<DocumentDiffViewerProps> = ({
  original,
  proposed,
  filename,
  onApply,
  onReject,
  reason,
  isApplying = false,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('unified');

  const diff = useMemo(() => computeLineDiff(original, proposed), [original, proposed]);

  const stats = useMemo(() => {
    const added = diff.filter(d => d.type === 'added').length;
    const removed = diff.filter(d => d.type === 'removed').length;
    const unchanged = diff.filter(d => d.type === 'unchanged').length;
    return { added, removed, unchanged, total: diff.length };
  }, [diff]);

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">📝</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Document Update Proposed
              </h3>
              <p className="text-sm text-gray-600">{filename}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'unified'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'split'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Split
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-700">
              {stats.added} addition{stats.added !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-700">
              {stats.removed} deletion{stats.removed !== 1 ? 's' : ''}
            </span>
          </div>
          {reason && (
            <div className="ml-auto text-gray-600">
              <span className="font-medium">Reason:</span> {reason}
            </div>
          )}
        </div>
      </div>

      {/* Diff Content */}
      <div className="max-h-96 overflow-auto">
        {viewMode === 'unified' ? (
          <div className="font-mono text-sm">
            {diff.map((line, index) => (
              <div
                key={index}
                className={`flex ${
                  line.type === 'added'
                    ? 'bg-green-50'
                    : line.type === 'removed'
                    ? 'bg-red-50'
                    : 'bg-white'
                } ${line.type !== 'unchanged' ? 'font-medium' : ''}`}
              >
                <div
                  className={`flex-shrink-0 w-12 px-2 py-1 text-right select-none ${
                    line.type === 'added'
                      ? 'bg-green-100 text-green-700'
                      : line.type === 'removed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  {line.lineNumber}
                </div>
                <div
                  className={`flex-shrink-0 w-8 px-2 py-1 text-center select-none ${
                    line.type === 'added'
                      ? 'bg-green-100 text-green-700'
                      : line.type === 'removed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </div>
                <div className="flex-1 px-4 py-1 whitespace-pre-wrap break-words">
                  {line.content || <span className="text-gray-400">(empty line)</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            {/* Original */}
            <div className="font-mono text-sm">
              <div className="bg-red-100 px-4 py-2 font-semibold text-red-800 sticky top-0">
                Original
              </div>
              {diff
                .filter(line => line.type !== 'added')
                .map((line, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      line.type === 'removed' ? 'bg-red-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex-shrink-0 w-12 px-2 py-1 text-right text-gray-500 bg-gray-50 select-none">
                      {line.lineNumber}
                    </div>
                    <div className="flex-1 px-4 py-1 whitespace-pre-wrap break-words">
                      {line.content || <span className="text-gray-400">(empty line)</span>}
                    </div>
                  </div>
                ))}
            </div>

            {/* Proposed */}
            <div className="font-mono text-sm">
              <div className="bg-green-100 px-4 py-2 font-semibold text-green-800 sticky top-0">
                Proposed
              </div>
              {diff
                .filter(line => line.type !== 'removed')
                .map((line, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      line.type === 'added' ? 'bg-green-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex-shrink-0 w-12 px-2 py-1 text-right text-gray-500 bg-gray-50 select-none">
                      {line.lineNumber}
                    </div>
                    <div className="flex-1 px-4 py-1 whitespace-pre-wrap break-words">
                      {line.content || <span className="text-gray-400">(empty line)</span>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Review the changes above and choose to apply or reject them.
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onReject}
            disabled={isApplying}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject Changes
          </button>
          <button
            onClick={onApply}
            disabled={isApplying}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isApplying ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Applying...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Apply Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
