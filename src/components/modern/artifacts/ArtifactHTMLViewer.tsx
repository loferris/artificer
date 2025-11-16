/**
 * HTML artifact viewer with enhanced preview and source toggle
 */

import React, { useState } from 'react';
import type { Artifact } from '../../../../lib/llm-artifacts/src/core/types';
import { highlightCode } from '../../../utils/shiki';

interface ArtifactHTMLViewerProps {
  artifact: Artifact;
  onEdit?: (content: string) => void;
  readOnly?: boolean;
}

export const ArtifactHTMLViewer: React.FC<ArtifactHTMLViewerProps> = ({
  artifact,
  onEdit,
  readOnly = false,
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(artifact.content);
  const [highlightedHtml, setHighlightedHtml] = useState('');
  const [copied, setCopied] = useState(false);

  // Highlight code when in source view
  React.useEffect(() => {
    if (viewMode === 'source' && !isEditing) {
      highlightCode(artifact.content, 'html')
        .then(setHighlightedHtml)
        .catch(err => {
          console.error('Error highlighting HTML:', err);
        });
    }
  }, [artifact.content, viewMode, isEditing]);

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
    const blob = new Blob([artifact.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.filename || `${artifact.title || 'document'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([artifact.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Clean up after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">HTML Document</span>
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
                onClick={() => setViewMode('source')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'source'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Source
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
            onClick={handleOpenInNewTab}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors flex items-center space-x-1"
            title="Open in new tab"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>Open</span>
          </button>
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
      <div className="flex-1 overflow-auto bg-white">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-gray-100 resize-none focus:outline-none"
            spellCheck={false}
          />
        ) : viewMode === 'preview' ? (
          <div className="h-full flex flex-col">
            {/* Safety notice */}
            <div className="p-3 bg-amber-50 border-b border-amber-200">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">Sandboxed Preview:</span> JavaScript execution is limited for security.
                    For full functionality, open in a new tab.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview iframe */}
            <div className="flex-1 p-4 overflow-auto">
              <iframe
                srcDoc={artifact.content}
                className="w-full h-full border-2 border-gray-300 rounded-lg shadow-sm bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms"
                title="HTML Preview"
              />
            </div>
          </div>
        ) : (
          // Source view with syntax highlighting
          <div className="h-full overflow-auto">
            {highlightedHtml ? (
              <div
                className="h-full [&>pre]:h-full [&>pre]:m-0"
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            ) : (
              // Loading fallback
              <pre className="p-4 bg-gray-900 text-gray-100 overflow-auto h-full m-0">
                <code className="text-sm font-mono whitespace-pre">{artifact.content}</code>
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
