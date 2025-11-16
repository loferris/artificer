/**
 * React component artifact viewer with live preview using react-live
 */

import React, { useState } from 'react';
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live';
import type { Artifact } from '../../../../lib/llm-artifacts/src/core/types';

interface ArtifactReactViewerProps {
  artifact: Artifact;
  onEdit?: (content: string) => void;
  readOnly?: boolean;
}

/**
 * Safe scope for react-live
 * Only includes React hooks and safe utilities
 */
const createSafeScope = () => ({
  // React core
  React,
  useState: React.useState,
  useEffect: React.useEffect,
  useCallback: React.useCallback,
  useMemo: React.useMemo,
  useRef: React.useRef,
  useReducer: React.useReducer,
  useContext: React.useContext,

  // Safe utilities
  console: {
    log: (...args: any[]) => console.log('[Preview]', ...args),
    warn: (...args: any[]) => console.warn('[Preview]', ...args),
    error: (...args: any[]) => console.error('[Preview]', ...args),
  },
});

export const ArtifactReactViewer: React.FC<ArtifactReactViewerProps> = ({
  artifact,
  onEdit,
  readOnly = false,
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(artifact.content);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    if (onEdit && editedContent !== artifact.content) {
      onEdit(editedContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(artifact.content);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.filename || `${artifact.title || 'component'}.${artifact.language === 'typescript' ? 'tsx' : 'jsx'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Prepare code for react-live
  // Remove import statements and export default
  const prepareCodeForPreview = (code: string): string => {
    let cleanedCode = code
      // Remove import statements
      .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
      // Remove export default
      .replace(/^export\s+default\s+/gm, '')
      // Remove leading/trailing whitespace
      .trim();

    // If code doesn't start with a component definition, wrap it
    if (!cleanedCode.match(/^(function|const|class)\s+\w+/)) {
      cleanedCode = `function Component() {\n  return (\n${cleanedCode}\n  );\n}`;
    }

    return cleanedCode;
  };

  const safeScope = createSafeScope();
  const previewCode = prepareCodeForPreview(artifact.content);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">React Component</span>
          {artifact.filename && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-700">{artifact.filename}</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {!isEditing && (
            <div className="flex bg-gray-200 rounded p-0.5">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'code'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Code
              </button>
            </div>
          )}
          {!readOnly && !isEditing && onEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              Edit
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Save
              </button>
            </>
          )}
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors flex items-center space-x-1"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-gray-100 resize-none focus:outline-none"
            spellCheck={false}
          />
        ) : viewMode === 'preview' ? (
          <div className="h-full flex flex-col">
            {/* Info banner */}
            <div className="p-3 bg-blue-50 border-b border-blue-200">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Live Preview:</span> Components run in a sandboxed environment with limited scope.
                External imports are not available.
              </p>
            </div>

            {/* Live Preview */}
            <div className="flex-1 overflow-auto">
              <LiveProvider code={previewCode} scope={safeScope} noInline={false}>
                <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                  {/* Preview pane */}
                  <div className="p-6 bg-white border-r border-gray-200 overflow-auto">
                    <div className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Preview
                    </div>
                    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                      <LivePreview />
                    </div>
                  </div>

                  {/* Code pane */}
                  <div className="bg-gray-900 overflow-auto">
                    <div className="p-3 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700">
                      Code
                    </div>
                    <LiveEditor
                      disabled={readOnly}
                      className="font-mono text-sm"
                      style={{
                        fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
                        backgroundColor: '#1a1b26',
                      }}
                    />
                  </div>
                </div>

                {/* Error display */}
                <div className="border-t border-red-200 bg-red-50">
                  <LiveError className="p-4 text-sm text-red-800 font-mono whitespace-pre-wrap" />
                </div>
              </LiveProvider>
            </div>
          </div>
        ) : (
          // Code-only view
          <pre className="p-4 bg-gray-900 text-gray-100 overflow-auto h-full m-0">
            <code className="text-sm font-mono whitespace-pre">{artifact.content}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
