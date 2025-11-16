/**
 * Markdown artifact viewer with rendered preview
 */

import React, { useState } from 'react';
import type { Artifact } from '../../../../lib/llm-artifacts/src/core/types';

interface ArtifactMarkdownViewerProps {
  artifact: Artifact;
  onEdit?: (content: string) => void;
  readOnly?: boolean;
}

export const ArtifactMarkdownViewer: React.FC<ArtifactMarkdownViewerProps> = ({
  artifact,
  onEdit,
  readOnly = false,
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(artifact.content);

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

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.filename || `${artifact.title || 'document'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Simple markdown rendering (basic support)
  const renderMarkdown = (markdown: string) => {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>');

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded my-2 overflow-x-auto"><code class="text-sm font-mono">$2</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>');

    // Paragraphs
    html = html.split('\n\n').map(para => {
      if (para.trim() && !para.match(/^<(h[123]|pre|li)/)) {
        return `<p class="mb-3">${para}</p>`;
      }
      return para;
    }).join('\n');

    return html;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">Markdown</span>
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
            onClick={handleDownload}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
          >
            Download
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-white">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
          />
        ) : viewMode === 'preview' ? (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(artifact.content) }}
          />
        ) : (
          <pre className="p-4 bg-gray-50 rounded overflow-auto">
            <code className="text-sm font-mono whitespace-pre">{artifact.content}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
