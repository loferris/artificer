/**
 * Code artifact viewer with syntax highlighting
 */

import React, { useState, useEffect } from 'react';
import type { Artifact } from '../../../../lib/llm-artifacts/src/core/types';
import { highlightCode } from '../../../utils/shiki';

interface ArtifactCodeViewerProps {
  artifact: Artifact;
  onEdit?: (content: string) => void;
  readOnly?: boolean;
}

export const ArtifactCodeViewer: React.FC<ArtifactCodeViewerProps> = ({
  artifact,
  onEdit,
  readOnly = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(artifact.content);
  const [highlightedHtml, setHighlightedHtml] = useState('');

  // Highlight code on mount or when content/language changes
  useEffect(() => {
    if (!isEditing && artifact.content) {
      highlightCode(
        artifact.content,
        artifact.language || 'text'
      )
        .then(setHighlightedHtml)
        .catch(err => {
          console.error('Error highlighting artifact code:', err);
          // Fallback will be handled in render
        });
    }
  }, [artifact.content, artifact.language, isEditing]);

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
    a.download = artifact.filename || `${artifact.title || 'artifact'}.${artifact.fileExtension || 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-mono text-gray-600">
            {artifact.language || 'text'}
          </span>
          {artifact.filename && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-700">{artifact.filename}</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
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

      {/* Code Content */}
      <div className="flex-1 overflow-auto">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-gray-100 resize-none focus:outline-none"
            spellCheck={false}
          />
        ) : highlightedHtml ? (
          <div
            className="h-full overflow-auto [&>pre]:h-full [&>pre]:m-0"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          // Loading fallback while Shiki is highlighting
          <pre className="p-4 bg-gray-900 text-gray-100 overflow-auto h-full m-0">
            <code className="text-sm font-mono whitespace-pre">{artifact.content}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
